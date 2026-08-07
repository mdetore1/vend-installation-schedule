// Shared-database version of the Installation Schedule's data layer.
// Replaces the old useLocalStorage(STORAGE_KEY, ...) — every mutator here
// writes to Supabase instead of a single per-browser blob, and a realtime
// subscription refetches whenever ANY connected client changes the data,
// so everyone's screen reflects the same shared schedule live.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { cascadeDates, nextColor, initialsOf, UNASSIGNED } from "./dateUtils";

function phaseToRow(p) {
  return {
    label: p.label,
    owner_id: !p.ownerId || p.ownerId === UNASSIGNED ? null : p.ownerId,
    start_date: p.start,
    end_date: p.end,
    confirmed: !!p.confirmed,
    done: !!p.done,
    conflict_acknowledged: !!p.conflictAcknowledged,
  };
}

function locationToRow(l) {
  return {
    name: l.name,
    place: l.place || "",
    lanes: l.lanes ?? null,
    access_type: l.accessType ?? null,
    sales_rep: l.salesRep ?? null,
    property_management: l.propertyManagement ?? null,
    ownership: l.ownership ?? null,
  };
}

export function useScheduleStore() {
  const [teamRows, setTeamRows] = useState([]);
  const [timeOffRows, setTimeOffRows] = useState([]);
  const [locationRows, setLocationRows] = useState([]);
  const [phaseRows, setPhaseRows] = useState([]);
  const [queueRows, setQueueRows] = useState([]);
  const [salesRepRows, setSalesRepRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refetchAll = useCallback(async () => {
    const [team, timeOff, locations, phases, queue, salesReps] = await Promise.all([
      supabase.from("team_members").select("*").order("created_at"),
      supabase.from("time_off").select("*"),
      supabase.from("locations").select("*").order("created_at"),
      supabase.from("phases").select("*"),
      supabase.from("queue_items").select("*").order("created_at"),
      supabase.from("sales_reps").select("*").order("name"),
    ]);
    setTeamRows(team.data ?? []);
    setTimeOffRows(timeOff.data ?? []);
    setLocationRows(locations.data ?? []);
    setPhaseRows(phases.data ?? []);
    setQueueRows(queue.data ?? []);
    setSalesRepRows(salesReps.data ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount; no framework-level loader in this app
    refetchAll();
    const channel = supabase
      .channel("schedule-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, refetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_off" }, refetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, refetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "phases" }, refetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_items" }, refetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_reps" }, refetchAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refetchAll]);

  const data = useMemo(() => {
    const team = teamRows.map((t) => ({
      id: t.id,
      name: t.name,
      initials: t.initials,
      color: { bg: t.color_bg, text: t.color_text },
      timeOff: timeOffRows
        .filter((o) => o.team_member_id === t.id)
        .map((o) => ({ id: o.id, start: o.start_date, end: o.end_date })),
    }));
    const locations = locationRows.map((l) => ({
      id: l.id,
      name: l.name,
      place: l.place || "",
      archived: l.archived,
      lanes: l.lanes,
      accessType: l.access_type,
      salesRep: l.sales_rep,
      propertyManagement: l.property_management,
      ownership: l.ownership,
      phases: phaseRows
        .filter((p) => p.location_id === l.id)
        .map((p) => ({
          id: p.id,
          label: p.label,
          ownerId: p.owner_id || UNASSIGNED,
          start: p.start_date,
          end: p.end_date,
          confirmed: p.confirmed,
          done: p.done,
          conflictAcknowledged: p.conflict_acknowledged,
        })),
    }));
    const queue = queueRows.map((q) => ({
      id: q.id,
      name: q.name,
      place: q.place || "",
      lanes: q.lanes,
      accessType: q.access_type,
      contractState: q.contract_state,
      potentialGoLiveDate: q.potential_go_live_date,
      salesRep: q.sales_rep,
      propertyManagement: q.property_management,
      ownership: q.ownership,
    }));
    const salesReps = salesRepRows.map((r) => r.name);
    return { team, locations, queue, salesReps };
  }, [teamRows, timeOffRows, locationRows, phaseRows, queueRows, salesRepRows]);

  // Reconciles a submitted phases array (from a bulk edit modal — a mix of
  // existing DB rows and freshly-typed new ones) against what's actually in
  // the database for that location: update matches, insert new ones, delete
  // anything no longer present.
  async function syncLocationPhases(locationId, submittedPhases) {
    const existingIds = new Set(phaseRows.filter((p) => p.location_id === locationId).map((p) => p.id));
    const toDelete = [...existingIds].filter((id) => !submittedPhases.some((p) => p.id === id));
    const toUpdate = submittedPhases.filter((p) => existingIds.has(p.id));
    const toInsert = submittedPhases.filter((p) => !existingIds.has(p.id));
    await Promise.all([
      toDelete.length ? supabase.from("phases").delete().in("id", toDelete) : null,
      ...toUpdate.map((p) => supabase.from("phases").update(phaseToRow(p)).eq("id", p.id)),
      toInsert.length
        ? supabase.from("phases").insert(toInsert.map((p) => ({ ...phaseToRow(p), location_id: locationId })))
        : null,
    ]);
  }

  // ---- team ----
  async function addTeammate(name) {
    const color = nextColor(teamRows);
    await supabase.from("team_members").insert({ name, initials: initialsOf(name), color_bg: color.bg, color_text: color.text });
  }
  async function updateTeammate(id, patch) {
    const row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.initials !== undefined) row.initials = patch.initials;
    if (patch.color !== undefined) {
      row.color_bg = patch.color.bg;
      row.color_text = patch.color.text;
    }
    await supabase.from("team_members").update(row).eq("id", id);
  }
  async function removeTeammate(id) {
    await supabase.from("team_members").delete().eq("id", id);
  }
  // Manual drag-reorder isn't persisted yet (no ordering column) — the
  // roster always reflects creation order until that's added.
  function reorderTeam() {}

  async function addTimeOff(memberId, range) {
    await supabase.from("time_off").insert({ team_member_id: memberId, start_date: range.start, end_date: range.end });
  }
  async function updateTimeOff(memberId, timeOffId, patch) {
    const row = {};
    if (patch.start !== undefined) row.start_date = patch.start;
    if (patch.end !== undefined) row.end_date = patch.end;
    await supabase.from("time_off").update(row).eq("id", timeOffId);
  }
  async function removeTimeOff(memberId, timeOffId) {
    await supabase.from("time_off").delete().eq("id", timeOffId);
  }

  // ---- locations + phases ----
  async function addLocation(loc) {
    const { data: inserted, error } = await supabase
      .from("locations")
      .insert({ ...locationToRow(loc), archived: false })
      .select()
      .single();
    if (error || !inserted) return;
    if (loc.phases?.length) {
      await supabase.from("phases").insert(loc.phases.map((p) => ({ ...phaseToRow(p), location_id: inserted.id })));
    }
  }

  async function updatePhase(locId, phaseId, patch) {
    const loc = data.locations.find((l) => l.id === locId);
    if (!loc) return;
    const patched = loc.phases.map((p) => (p.id !== phaseId ? p : { ...p, ...patch }));
    const finalPhases = "end" in patch ? cascadeDates(patched, phaseId) : patched;
    const changed = finalPhases.filter((p) => {
      const before = loc.phases.find((x) => x.id === p.id);
      return before && JSON.stringify(before) !== JSON.stringify(p);
    });
    await Promise.all(changed.map((p) => supabase.from("phases").update(phaseToRow(p)).eq("id", p.id)));
  }

  async function shiftPhasesByIds(phaseIds, deltaDays) {
    const idSet = new Set(phaseIds);
    const all = data.locations.flatMap((l) => l.phases).filter((p) => idSet.has(p.id));
    await Promise.all(
      all.map((p) => {
        const start = new Date(p.start);
        start.setDate(start.getDate() + deltaDays);
        const end = new Date(p.end);
        end.setDate(end.getDate() + deltaDays);
        const iso = (d) => d.toISOString().slice(0, 10);
        return supabase.from("phases").update({ start_date: iso(start), end_date: iso(end) }).eq("id", p.id);
      })
    );
  }

  async function deletePhase(locId, phaseId) {
    await supabase.from("phases").delete().eq("id", phaseId);
  }

  async function setArchived(locId, archived) {
    await supabase.from("locations").update({ archived }).eq("id", locId);
    if (archived) {
      await supabase.from("phases").update({ done: true }).eq("location_id", locId);
    }
  }

  async function updateLocation(locId, patch) {
    const { phases, ...rest } = patch;
    if (Object.keys(rest).length) {
      await supabase.from("locations").update(locationToRow({ ...data.locations.find((l) => l.id === locId), ...rest })).eq("id", locId);
    }
    if (phases) {
      await syncLocationPhases(locId, phases);
    }
  }

  async function deleteLocation(locId) {
    await supabase.from("locations").delete().eq("id", locId);
  }

  // ---- sales queue ----
  async function addQueueItem(item) {
    await supabase.from("queue_items").insert({
      name: item.name,
      place: item.place || "",
      lanes: item.lanes ?? null,
      access_type: item.accessType ?? null,
      contract_state: item.contractState || "In Progress",
      potential_go_live_date: item.potentialGoLiveDate || null,
      sales_rep: item.salesRep ?? null,
      property_management: item.propertyManagement ?? null,
      ownership: item.ownership ?? null,
    });
  }
  async function addSalesRep(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (salesRepRows.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) return;
    await supabase.from("sales_reps").insert({ name: trimmed });
  }
  async function updateQueueItem(id, patch) {
    const row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.place !== undefined) row.place = patch.place;
    if (patch.lanes !== undefined) row.lanes = patch.lanes;
    if (patch.accessType !== undefined) row.access_type = patch.accessType;
    if (patch.contractState !== undefined) row.contract_state = patch.contractState;
    if (patch.potentialGoLiveDate !== undefined) row.potential_go_live_date = patch.potentialGoLiveDate || null;
    if (patch.salesRep !== undefined) row.sales_rep = patch.salesRep;
    if (patch.propertyManagement !== undefined) row.property_management = patch.propertyManagement;
    if (patch.ownership !== undefined) row.ownership = patch.ownership;
    await supabase.from("queue_items").update(row).eq("id", id);
  }
  async function removeQueueItem(id) {
    await supabase.from("queue_items").delete().eq("id", id);
  }

  async function promoteQueueItem(queueItem, { name, place, phases }) {
    const { data: inserted, error } = await supabase
      .from("locations")
      .insert({
        name,
        place,
        archived: false,
        lanes: queueItem.lanes ?? null,
        access_type: queueItem.accessType ?? null,
        sales_rep: queueItem.salesRep ?? null,
        property_management: queueItem.propertyManagement ?? null,
        ownership: queueItem.ownership ?? null,
      })
      .select()
      .single();
    if (error || !inserted) return;
    if (phases?.length) {
      await supabase.from("phases").insert(phases.map((p) => ({ ...phaseToRow(p), location_id: inserted.id })));
    }
    await supabase.from("queue_items").delete().eq("id", queueItem.id);
  }

  return {
    data,
    loaded,
    addTeammate,
    updateTeammate,
    removeTeammate,
    reorderTeam,
    addTimeOff,
    updateTimeOff,
    removeTimeOff,
    addLocation,
    updatePhase,
    shiftPhasesByIds,
    deletePhase,
    setArchived,
    updateLocation,
    deleteLocation,
    addQueueItem,
    addSalesRep,
    updateQueueItem,
    removeQueueItem,
    promoteQueueItem,
  };
}
