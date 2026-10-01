// Live "last synced" status for a background sync job (currently just
// hubspot-sync), read from the sync_runs log table it writes to on every
// run. A tiny, read-only hook of its own rather than folded into
// scheduleStore.js — it has nothing to do with the schedule's own data and
// doesn't need to refetch 9 tables every time a sync logs a run.
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useSyncStatus(source) {
  const [lastRun, setLastRun] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      supabase
        .from("sync_runs")
        .select("*")
        .eq("source", source)
        .order("ran_at", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (!cancelled) setLastRun(data?.[0] ?? null);
        });
    }
    load();
    const channel = supabase
      .channel(`sync-status-${source}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sync_runs", filter: `source=eq.${source}` }, load)
      .subscribe();
    // Keeps "12m ago" advancing on its own between runs, rather than
    // freezing at whatever it said when the page first loaded.
    const interval = setInterval(() => load(), 60_000);
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [source]);

  return lastRun
    ? {
        ranAt: lastRun.ran_at,
        ok: lastRun.ok,
        totalDeals: lastRun.total_deals,
        synced: lastRun.synced,
        skipped: lastRun.skipped,
        removedStale: lastRun.removed_stale,
        errors: lastRun.errors || [],
      }
    : null;
}
