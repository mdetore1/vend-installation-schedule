// Periodic HubSpot -> Sales Queue sync. Pulls every deal in the Sales
// Pipeline and upserts it into queue_items, keyed on hubspot_deal_id.
// Deploy via Supabase Dashboard -> Edge Functions -> New Function (name it
// "hubspot-sync") -> paste this file's contents -> Deploy.
//
// Requires TWO manually-added secrets (Edge Functions -> hubspot-sync ->
// Secrets) beyond the auto-injected SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY:
//   HUBSPOT_TOKEN — a HubSpot Private App token with crm.objects.deals.read,
//     crm.objects.owners.read, and crm.pipelines.read scopes. Add it
//     directly in the Supabase Dashboard; never paste it anywhere else.
// Scheduling: Edge Functions -> hubspot-sync -> Triggers -> add a Cron
// Trigger (e.g. every 30 minutes). Supabase's own Cron Trigger invokes the
// function with the project's service_role key as its bearer token, which
// is what the check below requires — no extra secret needed for that part.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SALES_PIPELINE_ID = "default";
const CLOSED_WON_STAGE_ID = "57147742";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DEAL_PROPERTIES = [
  "dealname",
  "dealstage",
  "pipeline",
  "amount",
  "contract_signed_date",
  "access_type",
  "garage_type",
  "number_of_parking_spaces",
  "property_type",
  "parking_operator",
  "of_lanes",
  "do_we_need_staff_",
  "hubspot_owner_id",
];

// "Only match specific words" — a rep typing "No" or "N/A" should not flip
// the flag on; a real answer has a headcount, FT/PT, or an explicit "yes".
function parseOnsiteStaff(text) {
  if (!text) return false;
  return /\byes\b/i.test(text) || /\bft\b|\bpt\b/i.test(text) || /\d/.test(text);
}

// Retries on HubSpot's 429 (rate limit), backing off per its own Retry-After
// header when given — needed even at moderate request volume since this
// runs every 30 minutes and the deal/owner lists are paginated.
async function hubspotFetch(path, token, init, attempt = 0) {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (res.status === 429 && attempt < 5) {
    const waitSeconds = Number(res.headers.get("Retry-After")) || attempt + 1;
    await new Promise((r) => setTimeout(r, waitSeconds * 1000));
    return hubspotFetch(path, token, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`HubSpot ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Active (non-archived) stages for the Sales Pipeline, id -> label — fetched
// live each run instead of hardcoded, so a stage HubSpot marks deprecated
// drops out on its own without a code change here.
async function fetchStageLabels(token) {
  const data = await hubspotFetch(`/crm/v3/pipelines/deals/${SALES_PIPELINE_ID}`, token);
  const map = {};
  for (const stage of data.stages || []) map[stage.id] = stage.label;
  return map;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Deal owner (HubSpot's own "Deal owner" field, not a separate rep property
// — there isn't one) id -> full name, so the queue's Sales rep field fills
// in automatically instead of needing to be typed by hand.
async function fetchOwnerNames(token) {
  const map = {};
  let after;
  do {
    const qs = new URLSearchParams({ limit: "500", ...(after ? { after } : {}) });
    const page = await hubspotFetch(`/crm/v3/owners?${qs}`, token);
    for (const owner of page.results || []) {
      const name = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim() || owner.email;
      if (name) map[owner.id] = name;
    }
    after = page.paging?.next?.after;
    if (after) await sleep(300);
  } while (after);
  return map;
}

async function fetchAllSalesDeals(token) {
  const deals = [];
  let after;
  do {
    const body = {
      filterGroups: [{ filters: [{ propertyName: "pipeline", operator: "EQ", value: SALES_PIPELINE_ID }] }],
      properties: DEAL_PROPERTIES,
      limit: 100,
      ...(after ? { after } : {}),
    };
    const page = await hubspotFetch("/crm/v3/objects/deals/search", token, {
      method: "POST",
      body: JSON.stringify(body),
    });
    deals.push(...(page.results || []));
    after = page.paging?.next?.after;
    if (after) await sleep(300);
  } while (after);
  return deals;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const hubspotToken = Deno.env.get("HUBSPOT_TOKEN");

    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.replace("Bearer ", "") !== serviceRoleKey) {
      return json({ error: "Not authorized" }, 401);
    }
    if (!hubspotToken) return json({ error: "HUBSPOT_TOKEN secret not set" }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Sequential, not parallel — HubSpot's per-second rate limit is easy to
    // trip when the stage, owner, and deal-search calls all fire at once.
    const stageLabels = await fetchStageLabels(hubspotToken);
    const ownerNames = await fetchOwnerNames(hubspotToken);
    const deals = await fetchAllSalesDeals(hubspotToken);
    const [{ data: promotedLocations }, { data: existingReps }] = await Promise.all([
      admin.from("locations").select("hubspot_deal_id").not("hubspot_deal_id", "is", null),
      admin.from("sales_reps").select("name"),
    ]);
    const promotedIds = new Set((promotedLocations || []).map((l) => l.hubspot_deal_id));
    const existingRepNames = new Set((existingReps || []).map((r) => r.name.toLowerCase()));

    let synced = 0;
    let skippedPromoted = 0;
    const errors = [];
    const newReps = new Set();

    for (const deal of deals) {
      if (promotedIds.has(deal.id)) {
        skippedPromoted++;
        continue;
      }
      const p = deal.properties || {};
      const stageLabel = stageLabels[p.dealstage] || p.dealstage || null;
      const salesRep = ownerNames[p.hubspot_owner_id] || null;
      if (salesRep && !existingRepNames.has(salesRep.toLowerCase())) newReps.add(salesRep);

      const row = {
        hubspot_deal_id: deal.id,
        hubspot_stage: stageLabel,
        name: p.dealname || "(unnamed deal)",
        contract_state: stageLabel === "Closed Won" || p.dealstage === CLOSED_WON_STAGE_ID ? "Closed Won" : "In Progress",
        access_type: p.access_type || null,
        lanes: p.of_lanes ? Number(p.of_lanes) : null,
        has_onsite_staff: parseOnsiteStaff(p.do_we_need_staff_),
        sales_rep: salesRep,
        garage_type: p.garage_type || null,
        number_of_parking_spaces: p.number_of_parking_spaces ? Number(p.number_of_parking_spaces) : null,
        property_type: p.property_type || null,
        incumbent_operator: p.parking_operator || null,
        deal_amount: p.amount ? Number(p.amount) : null,
        contract_signed_date: p.contract_signed_date ? p.contract_signed_date.slice(0, 10) : null,
      };

      const { error } = await admin.from("queue_items").upsert(row, { onConflict: "hubspot_deal_id" });
      if (error) errors.push({ dealId: deal.id, message: error.message });
      else synced++;
    }

    if (newReps.size) {
      await admin.from("sales_reps").insert([...newReps].map((name) => ({ name })));
    }

    return json({ ok: true, totalDeals: deals.length, synced, skippedPromoted, newReps: [...newReps], errors });
  } catch (err) {
    return json({ error: err.message }, 400);
  }
});
