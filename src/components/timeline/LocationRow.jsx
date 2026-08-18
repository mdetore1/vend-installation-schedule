import { useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, MapPin, RotateCcw, Trash2 } from "lucide-react";
import { Checkbox } from "../fields";
import { canonPhaseLabel, rangesOverlap, UNASSIGNED } from "../../lib/dateUtils";
import PhaseBar from "./PhaseBar";

export const ROW_HEIGHT = 68;

const NO_CONFLICTS = new Set();
const NO_SELECTION = new Set();

export default function LocationRow({
  location,
  team,
  pxPerDay,
  rangeStart,
  ownerFilter,
  onUpdatePhase,
  onDeletePhase,
  onArchive,
  onDeleteLocation,
  onEditLocation,
  onShiftPhases,
  onDuplicatePhase,
  allLocations,
  labelWidth,
  restoreMode = false,
  draggable = true,
  doubleBookedPhaseIds = NO_CONFLICTS,
  selectedPhaseIds = NO_SELECTION,
  onToggleSelect,
  dragGroup,
  onDragGroupChange,
  openPhaseId,
  onOpenPhase,
}) {
  const allDone = location.phases.length > 0 && location.phases.every((p) => p.done);
  const teamById = Object.fromEntries(team.map((t) => [t.id, t]));
  const controls = useDragControls();
  // A shared layer all phase labels portal into, so a later/overlapping
  // bar's opaque pill can never paint over an earlier phase's label text —
  // see PhaseBar's externalLabel portal.
  const [labelLayer, setLabelLayer] = useState(null);
  const otherLocations = (allLocations || []).filter((l) => l.id !== location.id);

  // Alternates each phase's narrow-bar label above/below the shared
  // midline, by chronological order rather than array order (seed data
  // doesn't always list phases in date order) — so two short, adjacent
  // phases (e.g. Install + Go Live) never render their labels on the same
  // line and overlap into unreadable text.
  const staggerByPhaseId = new Map(
    [...location.phases].sort((a, b) => a.start.localeCompare(b.start)).map((p, i) => [p.id, i % 2])
  );

  return (
    <Reorder.Item
      value={location}
      dragListener={false}
      dragControls={controls}
      layoutId={`loc-${location.id}`}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
      className="group/row flex border-b border-concrete-200"
      style={{ height: ROW_HEIGHT }}
    >
      <div
        className={`sticky left-0 z-[45] flex shrink-0 items-center gap-2 bg-white px-4 ${
          location.onHold ? "border-r-2 border-dashed border-caution-600" : "border-r border-concrete-200"
        }`}
        style={
          location.onHold
            ? {
                width: labelWidth,
                backgroundImage: "repeating-linear-gradient(135deg, rgba(217,158,50,0.05) 0 10px, rgba(217,158,50,0.12) 10px 20px)",
              }
            : { width: labelWidth }
        }
      >
        {draggable && (
          <span
            onPointerDown={(e) => controls.start(e)}
            className="shrink-0 cursor-grab touch-none text-slate-200 transition hover:text-slate-400"
          >
            <GripVertical size={16} />
          </span>
        )}
        {restoreMode ? (
          <button
            type="button"
            onClick={() => onArchive(location.id)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-concrete-300 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
          >
            <RotateCcw size={11} /> Restore
          </button>
        ) : (
          <Checkbox checked={allDone} onChange={() => onArchive(location.id)} />
        )}
        <button
          type="button"
          onClick={() => onEditLocation?.(location)}
          className="-mx-1 min-w-0 flex-1 rounded px-1 py-0.5 text-left transition hover:bg-concrete-100/50"
          title="Edit location & phases"
        >
          <p className="truncate text-sm font-semibold text-vend-black">{location.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-concrete-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              <MapPin size={10} className="shrink-0 text-slate-400" />
              {location.place || "Add city, state"}
            </span>
            {location.hasOnsiteStaff && (
              <span className="shrink-0 rounded-full bg-mint-200 px-2 py-0.5 text-[10px] font-bold text-mint-700">Spark</span>
            )}
            {location.onHold && (
              <span className="shrink-0 rounded-full bg-caution-100 px-2 py-0.5 text-[10px] font-bold text-caution-700">
                On Hold
              </span>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onDeleteLocation(location.id)}
          className="ml-auto shrink-0 self-start text-slate-200 opacity-0 transition hover:text-alert-600 group-hover/row:opacity-100"
          aria-label="Remove location"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="relative flex-1">
        {location.phases.map((phase) => {
          const owner = teamById[phase.ownerId] ?? null;
          const ownerKey = owner ? phase.ownerId : UNASSIGNED;
          const inDragGroup = !!dragGroup && dragGroup.ids.has(phase.id);
          const isDragger = !!dragGroup && dragGroup.draggerId === phase.id;
          const externalOffsetPx = inDragGroup && !isDragger ? dragGroup.dx : 0;
          const selected = selectedPhaseIds.has(phase.id);
          // Onboarding is exempt from every conflict check — it's flexible/
          // remote work, so anything can overlap with it.
          const isOnboarding = canonPhaseLabel(phase.label) === "onboarding";
          const timeOffConflict =
            !isOnboarding && !!owner?.timeOff?.some((t) => rangesOverlap(phase.start, phase.end, t.start, t.end));
          const doubleBooked = !isOnboarding && doubleBookedPhaseIds.has(phase.id);
          const conflict = timeOffConflict || doubleBooked;
          const conflictReasons = [
            timeOffConflict && `${owner?.name ?? "Owner"} is scheduled off during part of this range.`,
            doubleBooked && `${owner?.name ?? "Owner"} is double-booked on another install/go-live during part of this range.`,
          ].filter(Boolean);
          return (
            <PhaseBar
              key={phase.id}
              phase={phase}
              owner={owner?.color ?? null}
              team={team}
              pxPerDay={pxPerDay}
              rangeStart={rangeStart}
              dimmed={!!ownerFilter && ownerKey !== ownerFilter}
              conflict={conflict}
              conflictReasons={conflictReasons}
              externalOffsetPx={externalOffsetPx}
              selected={selected}
              selectedPhaseIds={selectedPhaseIds}
              onToggleSelect={() => onToggleSelect(phase.id)}
              open={openPhaseId === phase.id}
              onOpenChange={(next) => onOpenPhase?.(next ? phase.id : null)}
              labelStagger={staggerByPhaseId.get(phase.id)}
              onChange={(patch) => onUpdatePhase(location.id, phase.id, patch)}
              onDelete={() => onDeletePhase(location.id, phase.id)}
              onMoving={(dx, groupIds) => onDragGroupChange({ draggerId: phase.id, ids: new Set(groupIds), dx })}
              onMoveEnd={() => onDragGroupChange(null)}
              onMove={(deltaDays, groupIds) => onShiftPhases(groupIds, deltaDays)}
              onDuplicate={onDuplicatePhase && ((targetId) => onDuplicatePhase(phase, targetId))}
              otherLocations={otherLocations}
              labelLayer={labelLayer}
            />
          );
        })}
        <div ref={setLabelLayer} className="pointer-events-none absolute inset-0" style={{ zIndex: 42 }} />
      </div>
    </Reorder.Item>
  );
}
