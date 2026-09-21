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
// Close Lost, Nurture (Closed, not lost) — deals here are done being
// "worked" with nothing left to do, so they're excluded from the queue
// entirely. Closed Won stays IN the sync on purpose: that's the stage that
// lights up "Add to calendar," and the item leaves the queue on its own once
// it's promoted from there.
const EXCLUDED_STAGE_IDS = ["57147743", "128934430"];

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
  "city",
  "state",
];

// "Only match specific words" — a rep typing "No" or "N/A" should not flip
// the flag on; a real answer has a headcount, FT/PT, or an explicit "yes".
function parseOnsiteStaff(text) {
  if (!text) return false;
  return /\byes\b/i.test(text) || /\bft\b|\bpt\b/i.test(text) || /\d/.test(text);
}

// Supabase kills an Edge Function after 150s idle — leave real margin under
// that so a rate-limit-heavy run always returns a normal response instead of
// getting silently killed with nothing to show for it.
const TIME_BUDGET_MS = 100_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class OutOfTimeBudget extends Error {}

// 20s hard cap on each individual network call — without this, a call that
// just hangs (dropped connection, HubSpot stalling instead of erroring)
// never hits the 429 branch below at all, sails past the time-budget check
// entirely, and runs until Supabase's own platform kills the whole function
// at 150s with no useful response.
const REQUEST_TIMEOUT_MS = 20_000;

// Retries on HubSpot's 429 (rate limit) or a timed-out request, backing off
// per its own Retry-After header when given. Bails out (rather than waiting
// into a wall it can't meet) once a wait would blow the time budget, so the
// caller can stop cleanly instead of the whole function getting killed
// mid-request.
async function hubspotFetch(path, token, deadlineAt, init, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`https://api.hubapi.com${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name !== "AbortError") throw err;
    if (attempt >= 5 || Date.now() + 1000 >= deadlineAt) throw new OutOfTimeBudget(`${path}: request timed out`);
    return hubspotFetch(path, token, deadlineAt, init, attempt + 1);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429 && attempt < 5) {
    const waitMs = (Number(res.headers.get("Retry-After")) || attempt + 1) * 1000;
    if (Date.now() + waitMs >= deadlineAt) throw new OutOfTimeBudget(`${path}: rate-limited, out of time budget`);
    await sleep(waitMs);
    return hubspotFetch(path, token, deadlineAt, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`HubSpot ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Active (non-archived) stages for the Sales Pipeline, id -> label — fetched
// live each run instead of hardcoded, so a stage HubSpot marks deprecated
// drops out on its own without a code change here.
async function fetchStageLabels(token, deadlineAt) {
  const data = await hubspotFetch(`/crm/v3/pipelines/deals/${SALES_PIPELINE_ID}`, token, deadlineAt);
  const map = {};
  for (const stage of data.stages || []) map[stage.id] = stage.label;
  return map;
}

// Deal owner (HubSpot's own "Deal owner" field, not a separate rep property
// — there isn't one) id -> full name, so the queue's Sales rep field fills
// in automatically instead of needing to be typed by hand. Stops and returns
// what it has (truncated: true) if it runs into the time budget mid-page —
// the next scheduled run picks up the rest.
async function fetchOwnerNames(token, deadlineAt) {
  const map = {};
  let after;
  let truncated = false;
  try {
    do {
      const qs = new URLSearchParams({ limit: "500", ...(after ? { after } : {}) });
      const page = await hubspotFetch(`/crm/v3/owners?${qs}`, token, deadlineAt);
      for (const owner of page.results || []) {
        const name = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim() || owner.email;
        if (name) map[owner.id] = name;
      }
      after = page.paging?.next?.after;
      if (after) await sleep(500);
    } while (after);
  } catch (err) {
    if (!(err instanceof OutOfTimeBudget)) throw err;
    truncated = true;
  }
  return { map, truncated };
}

async function fetchAllSalesDeals(token, deadlineAt) {
  const deals = [];
  let after;
  let truncated = false;
  try {
    do {
      const body = {
        filterGroups: [
          {
            filters: [
              { propertyName: "pipeline", operator: "EQ", value: SALES_PIPELINE_ID },
              { propertyName: "dealstage", operator: "NOT_IN", values: EXCLUDED_STAGE_IDS },
            ],
          },
        ],
        properties: DEAL_PROPERTIES,
        limit: 100,
        ...(after ? { after } : {}),
      };
      const page = await hubspotFetch("/crm/v3/objects/deals/search", token, deadlineAt, {
        method: "POST",
        body: JSON.stringify(body),
      });
      deals.push(...(page.results || []));
      after = page.paging?.next?.after;
      if (after) await sleep(500);
    } while (after);
  } catch (err) {
    if (!(err instanceof OutOfTimeBudget)) throw err;
    truncated = true;
  }
  return { deals, truncated };
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
    const deadlineAt = Date.now() + TIME_BUDGET_MS;

    // Sequential, not parallel — HubSpot's per-second rate limit is easy to
    // trip when the stage, owner, and deal-search calls all fire at once.
    const stageLabels = await fetchStageLabels(hubspotToken, deadlineAt);
    const { map: ownerNames, truncated: ownersTruncated } = await fetchOwnerNames(hubspotToken, deadlineAt);
    const { deals, truncated: dealsTruncated } = await fetchAllSalesDeals(hubspotToken, deadlineAt);
    const [{ data: allLocations }, { data: existingReps }, { data: existingQueueRows }] = await Promise.all([
      admin.from("locations").select("id, name, hubspot_deal_id"),
      admin.from("sales_reps").select("name"),
      admin.from("queue_items").select("hubspot_deal_id").not("hubspot_deal_id", "is", null),
    ]);
    const promotedIds = new Set(
      (allLocations || []).filter((l) => l.hubspot_deal_id).map((l) => l.hubspot_deal_id)
    );
    // A deal already sitting at Closed Won the first time we ever see it
    // should never become a fresh queue item — Closed Won should only ever
    // be something an already-tracked item transitions INTO, never the
    // starting state of a brand new one.
    const existingQueueDealIds = new Set((existingQueueRows || []).map((r) => r.hubspot_deal_id));
    // Locations onboarded before this sync existed were never stamped with a
    // hubspot_deal_id, so a name match is the only way to recognize "this
    // deal is already a completed location" and stop it from reappearing in
    // the queue every run. Once matched, the id gets backfilled so future
    // syncs recognize it directly without needing the name match again.
    const locationsByName = new Map(
      (allLocations || []).filter((l) => !l.hubspot_deal_id).map((l) => [l.name.trim().toLowerCase(), l])
    );
    const existingRepNames = new Set((existingReps || []).map((r) => r.name.toLowerCase()));

    let skipped = 0;
    const errors = [];
    const newReps = new Set();
    const rowsToUpsert = [];
    // {locationId, dealId} pairs to backfill, and deal ids whose stray queue
    // item (from before the match existed) needs clearing — batched into one
    // call each after the loop instead of two awaits per matched deal, same
    // reasoning as batching the main upsert below.
    const locationMatches = [];

    for (const deal of deals) {
      if (promotedIds.has(deal.id)) {
        skipped++;
        continue;
      }
      const p = deal.properties || {};
      const matchingLocation = p.dealname ? locationsByName.get(p.dealname.trim().toLowerCase()) : null;
      if (matchingLocation) {
        locationMatches.push({ locationId: matchingLocation.id, dealId: deal.id });
        skipped++;
        continue;
      }
      const stageLabel = stageLabels[p.dealstage] || p.dealstage || null;
      const isClosedWon = stageLabel === "Closed Won" || p.dealstage === CLOSED_WON_STAGE_ID;
      if (isClosedWon && !existingQueueDealIds.has(deal.id)) {
        skipped++;
        continue;
      }
      const salesRep = ownerNames[p.hubspot_owner_id] || null;
      if (salesRep && !existingRepNames.has(salesRep.toLowerCase())) newReps.add(salesRep);

      rowsToUpsert.push({
        isNew: !existingQueueDealIds.has(deal.id),
        hubspot_deal_id: deal.id,
        hubspot_stage: stageLabel,
        name: p.dealname || "(unnamed deal)",
        place: [p.city, p.state].filter(Boolean).join(", ") || null,
        contract_state: isClosedWon ? "Closed Won" : "In Progress",
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
      });
    }

    // Split so a rename you make in the app sticks: a brand-new item still
    // gets its name from HubSpot, but once it's in the queue the sync never
    // touches that column again — everything else keeps updating normally.
    // (Two separate calls because a bulk upsert needs every row to share
    // the same columns; mixing "has name" and "no name" rows in one call
    // would null out the omitted column for whichever rows lack it.)
    let synced = 0;
    const newRows = rowsToUpsert.filter((r) => r.isNew).map(({ isNew, ...r }) => r);
    const existingRows = rowsToUpsert.filter((r) => !r.isNew).map(({ isNew, name, ...r }) => r);
    for (const batch of [newRows, existingRows]) {
      if (!batch.length) continue;
      const { error } = await admin.from("queue_items").upsert(batch, { onConflict: "hubspot_deal_id" });
      if (error) errors.push({ message: error.message });
      else synced += batch.length;
    }

    if (locationMatches.length) {
      await Promise.all(
        locationMatches.map((m) =>
          admin.from("locations").update({ hubspot_deal_id: m.dealId }).eq("id", m.locationId)
        )
      );
      // It may already be sitting in the queue from a run before the match
      // existed — clear it out now rather than waiting on the staleness
      // cleanup below, which won't catch it (the deal is still present in
      // this batch, just newly recognized as already handled).
      await admin
        .from("queue_items")
        .delete()
        .in("hubspot_deal_id", locationMatches.map((m) => m.dealId));
    }

    if (newReps.size) {
      await admin.from("sales_reps").insert([...newReps].map((name) => ({ name })));
    }

    // Remove queue items whose deal has since left the synced set (moved to
    // Close Lost/Nurture, or out of the Sales Pipeline entirely — Closed Won
    // deals stay in the synced set until promoted). Only safe to trust "not
    // in this batch means gone" when the fetch wasn't cut short by the time
    // budget AND actually returned something — an empty result is far more
    // likely a hiccup than "every deal just vanished."
    let removedStale = 0;
    if (!dealsTruncated && deals.length > 0) {
      const syncedDealIds = new Set(deals.map((d) => d.id));
      const { data: hubspotQueueItems } = await admin
        .from("queue_items")
        .select("id, hubspot_deal_id")
        .not("hubspot_deal_id", "is", null);
      const staleIds = (hubspotQueueItems || [])
        .filter((q) => !syncedDealIds.has(q.hubspot_deal_id))
        .map((q) => q.id);
      if (staleIds.length) {
        await admin.from("queue_items").delete().in("id", staleIds);
        removedStale = staleIds.length;
      }
    }

    return json({
      ok: true,
      totalDeals: deals.length,
      synced,
      skipped,
      removedStale,
      newReps: [...newReps],
      errors,
      ownersTruncated,
      dealsTruncated,
      note:
        ownersTruncated || dealsTruncated
          ? "Hit the time budget before finishing — ran out of retries on HubSpot's rate limit. Synced what it could; the next scheduled run will pick up more."
          : undefined,
    });
  } catch (err) {
    return json({ error: err.message }, 400);
  }
});
