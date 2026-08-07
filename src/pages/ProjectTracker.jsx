import { useEffect, useMemo, useState } from "react";
import { LayoutGroup } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useLocalStorage, newId } from "../lib/storage";
import {
  parseDate,
  toISO,
  addDays,
  startOfMonth,
  nextColor,
  initialsOf,
  cascadeDates,
  canonPhaseLabel,
  rangesOverlap,
  earliestScheduleDate,
  latestScheduleDate,
  UNASSIGNED,
} from "../lib/dateUtils";
import {
  STORAGE_KEY,
  initialData,
  buildAsanaImportLocations,
  ASANA_IMPORT_LOCATION_NAMES,
} from "../lib/projectData";
import OwnerLegend from "../components/timeline/OwnerLegend";
import TimelineGrid from "../components/timeline/TimelineGrid";
import CompletedStrip from "../components/timeline/CompletedStrip";
import QueueStrip from "../components/timeline/QueueStrip";
import AddLocationForm from "../components/timeline/AddLocationForm";

const MIN_PX = 3;
const MAX_PX = 20;
const LABEL_WIDTH_KEY = "vend.projectTracker.labelWidth";
const LABEL_WIDTH_MIN = 160;
const LABEL_WIDTH_MAX = 560;
const LABEL_FIXED_CHROME = 100; // grip + checkbox/restore + delete + paddings

let _measureCanvas;
function measureTextWidth(text, font) {
  if (!text) return 0;
  _measureCanvas ??= document.createElement("canvas");
  const ctx = _measureCanvas.getContext("2d");
  ctx.font = font;
  return ctx.measureText(text).width;
}

export default function ProjectTracker() {
  const [data, setData] = useLocalStorage(STORAGE_KEY, initialData());
  const [pxPerDay, setPxPerDay] = useState(9);
  const [ownerFilter, setOwnerFilter] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [stripOpen, setStripOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [promoteItem, setPromoteItem] = useState(null);
  const [manualLabelWidth, setManualLabelWidth] = useLocalStorage(LABEL_WIDTH_KEY, null);

  useEffect(() => {
    setData((cur) => {
      if (cur.asanaCompletedImportedV1) return cur;
      const crewId = newId();
      return {
        ...cur,
        asanaCompletedImportedV1: true,
        locations: [...cur.locations, ...buildAsanaImportLocations(cur.team, crewId)],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Correction: "Syed" in the Asana CSV is Syed Hossain, not Abdullah Sayed —
  // adds Syed Hossain as a real teammate and reassigns the phases the import
  // above mistakenly gave to Abdullah, scoped to just those imported
  // locations so nothing else gets touched.
  useEffect(() => {
    setData((cur) => {
      if (cur.asanaSyedFixV1) return cur;
      const abdullah = cur.team.find((t) => t.name.toLowerCase().startsWith("abdullah"));
      const existingSyed = cur.team.find((t) => t.name.toLowerCase().startsWith("syed"));
      const syedId = existingSyed?.id ?? newId();
      const team = existingSyed
        ? cur.team
        : [
            ...cur.team,
            { id: syedId, name: "Syed Hossain", initials: initialsOf("Syed Hossain"), color: nextColor(cur.team), timeOff: [] },
          ];
      const locations = !abdullah
        ? cur.locations
        : cur.locations.map((l) => {
            if (!ASANA_IMPORT_LOCATION_NAMES.has(l.name)) return l;
            return {
              ...l,
              phases: l.phases.map((p) => (p.ownerId === abdullah.id ? { ...p, ownerId: syedId } : p)),
            };
          });
      return { ...cur, asanaSyedFixV1: true, team, locations };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main calendar orders itself automatically — soonest Install/Go-Live date
  // at the top — rather than a manual drag order, so it always reflects
  // what's coming up next without anyone having to maintain it by hand.
  const activeLocations = useMemo(() => {
    return data.locations
      .filter((l) => !l.archived)
      .slice()
      .sort((a, b) => {
        const da = earliestScheduleDate(a.phases);
        const db = earliestScheduleDate(b.phases);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      });
  }, [data.locations]);

  // Completed section orders itself most-recently-finished-first, same
  // auto-sort philosophy as the main calendar.
  const archivedLocations = useMemo(() => {
    return data.locations
      .filter((l) => l.archived)
      .slice()
      .sort((a, b) => {
        const da = latestScheduleDate(a.phases);
        const db = latestScheduleDate(b.phases);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });
  }, [data.locations]);

  // Label column auto-fits to the longest current name/place so nothing
  // truncates; dragging the column's resize handle pins an explicit width
  // that persists and stops auto-fitting from overriding it.
  const autoLabelWidth = useMemo(() => {
    let widest = 0;
    data.locations.forEach((l) => {
      const nameW = measureTextWidth(l.name || "", "600 14px ui-sans-serif, system-ui, sans-serif");
      const placeW = l.place
        ? measureTextWidth(l.place, "600 10px ui-sans-serif, system-ui, sans-serif") + 30
        : 0;
      widest = Math.max(widest, nameW, placeW);
    });
    return Math.min(LABEL_WIDTH_MAX, Math.max(LABEL_WIDTH_MIN, Math.ceil(widest) + LABEL_FIXED_CHROME));
  }, [data.locations]);
  const labelWidth = manualLabelWidth ?? autoLabelWidth;

  const { rangeStart, rangeEnd } = useMemo(() => {
    const all = [...activeLocations.flatMap((l) => l.phases), ...data.team.flatMap((t) => t.timeOff || [])];
    if (!all.length) {
      const start = startOfMonth(new Date());
      return { rangeStart: start, rangeEnd: addDays(start, 120) };
    }
    const starts = all.map((p) => parseDate(p.start).getTime());
    const ends = all.map((p) => parseDate(p.end).getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    return {
      rangeStart: startOfMonth(addDays(min, -10)),
      rangeEnd: addDays(max, 21),
    };
  }, [activeLocations, data.team]);

  // Flags a phase when its owner is booked on another install/go-live at an
  // overlapping time — onboarding is excluded since one person can run
  // several of those in parallel, but installs/go-lives need them on-site.
  const doubleBookedPhaseIds = useMemo(() => {
    const byOwner = {};
    activeLocations.forEach((loc) => {
      loc.phases.forEach((p) => {
        const canon = canonPhaseLabel(p.label);
        if ((canon === "install" || canon === "golive") && p.ownerId && p.ownerId !== UNASSIGNED) {
          (byOwner[p.ownerId] ??= []).push(p);
        }
      });
    });
    const flagged = new Set();
    Object.values(byOwner).forEach((phases) => {
      for (let i = 0; i < phases.length; i++) {
        for (let j = i + 1; j < phases.length; j++) {
          if (rangesOverlap(phases[i].start, phases[i].end, phases[j].start, phases[j].end)) {
            flagged.add(phases[i].id);
            flagged.add(phases[j].id);
          }
        }
      }
    });
    return flagged;
  }, [activeLocations]);

  function addTeammate(name) {
    setData((cur) => ({
      ...cur,
      team: [...cur.team, { id: newId(), name, initials: initialsOf(name), color: nextColor(cur.team) }],
    }));
  }

  function updateTeammate(id, patch) {
    setData((cur) => ({
      ...cur,
      team: cur.team.map((t) => (t.id !== id ? t : { ...t, ...patch })),
    }));
  }

  function removeTeammate(id) {
    setData((cur) => ({ ...cur, team: cur.team.filter((t) => t.id !== id) }));
  }

  function reorderTeam(newTeam) {
    setData((cur) => ({ ...cur, team: newTeam }));
  }

  function addTimeOff(memberId, range) {
    setData((cur) => ({
      ...cur,
      team: cur.team.map((t) =>
        t.id !== memberId ? t : { ...t, timeOff: [...(t.timeOff || []), { id: newId(), ...range }] }
      ),
    }));
  }

  function updateTimeOff(memberId, timeOffId, patch) {
    setData((cur) => ({
      ...cur,
      team: cur.team.map((t) =>
        t.id !== memberId
          ? t
          : { ...t, timeOff: (t.timeOff || []).map((o) => (o.id !== timeOffId ? o : { ...o, ...patch })) }
      ),
    }));
  }

  function removeTimeOff(memberId, timeOffId) {
    setData((cur) => ({
      ...cur,
      team: cur.team.map((t) =>
        t.id !== memberId ? t : { ...t, timeOff: (t.timeOff || []).filter((o) => o.id !== timeOffId) }
      ),
    }));
  }

  function addLocation(loc) {
    setData((cur) => ({
      ...cur,
      locations: [...cur.locations, { ...loc, id: newId(), archived: false }],
    }));
  }

  function updatePhase(locId, phaseId, patch) {
    setData((cur) => ({
      ...cur,
      locations: cur.locations.map((l) => {
        if (l.id !== locId) return l;
        const patched = l.phases.map((p) => (p.id !== phaseId ? p : { ...p, ...patch }));
        const phases = "end" in patch ? cascadeDates(patched, phaseId) : patched;
        return { ...l, phases };
      }),
    }));
  }

  // Shifts exactly the given phases (by id) by deltaDays, regardless of which
  // location(s) they belong to. A plain drag passes just the one phase being
  // dragged (independent move); a multi-select drag passes every selected
  // phase id, so only the ones the user explicitly grouped move together.
  function shiftPhasesByIds(phaseIds, deltaDays) {
    const idSet = new Set(phaseIds);
    setData((cur) => ({
      ...cur,
      locations: cur.locations.map((l) => ({
        ...l,
        phases: l.phases.map((p) =>
          idSet.has(p.id)
            ? {
                ...p,
                start: toISO(addDays(parseDate(p.start), deltaDays)),
                end: toISO(addDays(parseDate(p.end), deltaDays)),
              }
            : p
        ),
      })),
    }));
  }

  function deletePhase(locId, phaseId) {
    setData((cur) => ({
      ...cur,
      locations: cur.locations.map((l) =>
        l.id !== locId ? l : { ...l, phases: l.phases.filter((p) => p.id !== phaseId) }
      ),
    }));
  }

  // Checking a location off marks every one of its phases done too, so
  // everything in the Completed section reads as fully wrapped up rather
  // than showing lingering open phases. Restoring leaves phase state as-is —
  // it doesn't guess which phase needs rework.
  function setArchived(locId, archived) {
    setData((cur) => ({
      ...cur,
      locations: cur.locations.map((l) => {
        if (l.id !== locId) return l;
        const phases = archived ? l.phases.map((p) => ({ ...p, done: true })) : l.phases;
        return { ...l, archived, phases };
      }),
    }));
    if (archived) setStripOpen(true);
  }

  function updateLocation(locId, patch) {
    setData((cur) => ({
      ...cur,
      locations: cur.locations.map((l) => (l.id !== locId ? l : { ...l, ...patch })),
    }));
  }

  function deleteLocation(locId) {
    setData((cur) => ({ ...cur, locations: cur.locations.filter((l) => l.id !== locId) }));
  }

  function openAddModal() {
    setAddKey((k) => k + 1);
    setShowAdd(true);
  }

  function addQueueItem(item) {
    setData((cur) => ({ ...cur, queue: [...(cur.queue || []), { ...item, id: newId() }] }));
  }

  function addSalesRep(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((cur) => {
      const existing = cur.salesReps || [];
      if (existing.some((r) => r.toLowerCase() === trimmed.toLowerCase())) return cur;
      return { ...cur, salesReps: [...existing, trimmed] };
    });
  }

  function updateQueueItem(id, patch) {
    setData((cur) => ({
      ...cur,
      queue: (cur.queue || []).map((q) => (q.id !== id ? q : { ...q, ...patch })),
    }));
  }

  function removeQueueItem(id) {
    setData((cur) => ({ ...cur, queue: (cur.queue || []).filter((q) => q.id !== id) }));
  }

  // "Add to calendar" opens the same name/place/phases modal used to create
  // a location from scratch, pre-filled with sensible defaults — rather than
  // silently guessing a schedule — so the deal's actual dates/owners get
  // confirmed before it lands on the calendar.
  function beginPromoteQueueItem(id) {
    const item = (data.queue || []).find((q) => q.id === id);
    if (item) setPromoteItem(item);
  }

  function finalizePromotion({ name, place, phases }) {
    setData((cur) => {
      const item = (cur.queue || []).find((q) => q.id === promoteItem?.id);
      if (!item) return cur;
      const location = { ...item, id: newId(), archived: false, name, place, phases };
      return {
        ...cur,
        locations: [...cur.locations, location],
        queue: cur.queue.filter((q) => q.id !== item.id),
      };
    });
    setPromoteItem(null);
  }

  // Clicking a location's name opens the same modal as creating one, so its
  // name/place and every phase (dates, owner, confirmed) can be edited
  // together instead of just the name inline.
  function openEditLocation(loc) {
    setEditingLocation(loc);
  }

  function finalizeEditLocation(patch) {
    if (!editingLocation) return;
    updateLocation(editingLocation.id, patch);
    setEditingLocation(null);
  }

  return (
    <div className="w-full p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-vend-black">Installation Schedule</h1>
          <p className="mt-1 text-sm text-slate-400">
            Drag a phase to reschedule, drag its edge to resize, click it to edit. Shift+click phases to group them —
            drag any one of the group to move them all together.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-concrete-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setPxPerDay((v) => Math.max(MIN_PX, v - 2))}
              className="rounded-full p-1.5 text-slate-500 hover:bg-concrete-100"
              aria-label="Zoom out"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPxPerDay((v) => Math.min(MAX_PX, v + 2))}
              className="rounded-full p-1.5 text-slate-500 hover:bg-concrete-100"
              aria-label="Zoom in"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-vend-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus size={15} /> Add location
          </button>
        </div>
      </div>

      <div className="mb-4">
        <OwnerLegend
          team={data.team}
          filter={ownerFilter}
          onFilterChange={setOwnerFilter}
          onAddTeammate={addTeammate}
          onUpdateTeammate={updateTeammate}
          onRemoveTeammate={removeTeammate}
          onReorderTeam={reorderTeam}
          onAddTimeOff={addTimeOff}
          onRemoveTimeOff={removeTimeOff}
        />
      </div>

      <LayoutGroup>
        <div
          className="scrollx overflow-auto rounded-2xl border border-concrete-200 bg-white"
          style={{ maxHeight: "calc(100vh - 300px)" }}
        >
          <TimelineGrid
            locations={activeLocations}
            team={data.team}
            pxPerDay={pxPerDay}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            ownerFilter={ownerFilter}
            onUpdatePhase={updatePhase}
            onDeletePhase={deletePhase}
            onArchive={(id) => setArchived(id, true)}
            onDeleteLocation={deleteLocation}
            onEditLocation={openEditLocation}
            onAddLocation={openAddModal}
            onShiftPhases={shiftPhasesByIds}
            onUpdateTimeOff={updateTimeOff}
            onRemoveTimeOff={removeTimeOff}
            doubleBookedPhaseIds={doubleBookedPhaseIds}
            sortable={false}
            labelWidth={labelWidth}
            onResizeLabelWidth={setManualLabelWidth}
          />
        </div>

        <QueueStrip
          queue={data.queue || []}
          salesReps={data.salesReps || []}
          onAddSalesRep={addSalesRep}
          open={queueOpen}
          onToggle={() => setQueueOpen((v) => !v)}
          onAdd={addQueueItem}
          onUpdate={updateQueueItem}
          onRemove={removeQueueItem}
          onPromote={beginPromoteQueueItem}
        />

        <CompletedStrip
          locations={archivedLocations}
          team={data.team}
          open={stripOpen}
          onToggle={() => setStripOpen((v) => !v)}
          onRestore={(id) => setArchived(id, false)}
          pxPerDay={pxPerDay}
          onUpdatePhase={updatePhase}
          onDeletePhase={deletePhase}
          onDeleteLocation={deleteLocation}
          onEditLocation={openEditLocation}
          onShiftPhases={shiftPhasesByIds}
          labelWidth={labelWidth}
          onResizeLabelWidth={setManualLabelWidth}
        />
      </LayoutGroup>

      <AddLocationForm
        key={addKey}
        open={showAdd}
        onClose={() => setShowAdd(false)}
        team={data.team}
        onSubmit={(loc) => {
          addLocation(loc);
          setShowAdd(false);
        }}
      />

      <AddLocationForm
        key={promoteItem?.id || "promote-none"}
        open={!!promoteItem}
        onClose={() => setPromoteItem(null)}
        team={data.team}
        title="Add to calendar"
        submitLabel="Add to calendar"
        initialName={promoteItem?.name || ""}
        initialPlace={promoteItem?.place || ""}
        onSubmit={finalizePromotion}
      />

      <AddLocationForm
        key={editingLocation?.id || "edit-none"}
        open={!!editingLocation}
        onClose={() => setEditingLocation(null)}
        team={data.team}
        title="Edit location"
        submitLabel="Save changes"
        initialName={editingLocation?.name || ""}
        initialPlace={editingLocation?.place || ""}
        initialPhases={editingLocation?.phases}
        onSubmit={finalizeEditLocation}
      />
    </div>
  );
}
