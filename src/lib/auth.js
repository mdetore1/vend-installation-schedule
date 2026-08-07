// Real authentication via Supabase Auth + row-level security — replaces the
// old localStorage-only login. New sign-ups land in "pending" (zero data
// access, enforced by the database's RLS policies, not just the UI) until
// an admin promotes them to viewer or admin from Manage Users.
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = still checking, null = signed out
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting derived state when the source (session) goes away, not a data fetch
      setProfile(null);
      return;
    }
    let cancelled = false;
    function load() {
      supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (!cancelled) setProfile(data ?? null);
        });
    }
    load();
    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${session.user.id}` }, load)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Full roster for Manage Users — RLS only returns rows once this account
  // itself is approved (a pending user just sees their own row via a
  // separate policy branch), so this quietly stays empty until then.
  useEffect(() => {
    if (!profile || profile.role === "pending") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting derived state, not a data fetch
      setUsers(profile ? [profile] : []);
      return;
    }
    let cancelled = false;
    function load() {
      supabase
        .from("profiles")
        .select("*")
        .order("created_at")
        .then(({ data }) => {
          if (!cancelled) setUsers(data ?? []);
        });
    }
    load();
    const channel = supabase
      .channel("profiles-roster")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email.split("@")[0] } },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.session) return { ok: true, needsConfirmation: true };
    return { ok: true };
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function updateUserRole(id, role) {
    await supabase.from("profiles").update({ role }).eq("id", id);
  }

  // There's no client-safe way to delete an auth account (that needs the
  // service_role key, which must never reach the browser) — revoking access
  // by demoting back to "pending" is the safe equivalent.
  async function revokeAccess(id) {
    await supabase.from("profiles").update({ role: "pending" }).eq("id", id);
  }

  return {
    loading: session === undefined || (session && profile === null),
    session,
    profile,
    users,
    isAdmin: profile?.role === "admin",
    isPending: !!profile && profile.role === "pending",
    isApproved: profile?.role === "admin" || profile?.role === "viewer",
    signUp,
    login,
    logout,
    updateUserRole,
    revokeAccess,
  };
}
