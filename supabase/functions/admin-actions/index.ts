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

// Used when an admin sets someone up directly instead of emailing an invite
// (e.g. the project's transactional email is rate-limited) — random enough
// to be a real password, short enough to read aloud or paste into a message.
function generatePassword() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 14) + "!9";
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

    const { action, email, userId, displayName, password: requestedPassword } = await req.json();

    if (action === "invite") {
      if (!email) return json({ error: "email required" }, 400);
      const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE_URL });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // Bypasses email entirely — creates the account with a generated
    // password the admin hands over directly (Slack, in person, etc.).
    if (action === "create") {
      if (!email) return json({ error: "email required" }, 400);
      const password = generatePassword();
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName || email.split("@")[0] },
      });
      if (error) return json({ error: error.message }, 400);
      // Logins created directly by an admin are already vetted — skip the
      // pending-approval step self-signups still land in.
      await admin.from("profiles").update({ role: "viewer" }).eq("id", created.user.id);
      return json({ ok: true, password });
    }

    // Sets a password for an existing account — either one the admin typed
    // themselves or, if left blank, a generated one — for when an admin
    // needs to hand someone new credentials directly (forgotten password,
    // no working email, etc.) rather than the recovery-email flow.
    if (action === "reset-password") {
      if (!userId) return json({ error: "userId required" }, 400);
      if (requestedPassword && requestedPassword.length < 6) {
        return json({ error: "Password must be at least 6 characters" }, 400);
      }
      const password = requestedPassword || generatePassword();
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, password });
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
