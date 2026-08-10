import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { AnimatePresence, Reorder } from "framer-motion";
import { buildMonthTicks, buildQuarterTicks, buildWeekendBands, diffDays, todayStart } from "../../lib/dateUtils";
import LocationRow, { ROW_HEIGHT } from "./LocationRow";
import OOORow from "./OOORow";

const QUARTER_HEIGHT = 26;
const MONTH_HEIGHT = 34;
const TARGET_ROWS = 10;
const MIN_LABEL_WIDTH = 160;
const MAX_LABEL_WIDTH = 560;

function BlankRow({ labelWidth, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/blank flex w-full border-b border-concrete-200 text-left last:border-b-0"
      style={{ height: ROW_HEIGHT }}
    >
      <div
        className="sticky left-0 z-[45] flex shrink-0 items-center gap-2 border-r border-concrete-200 bg-white px-4 text-slate-300 transition group-hover/blank:bg-concrete-100/50 group-hover/blank:text-slate-400"
        style={{ width: labelWidth }}
      >
        <Plus size={15} className="opacity-0 transition group-hover/blank:opacity-100" />
        <span className="text-sm font-medium opacity-0 transition group-hover/blank:opacity-100">
          Add location
        </span>
      </div>
      <div className="flex-1" />
    </button>
  );
}

export default function TimelineGrid({
  locations,
  team,
  pxPerDay,
  rangeStart,
  rangeEnd,
  ownerFilter,
  onUpdatePhase,
  onDeletePhase,
  onArchive,
  onDeleteLocation,
  onEditLocation,
  onAddLocation,
  onShiftPhases,
  onDuplicatePhase,
  onReorderLocations,
  onUpdateTimeOff,
  onRemoveTimeOff,
  companyEvents = [],
  onAddCompanyEvent,
  onUpdateCompanyEvent,
  onRemoveCompanyEvent,
  showOOO = true,
  showBlankRows = true,
  restoreMode = false,
  sortable = true,
  doubleBookedPhaseIds,
  labelWidth = 260,
  onResizeLabelWidth,
}) {
  const totalDays = diffDays(rangeStart, rangeEnd);
  const totalWidth = totalDays * pxPerDay;
  const quarterTicks = buildQuarterTicks(rangeStart, rangeEnd);
  const monthTicks = buildMonthTicks(rangeStart, rangeEnd);
  const weekendBands = buildWeekendBands(rangeStart, rangeEnd);
  const todayOffset = diffDays(rangeStart, todayStart()) * pxPerDay;
  const thisYear = new Date().getFullYear();

  // Phases the user has explicitly grouped (shift-click) so a drag on any one
  // of them moves the whole set together; otherwise a drag only moves that
  // one phase. dragGroup mirrors the live in-progress drag for preview.
  const [selectedPhaseIds, setSelectedPhaseIds] = useState(() => new Set());
  const [dragGroup, setDragGroup] = useState(null);

  // Only one phase's edit popover open at a time — opening a new one closes
  // whichever was already open, rather than stacking popovers.
  const [openPhaseId, setOpenPhaseId] = useState(null);

  // Dragging the column-boundary handle previews the width locally; the
  // committed value (persisted by the caller) only updates on release, so
  // both grids sharing one saved width don't fight mid-drag.
  const [dragLabelWidth, setDragLabelWidth] = useState(null);
  const displayLabelWidth = dragLabelWidth ?? labelWidth;

  function startLabelResize(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = displayLabelWidth;
    function clamp(w) {
      return Math.min(MAX_LABEL_WIDTH, Math.max(MIN_LABEL_WIDTH, w));
    }
    function onMove(ev) {
      setDragLabelWidth(clamp(startWidth + (ev.clientX - startX)));
    }
    function onUp(ev) {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      onResizeLabelWidth?.(clamp(startWidth + (ev.clientX - startX)));
      setDragLabelWidth(null);
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  function toggleSelect(phaseId) {
    setSelectedPhaseIds((cur) => {
      const next = new Set(cur);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }

  // Clicking anywhere outside the current selection clears it. Shift-clicks
  // are left alone (they're always meant to add/remove from the selection,
  // never to reset it), and clicking a bar that's already selected is exempt
  // too, so starting a group-drag doesn't wipe the group first.
  useEffect(() => {
    if (selectedPhaseIds.size === 0) return;
    function onDocDown(e) {
      if (e.shiftKey) return;
      const hit = e.target.closest?.("[data-phase-id]");
      if (hit && selectedPhaseIds.has(hit.dataset.phaseId)) return;
      setSelectedPhaseIds(new Set());
    }
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [selectedPhaseIds]);

  return (
    <div style={{ width: displayLabelWidth + totalWidth, minWidth: "100%" }}>
      <div className="sticky top-0 z-[50] bg-white">
        <div className="flex border-b border-concrete-100">
          <div
            className="sticky left-0 z-[50] flex shrink-0 items-center border-r border-concrete-200 bg-white px-3"
            style={{ width: displayLabelWidth }}
          >
            {selectedPhaseIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPhaseIds(new Set())}
                className="flex items-center gap-1.5 rounded-full bg-beacon-100 px-2.5 py-1 text-xs font-semibold text-beacon-700 transition hover:bg-beacon-100/70"
              >
                {selectedPhaseIds.size} selected <X size={12} />
              </button>
            )}
          </div>
          <div className="relative" style={{ width: totalWidth, height: QUARTER_HEIGHT }}>
            {quarterTicks.map((t, i) => (
              <div
                key={i}
                className="absolute top-0 flex h-full items-center border-r border-concrete-100 px-3.5 text-xs font-semibold uppercase tracking-wide text-slate-300"
                style={{ left: t.dayOffset * pxPerDay, width: t.widthDays * pxPerDay }}
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>
        <div className="flex border-b border-concrete-200">
          <div
            className="sticky left-0 z-[50] shrink-0 border-r border-concrete-200 bg-white"
            style={{ width: displayLabelWidth }}
          />
          <div className="relative" style={{ width: totalWidth, height: MONTH_HEIGHT }}>
            {monthTicks.map((t, i) => (
              <div
                key={i}
                className="absolute top-0 flex h-full items-center border-r border-concrete-100 px-3.5 text-sm font-semibold text-slate-400"
                style={{ left: t.dayOffset * pxPerDay, width: t.widthDays * pxPerDay }}
              >
                {t.label}
                {t.year !== thisYear ? ` '${String(t.year).slice(2)}` : ""}
              </div>
            ))}
          </div>
        </div>
        <div className="sticky top-0 z-[55] h-0 w-0 overflow-visible" style={{ left: displayLabelWidth }}>
          <div
            onPointerDown={startLabelResize}
            className="absolute -ml-1.5 w-3 cursor-col-resize hover:bg-beacon/20 active:bg-beacon/30"
            style={{ top: 0, height: QUARTER_HEIGHT + MONTH_HEIGHT }}
          >
            <div className="mx-auto h-full w-0.5 bg-transparent hover:bg-beacon" />
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0" style={{ left: displayLabelWidth }}>
          {weekendBands.map((b, i) => (
            <div
              key={i}
              className="absolute top-0 h-full bg-concrete-100/60"
              style={{ left: b.dayOffset * pxPerDay, width: b.widthDays * pxPerDay }}
            />
          ))}
          <div className="absolute top-0 h-full w-0.5 bg-beacon" style={{ left: todayOffset }}>
            <div className="absolute -left-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-beacon ring-4 ring-beacon-100" />
          </div>
        </div>

        {showOOO && (
          <OOORow
            team={team}
            pxPerDay={pxPerDay}
            rangeStart={rangeStart}
            ownerFilter={ownerFilter}
            labelWidth={displayLabelWidth}
            onUpdateTimeOff={onUpdateTimeOff}
            onRemoveTimeOff={onRemoveTimeOff}
            companyEvents={companyEvents}
            onAddCompanyEvent={onAddCompanyEvent}
            onUpdateCompanyEvent={onUpdateCompanyEvent}
            onRemoveCompanyEvent={onRemoveCompanyEvent}
          />
        )}

        <Reorder.Group
          as="div"
          axis="y"
          values={locations}
          onReorder={onReorderLocations || (() => {})}
          className="contents"
        >
          <AnimatePresence initial={false}>
            {locations.map((loc) => (
              <LocationRow
                key={loc.id}
                location={loc}
                team={team}
                pxPerDay={pxPerDay}
                rangeStart={rangeStart}
                ownerFilter={ownerFilter}
                onUpdatePhase={onUpdatePhase}
                onDeletePhase={onDeletePhase}
                onArchive={onArchive}
                onDeleteLocation={onDeleteLocation}
                onEditLocation={onEditLocation}
                onShiftPhases={onShiftPhases}
                onDuplicatePhase={onDuplicatePhase}
                allLocations={locations}
                labelWidth={displayLabelWidth}
                restoreMode={restoreMode}
                draggable={sortable}
                doubleBookedPhaseIds={doubleBookedPhaseIds}
                selectedPhaseIds={selectedPhaseIds}
                onToggleSelect={toggleSelect}
                dragGroup={dragGroup}
                onDragGroupChange={setDragGroup}
                openPhaseId={openPhaseId}
                onOpenPhase={setOpenPhaseId}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {showBlankRows &&
          Array.from({ length: Math.max(0, TARGET_ROWS - locations.length) }).map((_, i) => (
            <BlankRow key={`blank-${i}`} labelWidth={displayLabelWidth} onClick={onAddLocation} />
          ))}

        {!showBlankRows && locations.length === 0 && (
          <p className="flex items-center px-4 text-sm text-slate-400" style={{ height: ROW_HEIGHT }}>
            Nothing completed yet.
          </p>
        )}
      </div>
    </div>
  );
}
