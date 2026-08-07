// Admin-only user management (invite by email, delete account) — the two
// actions that need the service_role key, which must never reach the
// browser. Deploy via Supabase Dashboard -> Edge Functions -> New Function
// (name it "admin-actions") -> paste this file's contents -> Deploy.
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically for every edge function in this project — no manual secret
// needed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://vend-installation-schedule.vercel.app";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Identify the caller from their own JWT (anon-key client, not admin).
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    // Privileged client — only ever used server-side, never sent to the browser.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (callerProfile?.role !== "admin") return json({ error: "Admins only" }, 403);

    const { action, email, userId } = await req.json();

    if (action === "invite") {
      if (!email) return json({ error: "email required" }, 400);
      const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE_URL });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      if (!userId) return json({ error: "userId required" }, 400);
      if (userId === user.id) return json({ error: "You can't delete your own account" }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err.message }, 400);
  }
});
