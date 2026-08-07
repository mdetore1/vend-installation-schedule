// Shared-database version of the Locations Map's data — live garages, the
// manually-added pins, and garage groupings all live in Supabase now
// instead of per-browser localStorage, with realtime sync like the
// schedule store.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

export function useMapStore() {
  const [liveGarageRows, setLiveGarageRows] = useState([]);
  const [pinRows, setPinRows] = useState([]);
  const [groupRows, setGroupRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refetchAll = useCallback(async () => {
    const [garages, pins, groups] = await Promise.all([
      supabase.from("live_garages").select("*").order("name"),
      supabase.from("map_pins").select("*").order("created_at"),
      supabase.from("map_groups").select("*"),
    ]);
    setLiveGarageRows(garages.data ?? []);
    setPinRows(pins.data ?? []);
    setGroupRows(groups.data ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount; no framework-level loader in this app
    refetchAll();
    const channel = supabase
      .channel("map-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_garages" }, refetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "map_pins" }, refetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "map_groups" }, refetchAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refetchAll]);

  const liveGarages = useMemo(
    () => liveGarageRows.map((g) => ({ name: g.name, mode: g.mode, street: g.street, city: g.city, state: g.state, lat: g.lat, lng: g.lng })),
    [liveGarageRows]
  );
  const mapPins = useMemo(
    () => pinRows.map((p) => ({ id: p.id, name: p.name, place: p.place || "", lat: p.lat, lng: p.lng, live: p.live })),
    [pinRows]
  );
  const groups = useMemo(
    () => groupRows.map((g) => ({ id: g.id, name: g.name, memberNames: g.member_names || [] })),
    [groupRows]
  );

  async function addPin({ name, place, lat, lng }) {
    await supabase.from("map_pins").insert({ name, place, lat, lng, live: false });
  }
  async function toggleLive(id) {
    const pin = pinRows.find((p) => p.id === id);
    if (!pin) return;
    await supabase.from("map_pins").update({ live: !pin.live }).eq("id", id);
  }
  async function removePin(id) {
    await supabase.from("map_pins").delete().eq("id", id);
  }
  async function createGroup({ name, memberNames }) {
    await supabase.from("map_groups").insert({ name, member_names: memberNames });
  }
  async function updateGroup(id, { name, memberNames }) {
    // Editing down to a single member leaves nothing to group — dissolve it
    // back to individual pins instead of keeping a group of one.
    if (memberNames.length < 2) {
      await supabase.from("map_groups").delete().eq("id", id);
      return;
    }
    await supabase.from("map_groups").update({ name, member_names: memberNames }).eq("id", id);
  }
  async function deleteGroup(id) {
    await supabase.from("map_groups").delete().eq("id", id);
  }

  return { liveGarages, mapPins, groups, loaded, addPin, toggleLive, removePin, createGroup, updateGroup, deleteGroup };
}
