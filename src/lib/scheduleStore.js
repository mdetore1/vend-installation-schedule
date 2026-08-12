// Shared-database version of the Installation Schedule's data layer.
// Replaces the old useLocalStorage(STORAGE_KEY, ...) — every mutator here
// writes to Supabase instead of a single per-browser blob, and a realtime
// subscription refetches whenever ANY connected client changes the data,
// so everyone's screen reflects the same shared schedule live.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { nextColor, initialsOf, UNASSIGNED, earliestScheduleDate } from "./dateUtils";

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
    contractor: l.contractor || "Task Force",
  };
}

export function useScheduleStore() {
  const [teamRows, setTeamRows] = useState([]);
  const [timeOffRows, setTimeOffRows] = useState([]);
  const [locationRows, setLocationRows] = useState([]);
  const [phaseRows, setPhaseRows] = useState([]);
  const [queueRows, setQueueRows] = useState([]);
  const [salesRepRows, setSalesRepRows] = useState([]);
  const [companyEventRows, setCompanyEventRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refetchAll = useCallback(async () => {
    const [team, timeOff, locations, phases, queue, salesReps, companyEvents] = await Promise.all([
      supabase.from("team_members").select("*").order("sort_order"),
      supabase.from("time_off").select("*"),
      supabase.from("locations").select("*").order("sort_order"),
      supabase.from("phases").select("*"),
      supabase.from("queue_items").select("*").order("created_at"),
      supabase.from("sales_reps").select("*").order("name"),
      supabase.from("company_events").select("*").order("start_date"),
    ]);
    setTeamRows(team.data ?? []);
    setTimeOffRows(timeOff.data ?? []);
    setLocationRows(locations.data ?? []);
    setPhaseRows(phases.data ?? []);
    setQueueRows(queue.data ?? []);
    setSalesRepRows(salesReps.data ?? []);
    setCompanyEventRows(companyEvents.data ?? []);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "company_events" }, refetchAll)
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
        .map((o) => ({ id: o.id, start: o.start_date, end: o.end_date, reason: o.reason || "" })),
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
      contractor: l.contractor || "Task Force",
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
    const companyEvents = companyEventRows.map((e) => ({ id: e.id, name: e.name, start: e.start_date, end: e.end_date }));
    return { team, locations, queue, salesReps, companyEvents };
  }, [teamRows, timeOffRows, locationRows, phaseRows, queueRows, salesRepRows, companyEventRows]);

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
    const nextOrder = teamRows.reduce((max, t) => Math.max(max, t.sort_order ?? 0), -1) + 1;
    await supabase
      .from("team_members")
      .insert({ name, initials: initialsOf(name), color_bg: color.bg, color_text: color.text, sort_order: nextOrder });
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
  // Re-inserts a removed teammate with their original id, so an undo lands
  // back in the same identity (any historical phases still owned by them
  // stay correctly linked) rather than becoming a new person.
  async function restoreTeammate(member) {
    await supabase.from("team_members").insert({
      id: member.id,
      name: member.name,
      initials: member.initials,
      color_bg: member.color.bg,
      color_text: member.color.text,
    });
    if (member.timeOff?.length) {
      await supabase
        .from("time_off")
        .insert(member.timeOff.map((t) => ({ id: t.id, team_member_id: member.id, start_date: t.start, end_date: t.end })));
    }
  }
  // framer-motion's Reorder.Group hands back the full array in its new
  // order — persist that as each row's position so it survives a refetch.
  async function reorderTeam(newTeam) {
    await Promise.all(newTeam.map((t, i) => supabase.from("team_members").update({ sort_order: i }).eq("id", t.id)));
  }

  async function addTimeOff(memberId, range) {
    await supabase.from("time_off").insert({
      team_member_id: memberId,
      start_date: range.start,
      end_date: range.end,
      reason: range.reason || null,
    });
  }
  async function updateTimeOff(memberId, timeOffId, patch) {
    const row = {};
    if (patch.start !== undefined) row.start_date = patch.start;
    if (patch.end !== undefined) row.end_date = patch.end;
    if (patch.reason !== undefined) row.reason = patch.reason || null;
    await supabase.from("time_off").update(row).eq("id", timeOffId);
  }
  async function removeTimeOff(memberId, timeOffId) {
    await supabase.from("time_off").delete().eq("id", timeOffId);
  }

  // ---- company-wide events/holidays (not tied to any one teammate) ----
  async function addCompanyEvent(name, range) {
    await supabase.from("company_events").insert({ name, start_date: range.start, end_date: range.end });
  }
  async function updateCompanyEvent(id, patch) {
    const row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.start !== undefined) row.start_date = patch.start;
    if (patch.end !== undefined) row.end_date = patch.end;
    await supabase.from("company_events").update(row).eq("id", id);
  }
  async function removeCompanyEvent(id) {
    await supabase.from("company_events").delete().eq("id", id);
  }

  // ---- locations + phases ----
  // New locations slot themselves in chronologically among the current
  // active order (by their earliest Install/Go-Live date) rather than
  // always landing at the end — that keeps the "soonest first" default
  // useful even after someone's manually dragged the rest into a custom
  // order, instead of re-sorting everything by date on every add.
  async function addLocation(loc) {
    const activeLocs = data.locations.filter((l) => !l.archived);
    const newDate = earliestScheduleDate(loc.phases || []);
    let insertAt = activeLocs.length;
    for (let i = 0; i < activeLocs.length; i++) {
      const d = earliestScheduleDate(activeLocs[i].phases);
      if (newDate && (!d || newDate < d)) {
        insertAt = i;
        break;
      }
    }
    const { data: inserted, error } = await supabase
      .from("locations")
      .insert({ ...locationToRow(loc), archived: false, sort_order: insertAt })
      .select()
      .single();
    if (error || !inserted) return;
    if (loc.phases?.length) {
      await supabase.from("phases").insert(loc.phases.map((p) => ({ ...phaseToRow(p), location_id: inserted.id })));
    }
    // Make room by shifting everything from the insertion point down one slot.
    const toShift = activeLocs.slice(insertAt);
    await Promise.all(
      toShift.map((l, i) => supabase.from("locations").update({ sort_order: insertAt + i + 1 }).eq("id", l.id))
    );
  }

  // framer-motion's Reorder.Group hands back the full active-locations array
  // in its new order — persist that as each row's position so a manual drag
  // sticks instead of snapping back to date order on the next refetch.
  async function reorderLocations(newLocations) {
    await Promise.all(newLocations.map((l, i) => supabase.from("locations").update({ sort_order: i }).eq("id", l.id)));
  }

  // Only touches the one phase being changed — no auto-cascading sibling
  // phases here, since this is the mutator behind dragging/editing directly
  // on the calendar, where nudging one bar shouldn't silently reshuffle the
  // others in that location. Cascading still happens in AddLocationForm's
  // own local state, which is a deliberate "lay out the whole pipeline" tool.
  async function updatePhase(locId, phaseId, patch) {
    const loc = data.locations.find((l) => l.id === locId);
    const phase = loc?.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    await supabase
      .from("phases")
      .update(phaseToRow({ ...phase, ...patch }))
      .eq("id", phaseId);
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
  // Keeps the original id so anything else that referenced it (unlikely,
  // but cheap to preserve) still resolves correctly after an undo.
  async function restorePhase(locId, phase) {
    await supabase.from("phases").insert({ id: phase.id, location_id: locId, ...phaseToRow(phase) });
  }

  // Copies a phase onto a different location — a fresh row (new id), left
  // in the source location untouched. Resets done/conflict-acknowledged
  // since those are specific to the original site, not the new one.
  async function duplicatePhase(phase, targetLocationId) {
    await supabase
      .from("phases")
      .insert({ location_id: targetLocationId, ...phaseToRow({ ...phase, done: false, conflictAcknowledged: false }) });
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
  // Deleting a location cascades to its phases (FK), so restoring has to
  // re-insert both — same ids, so it lands back exactly as it was.
  async function restoreLocation(location) {
    await supabase.from("locations").insert({ id: location.id, ...locationToRow(location), archived: location.archived });
    if (location.phases?.length) {
      await supabase
        .from("phases")
        .insert(location.phases.map((p) => ({ id: p.id, location_id: location.id, ...phaseToRow(p) })));
    }
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

  async function promoteQueueItem(queueItem, { name, place, phases, contractor }) {
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
        contractor: contractor || "Task Force",
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
    restoreTeammate,
    reorderTeam,
    addTimeOff,
    updateTimeOff,
    removeTimeOff,
    addCompanyEvent,
    updateCompanyEvent,
    removeCompanyEvent,
    addLocation,
    reorderLocations,
    updatePhase,
    shiftPhasesByIds,
    deletePhase,
    restorePhase,
    duplicatePhase,
    setArchived,
    updateLocation,
    deleteLocation,
    restoreLocation,
    addQueueItem,
    addSalesRep,
    updateQueueItem,
    removeQueueItem,
    promoteQueueItem,
  };
}
