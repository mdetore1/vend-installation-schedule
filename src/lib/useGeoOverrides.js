// Hand-placed map pins (see supabase/schema_geo_overrides.sql), keyed
// 'location:<id>' / 'queue:<id>'. A tiny hook of its own with its own
// realtime channel rather than folded into scheduleStore, so placing a pin
// never refetches the whole schedule.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

export function useGeoOverrides() {
  const [rows, setRows] = useState([]);

  const refetch = useCallback(async () => {
    const { data } = await supabase.from("geo_overrides").select("*");
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount; no framework-level loader in this app
    refetch();
    const channel = supabase
      .channel("geo-overrides")
      .on("postgres_changes", { event: "*", schema: "public", table: "geo_overrides" }, refetch)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refetch]);

  const overrides = useMemo(
    () =>
      new Map(
        rows.map((r) => [r.item_key, { lat: r.lat, lng: r.lng, address: r.address || "", needsConfirm: !!r.needs_confirm }])
      ),
    [rows]
  );

  // Returns the error (if any) so the placing dialog can say so — this
  // table needs its one-time SQL run before saves can work.
  async function saveOverride(key, { lat, lng, address, needsConfirm }) {
    const { error } = await supabase
      .from("geo_overrides")
      .upsert({ item_key: key, lat, lng, address, needs_confirm: needsConfirm }, { onConflict: "item_key" });
    return error;
  }
  async function confirmOverride(key) {
    await supabase.from("geo_overrides").update({ needs_confirm: false }).eq("item_key", key);
  }
  async function clearOverride(key) {
    await supabase.from("geo_overrides").delete().eq("item_key", key);
  }

  return { overrides, saveOverride, confirmOverride, clearOverride };
}
