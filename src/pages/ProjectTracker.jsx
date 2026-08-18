import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { useLocalStorage } from "../lib/storage";
import { useScheduleStore } from "../lib/scheduleStore";
import {
  parseDate,
  addDays,
  startOfMonth,
  canonPhaseLabel,
  rangesOverlap,
  goLiveStart,
  latestScheduleDate,
  todayStart,
  diffDays,
  UNASSIGNED,
} from "../lib/dateUtils";
import TeamManagerButton from "../components/timeline/TeamManagerButton";
import LocationFilter from "../components/timeline/LocationFilter";
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

// updatePhase/deletePhase/setArchived/deleteLocation/removeTeammate are
// deliberately left out here — they're wrapped below with undo support
// instead of going through the plain deny-for-viewers path.
const MUTATOR_NAMES = [
  "addTeammate",
  "updateTeammate",
  "reorderTeam",
  "addTimeOff",
  "updateTimeOff",
  "removeTimeOff",
  "addCompanyEvent",
  "updateCompanyEvent",
  "removeCompanyEvent",
  "addLocation",
  "shiftPhasesByIds",
  "duplicatePhase",
  "updateLocation",
  "addQueueItem",
  "addSalesRep",
  "updateQueueItem",
  "removeQueueItem",
  "promoteQueueItem",
];

let _measureCanvas;
function measureTextWidth(text, font) {
  if (!text) return 0;
  _measureCanvas ??= document.createElement("canvas");
  const ctx = _measureCanvas.getContext("2d");
  ctx.font = font;
  return ctx.measureText(text).width;
}

export default function ProjectTracker({ isAdmin = true }) {
  const store = useScheduleStore();
  const { data } = store;
  // Every write goes through the shared database now — a viewer's clicks
  // never reach Supabase at all, so there's nothing to bypass client-side.
  const denyWrite = () => window.alert("You have view-only access — ask an admin to make this change.");
  const mutators = useMemo(
    () => Object.fromEntries(MUTATOR_NAMES.map((n) => [n, isAdmin ? store[n] : denyWrite])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, store.data]
  );
  const {
    addTeammate,
    updateTeammate,
    reorderTeam,
    addTimeOff,
    updateTimeOff,
    removeTimeOff,
    addCompanyEvent,
    updateCompanyEvent,
    removeCompanyEvent,
    addLocation,
    shiftPhasesByIds,
    duplicatePhase,
    updateLocation,
    addQueueItem,
    addSalesRep,
    updateQueueItem,
    removeQueueItem,
    promoteQueueItem,
  } = mutators;

  // A single-slot "undo my last action" — covers the handful of things
  // most likely to be an "oops" (dragged the wrong bar, deleted the wrong
  // phase/location, misclicked archive or remove-teammate). Each wrapped
  // mutator below snapshots the prior state before writing, then a plain
  // inverse write on undo restores it.
  const [undoAction, setUndoAction] = useState(null); // { label, run }

  async function updatePhase(locId, phaseId, patch) {
    if (!isAdmin) return denyWrite();
    const prevPhase = data.locations.find((l) => l.id === locId)?.phases.find((p) => p.id === phaseId);
    await store.updatePhase(locId, phaseId, patch);
    if (prevPhase) {
      setUndoAction({ label: `Updated "${prevPhase.label}"`, run: () => store.updatePhase(locId, phaseId, prevPhase) });
    }
  }

  async function deletePhase(locId, phaseId) {
    if (!isAdmin) return denyWrite();
    const prevPhase = data.locations.find((l) => l.id === locId)?.phases.find((p) => p.id === phaseId);
    await store.deletePhase(locId, phaseId);
    if (prevPhase) {
      setUndoAction({ label: `Deleted "${prevPhase.label}"`, run: () => store.restorePhase(locId, prevPhase) });
    }
  }

  async function deleteLocation(locId) {
    if (!isAdmin) return denyWrite();
    const prevLoc = data.locations.find((l) => l.id === locId);
    await store.deleteLocation(locId);
    if (prevLoc) {
      setUndoAction({ label: `Deleted "${prevLoc.name}"`, run: () => store.restoreLocation(prevLoc) });
    }
  }

  async function setArchived(locId, archived) {
    if (!isAdmin) return denyWrite();
    const prevLoc = data.locations.find((l) => l.id === locId);
    await store.setArchived(locId, archived);
    if (prevLoc) {
      setUndoAction({
        label: archived ? `Marked "${prevLoc.name}" complete` : `Restored "${prevLoc.name}"`,
        run: async () => {
          await store.setArchived(locId, prevLoc.archived);
          // Archiving force-marks every phase done — undo has to put each
          // phase's own prior done state back, not just flip the flag.
          if (archived) {
            await Promise.all(prevLoc.phases.map((p) => store.updatePhase(locId, p.id, { done: p.done })));
          }
        },
      });
    }
  }

  async function removeTeammate(id) {
    if (!isAdmin) return denyWrite();
    const prevMember = data.team.find((t) => t.id === id);
    await store.removeTeammate(id);
    if (prevMember) {
      setUndoAction({ label: `Removed "${prevMember.name}"`, run: () => store.restoreTeammate(prevMember) });
    }
  }

  async function runUndo() {
    const action = undoAction;
    if (!action) return;
    setUndoAction(null);
    await action.run();
  }

  const [pxPerDay, setPxPerDay] = useState(9);
  // One combined filter — { type: "owner"|"contractor"|"onsite", value } or
  // null — hides non-matching locations entirely rather than dimming their
  // phase bars, so a filtered view is a clean subset of the calendar.
  const [locationFilter, setLocationFilter] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [stripOpen, setStripOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [promoteItem, setPromoteItem] = useState(null);
  const [manualLabelWidth, setManualLabelWidth] = useLocalStorage(LABEL_WIDTH_KEY, null);

  // A location matches the combined filter if any of its phases (for the
  // owner filter) or its own fields (contractor, onsite staff) match —
  // non-matching locations are dropped from the array entirely below.
  const matchesLocationFilter = useMemo(() => {
    const teamIds = new Set(data.team.map((t) => t.id));
    return (l) => {
      if (!locationFilter) return true;
      if (locationFilter.type === "contractor") return (l.contractor || "Task Force") === locationFilter.value;
      if (locationFilter.type === "onsite") return !!l.hasOnsiteStaff;
      if (locationFilter.type === "owner") {
        return l.phases.some((p) => (teamIds.has(p.ownerId) ? p.ownerId : UNASSIGNED) === locationFilter.value);
      }
      return true;
    };
  }, [data.team, locationFilter]);

  // Always auto-sorted soonest-Go-Live-first — recomputed from each
  // location's phase dates on every render, so the calendar re-shuffles
  // itself automatically as dates change instead of relying on a persisted
  // manual order.
  const activeLocations = useMemo(() => {
    return data.locations
      .filter((l) => !l.archived && matchesLocationFilter(l))
      .slice()
      .sort((a, b) => {
        const da = goLiveStart(a.phases);
        const db = goLiveStart(b.phases);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      });
  }, [data.locations, matchesLocationFilter]);

  // The OOO row still just dims non-matching team members (it's a single
  // summary row, not a set of locations that can disappear), so it only
  // reacts to the owner half of the combined filter.
  const ownerFilterForOOO = locationFilter?.type === "owner" ? locationFilter.value : null;

  // Distinct contractors currently in use, for the filter dropdown —
  // derived from all active locations regardless of the filter itself, so
  // the option list doesn't shrink to just the currently-selected one.
  const contractors = useMemo(() => {
    const set = new Set(data.locations.filter((l) => !l.archived).map((l) => l.contractor || "Task Force"));
    return [...set].sort();
  }, [data.locations]);

  // Completed section orders itself most-recently-finished-first, same
  // auto-sort philosophy as the main calendar — and respects the same
  // combined filter as the active calendar (a completed location's real
  // owner/contractor/onsite-staff data is just as filterable as a live one).
  const archivedLocations = useMemo(() => {
    return data.locations
      .filter((l) => l.archived && matchesLocationFilter(l))
      .slice()
      .sort((a, b) => {
        const da = latestScheduleDate(a.phases);
        const db = latestScheduleDate(b.phases);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });
  }, [data.locations, matchesLocationFilter]);

  // Sales Queue items haven't been assigned an installer or a contractor
  // yet, so the owner/contractor filters can't meaningfully match one —
  // selecting either simply empties the queue view, same as if you asked
  // "show me only Sarah's locations" and nothing in the queue is Sarah's
  // yet. Onsite staff is already known pre-calendar, so that filter applies
  // directly.
  const filteredQueue = useMemo(() => {
    const queue = data.queue || [];
    if (!locationFilter) return queue;
    if (locationFilter.type === "onsite") return queue.filter((q) => !!q.hasOnsiteStaff);
    return [];
  }, [data.queue, locationFilter]);

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
    const all = [
      ...activeLocations.flatMap((l) => l.phases),
      ...data.team.flatMap((t) => t.timeOff || []),
      ...(data.companyEvents || []),
    ];
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
  }, [activeLocations, data.team, data.companyEvents]);

  // Opens scrolled to 3 weeks before today, rounded back to that week's
  // Monday — instead of the earliest date in the schedule, and instead of
  // just today itself — so there's a little recent-past context on-screen
  // alongside what's current. Runs once, the first time there's real data
  // to scroll against.
  const scrollRef = useRef(null);
  const scrolledToToday = useRef(false);
  useEffect(() => {
    if (scrolledToToday.current || !store.loaded || !scrollRef.current) return;
    scrolledToToday.current = true;
    const threeWeeksAgo = addDays(todayStart(), -21);
    const monday = addDays(threeWeeksAgo, -((threeWeeksAgo.getDay() + 6) % 7));
    const offsetDays = diffDays(rangeStart, monday);
    scrollRef.current.scrollLeft = Math.max(0, offsetDays * pxPerDay);
  }, [store.loaded, rangeStart, pxPerDay, labelWidth]);

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

  function openAddModal() {
    setAddKey((k) => k + 1);
    setShowAdd(true);
  }

  // "Add to calendar" opens the same name/place/phases modal used to create
  // a location from scratch, pre-filled with sensible defaults — rather than
  // silently guessing a schedule — so the deal's actual dates/owners get
  // confirmed before it lands on the calendar.
  function beginPromoteQueueItem(id) {
    const item = (data.queue || []).find((q) => q.id === id);
    if (item) setPromoteItem(item);
  }

  function finalizePromotion(fields) {
    if (promoteItem) promoteQueueItem(promoteItem, fields);
    setPromoteItem(null);
  }

  function openEditLocation(loc) {
    setEditingLocation(loc);
  }

  function finalizeEditLocation(patch) {
    if (!editingLocation) return;
    updateLocation(editingLocation.id, patch);
    setEditingLocation(null);
  }

  function handleArchive(id, archived) {
    setArchived(id, archived);
    if (archived) setStripOpen(true);
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
          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-full bg-vend-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus size={15} /> Add location
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <LocationFilter team={data.team} contractors={contractors} filter={locationFilter} onFilterChange={setLocationFilter} />
        <TeamManagerButton
          team={data.team}
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
          ref={scrollRef}
          className="scrollx overflow-auto rounded-2xl border border-concrete-200 bg-white"
          style={{ maxHeight: "calc(100vh - 300px)" }}
        >
          <TimelineGrid
            locations={activeLocations}
            team={data.team}
            pxPerDay={pxPerDay}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            ownerFilter={ownerFilterForOOO}
            onUpdatePhase={updatePhase}
            onDeletePhase={deletePhase}
            onArchive={(id) => handleArchive(id, true)}
            onDeleteLocation={deleteLocation}
            onEditLocation={openEditLocation}
            onAddLocation={openAddModal}
            onShiftPhases={shiftPhasesByIds}
            onDuplicatePhase={duplicatePhase}
            onUpdateTimeOff={updateTimeOff}
            onRemoveTimeOff={removeTimeOff}
            companyEvents={data.companyEvents || []}
            onAddCompanyEvent={addCompanyEvent}
            onUpdateCompanyEvent={updateCompanyEvent}
            onRemoveCompanyEvent={removeCompanyEvent}
            doubleBookedPhaseIds={doubleBookedPhaseIds}
            sortable={false}
            labelWidth={labelWidth}
            onResizeLabelWidth={setManualLabelWidth}
          />
        </div>

        <QueueStrip
          queue={filteredQueue}
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
          onRestore={(id) => handleArchive(id, false)}
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
        initialHasOnsiteStaff={promoteItem?.hasOnsiteStaff || false}
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
        initialContractor={editingLocation?.contractor || ""}
        initialHasOnsiteStaff={editingLocation?.hasOnsiteStaff || false}
        initialPhases={editingLocation?.phases}
        onSubmit={finalizeEditLocation}
      />

      {undoAction && (
        <div className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-full bg-vend-black px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
          <span>{undoAction.label}</span>
          <button
            type="button"
            onClick={runUndo}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide transition hover:bg-white/25"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setUndoAction(null)}
            aria-label="Dismiss"
            className="text-white/50 transition hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
