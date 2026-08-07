import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Trash2, UserX, X } from "lucide-react";
import { Field, TextInput, Select, Toggle, Checkbox } from "../fields";
import { parseDate, toISO, addDays, diffDays, formatShort, UNASSIGNED } from "../../lib/dateUtils";
import { useAnchoredPosition } from "../../lib/useAnchoredPosition";

const MOVE_THRESHOLD = 3;
const POPOVER_WIDTH = 270;
const POPOVER_HEIGHT = 360;
const CONFLICT_POPOVER_WIDTH = 220;
const CONFLICT_POPOVER_HEIGHT = 120;
const HOVER_CLOSE_DELAY = 150;
const CELEBRATE_DURATION = 700;
const CONFETTI_COLORS = ["#FFC24B", "#14D5A3", "#3E8BFF", "#FF7A45", "#7C6FEA", "#FF4D4F"];
const CONFETTI_PIECES = Array.from({ length: 14 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 14 + (i % 2 === 0 ? 0.15 : -0.15);
  const distance = 26 + ((i * 7) % 18);
  return {
    id: i,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    rotate: (i * 53) % 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  };
});

export default function PhaseBar({
  phase,
  owner,
  team,
  pxPerDay,
  rangeStart,
  onChange,
  onDelete,
  onMove,
  onMoving,
  onMoveEnd,
  dimmed,
  conflict,
  conflictReasons = [],
  externalOffsetPx = 0,
  selected = false,
  selectedPhaseIds,
  onToggleSelect,
  open,
  onOpenChange,
  labelStagger = 0,
}) {
  const startDate = parseDate(phase.start);
  const endDate = parseDate(phase.end);
  const leftDay = diffDays(rangeStart, startDate);
  const durDays = Math.max(diffDays(startDate, endDate), 1);

  const dragState = useRef(null);
  const [dragDx, setDragDx] = useState(0);
  const [dragMode, setDragMode] = useState(null);
  const [hovering, setHovering] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const barRef = useRef(null);
  const popoverRef = useRef(null);
  const conflictBadgeRef = useRef(null);
  const conflictPopoverRef = useRef(null);
  const conflictCloseTimer = useRef(null);
  const celebrateTimer = useRef(null);

  // Marking a phase complete is the pay-off moment for the whole schedule —
  // give it a small confetti burst instead of a plain silent checkbox flip.
  function toggleDone(e) {
    e.stopPropagation();
    const next = !phase.done;
    onChange({ done: next });
    if (next) {
      clearTimeout(celebrateTimer.current);
      setCelebrating(true);
      celebrateTimer.current = setTimeout(() => setCelebrating(false), CELEBRATE_DURATION);
    }
  }
  useEffect(() => () => clearTimeout(celebrateTimer.current), []);

  const pos = useAnchoredPosition(open, barRef, {
    width: POPOVER_WIDTH,
    height: POPOVER_HEIGHT,
  });
  const conflictPos = useAnchoredPosition(conflictOpen, conflictBadgeRef, {
    width: CONFLICT_POPOVER_WIDTH,
    height: CONFLICT_POPOVER_HEIGHT,
  });

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (barRef.current?.contains(e.target) || popoverRef.current?.contains(e.target)) return;
      onOpenChange?.(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [open, onOpenChange]);

  function openConflictPopover() {
    clearTimeout(conflictCloseTimer.current);
    setConflictOpen(true);
  }
  function scheduleCloseConflictPopover() {
    clearTimeout(conflictCloseTimer.current);
    conflictCloseTimer.current = setTimeout(() => setConflictOpen(false), HOVER_CLOSE_DELAY);
  }
  useEffect(() => () => clearTimeout(conflictCloseTimer.current), []);

  function beginDrag(e, mode) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Resolve once at drag-start: if this phase is part of a multi-selection,
    // the whole selected group moves together; otherwise just this phase does.
    const groupIds =
      mode === "move" && selected && selectedPhaseIds?.size > 1 ? [...selectedPhaseIds] : [phase.id];
    dragState.current = { mode, startX: e.clientX, moved: false, shiftKey: e.shiftKey, groupIds };
    setDragMode(mode);
  }

  function onPointerMove(e) {
    const st = dragState.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    if (Math.abs(dx) > MOVE_THRESHOLD) st.moved = true;
    setDragDx(dx);
    if (st.mode === "move") onMoving?.(dx, st.groupIds);
  }

  function onPointerUp() {
    const st = dragState.current;
    if (!st) return;
    dragState.current = null;
    const deltaDays = Math.round(dragDx / pxPerDay);
    if (st.moved && deltaDays !== 0) {
      if (st.mode === "move") {
        onMove(deltaDays, st.groupIds);
      } else if (st.mode === "resize-left") {
        const next = addDays(startDate, deltaDays);
        if (next < endDate) onChange({ start: toISO(next) });
      } else if (st.mode === "resize-right") {
        const next = addDays(endDate, deltaDays);
        if (next > startDate) onChange({ end: toISO(next) });
      }
    } else if (!st.moved && st.mode === "move") {
      if (st.shiftKey) onToggleSelect?.();
      else onOpenChange?.(!open);
    }
    if (st.mode === "move") onMoveEnd?.();
    setDragMode(null);
    setDragDx(0);
  }

  let left = leftDay * pxPerDay + externalOffsetPx;
  let width = durDays * pxPerDay;
  if (dragMode === "move") left += dragDx;
  if (dragMode === "resize-left") {
    left += dragDx;
    width -= dragDx;
  }
  if (dragMode === "resize-right") width += dragDx;
  width = Math.max(width, 26);

  const dragDeltaDays = dragMode ? Math.round(dragDx / pxPerDay) : 0;
  let previewStart = startDate;
  let previewEnd = endDate;
  if (dragMode === "move") {
    previewStart = addDays(startDate, dragDeltaDays);
    previewEnd = addDays(endDate, dragDeltaDays);
  } else if (dragMode === "resize-left") {
    previewStart = addDays(startDate, dragDeltaDays);
  } else if (dragMode === "resize-right") {
    previewEnd = addDays(endDate, dragDeltaDays);
  }

  // Too narrow to show the label inside without it being unreadable — put
  // it just outside the bar instead of shrinking to a single letter, so a
  // one-day Go Live still reads as "Go Live" rather than just "G".
  const externalLabel = width < 60;

  const barStyle = !owner
    ? {
        backgroundImage: "repeating-linear-gradient(135deg, #73737824 0 6px, #73737845 6px 12px)",
        border: "1.5px dashed #99999E",
        color: "#4A4A50",
      }
    : phase.confirmed
    ? { backgroundColor: owner.bg, color: owner.text }
    : {
        backgroundImage: `repeating-linear-gradient(135deg, ${owner.bg}30 0 6px, ${owner.bg}55 6px 12px)`,
        border: `1.5px dashed ${owner.bg}`,
        color: "#111114",
      };

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{
        left,
        width,
        zIndex: dragMode ? 40 : open || conflictOpen ? 30 : hovering ? 25 : 1,
      }}
    >
      {dragMode && (
        <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-vend-black px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
          {dragMode === "resize-right"
            ? `→ ${formatShort(previewEnd)}`
            : dragMode === "resize-left"
            ? `${formatShort(previewStart)} →`
            : `${formatShort(previewStart)} → ${formatShort(previewEnd)}`}
        </div>
      )}
      {!dragMode && hovering && !open && (
        <div className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-vend-black px-2.5 py-1.5 text-xs text-white shadow-lg">
          <div className="font-bold">
            {phase.label}{" "}
            <span className="font-normal text-white/70">
              ({diffDays(startDate, endDate) + 1} day{diffDays(startDate, endDate) === 0 ? "" : "s"})
            </span>
          </div>
          <div className="text-white/70">
            {formatShort(startDate)} → {formatShort(endDate)}
            {phase.confirmed ? "" : " (proposed)"}
          </div>
        </div>
      )}
      <div
        ref={barRef}
        data-phase-id={phase.id}
        className={`group relative flex h-11 select-none items-center overflow-hidden rounded-lg px-2.5 text-sm font-semibold shadow-sm transition-opacity ${
          dragMode ? "cursor-grabbing" : "cursor-grab"
        } ${phase.done ? "opacity-50 line-through" : ""} ${dimmed ? "opacity-25" : ""} ${
          selected ? "ring-2 ring-beacon ring-offset-2" : ""
        }`}
        style={barStyle}
        onPointerDown={(e) => beginDrag(e, "move")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleDone}
          className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition ${
            phase.done ? "border-white/90 bg-white/90" : "border-white/60 bg-white/10 hover:bg-white/30"
          } ${externalLabel ? "" : "mr-1.5"}`}
          aria-label={phase.done ? "Mark phase incomplete" : "Mark phase complete"}
          title={phase.done ? "Mark incomplete" : "Mark complete"}
        >
          {phase.done && <Check size={10} strokeWidth={3} className="text-go-700" />}
          {celebrating && (
            <span className="pointer-events-none absolute left-1/2 top-1/2 block h-0 w-0">
              {CONFETTI_PIECES.map((c) => (
                <motion.span
                  key={c.id}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                  animate={{ x: c.x, y: c.y, opacity: 0, scale: 0.4, rotate: c.rotate }}
                  transition={{ duration: CELEBRATE_DURATION / 1000, ease: "easeOut" }}
                  className="absolute h-1.5 w-1.5 rounded-sm"
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </span>
          )}
        </button>
        {!owner && !externalLabel && <UserX size={13} className="mr-1 shrink-0" />}
        {!externalLabel && <span className="truncate">{phase.label}</span>}
        <span
          onPointerDown={(e) => beginDrag(e, "resize-left")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute left-0 top-0 h-full w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100"
        >
          <span className="absolute left-0.5 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded bg-white/70" />
        </span>
        <span
          onPointerDown={(e) => beginDrag(e, "resize-right")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute right-0 top-0 h-full w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100"
        >
          <span className="absolute right-0.5 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded bg-white/70" />
        </span>
      </div>
      {externalLabel && (
        <span
          className={`pointer-events-none absolute left-full ml-1.5 whitespace-nowrap text-xs font-semibold text-vend-black ${
            phase.done ? "opacity-50 line-through" : ""
          } ${dimmed ? "opacity-25" : ""}`}
          style={{ top: "50%", transform: `translateY(calc(-50% + ${labelStagger ? 9 : -9}px))` }}
        >
          {phase.label}
        </span>
      )}

      {conflict && !phase.conflictAcknowledged && (
        <span
          ref={conflictBadgeRef}
          onMouseEnter={openConflictPopover}
          onMouseLeave={scheduleCloseConflictPopover}
          className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-alert text-white ring-2 ring-white"
        >
          <AlertTriangle size={9} strokeWidth={3} />
        </span>
      )}

      {conflictOpen &&
        conflictPos &&
        createPortal(
          <div
            ref={conflictPopoverRef}
            onMouseEnter={openConflictPopover}
            onMouseLeave={scheduleCloseConflictPopover}
            style={{
              position: "fixed",
              top: conflictPos.top,
              left: conflictPos.left,
              width: CONFLICT_POPOVER_WIDTH,
              zIndex: 100,
            }}
            className="rounded-xl border border-concrete-200 bg-white p-3 shadow-xl"
          >
            <ul className="mb-2.5 space-y-1 text-xs font-medium text-alert-700">
              {conflictReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-1.5">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                onChange({ conflictAcknowledged: true });
                setConflictOpen(false);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-vend-black px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              <Check size={13} /> Approve — keep as scheduled
            </button>
          </div>,
          document.body
        )}

      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: POPOVER_WIDTH, zIndex: 100 }}
            className="rounded-xl border border-concrete-200 bg-white p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-vend-black">{phase.label}</p>
              <button
                type="button"
                onClick={() => onOpenChange?.(false)}
                className="text-slate-300 hover:text-vend-black"
              >
                <X size={15} />
              </button>
            </div>
            {conflict && !phase.conflictAcknowledged && (
              <div className="mb-3 rounded-lg bg-alert-100 px-2.5 py-2 text-xs font-semibold text-alert-700">
                <ul className="space-y-1">
                  {conflictReasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-1.5">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onChange({ conflictAcknowledged: true })}
                  className="mt-2 flex items-center gap-1.5 text-alert-700 underline hover:text-alert-800"
                >
                  <Check size={12} /> Approve — keep as scheduled
                </button>
              </div>
            )}
            {conflict && phase.conflictAcknowledged && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-concrete-100 px-2.5 py-2 text-xs font-semibold text-slate-500">
                <span>Conflict approved — keeping as scheduled.</span>
                <button
                  type="button"
                  onClick={() => onChange({ conflictAcknowledged: false })}
                  className="shrink-0 text-vend-black underline hover:opacity-70"
                >
                  Undo
                </button>
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start">
                  <TextInput
                    type="date"
                    value={phase.start}
                    max={phase.end}
                    onChange={(e) => onChange({ start: e.target.value })}
                  />
                </Field>
                <Field label="End">
                  <TextInput
                    type="date"
                    value={phase.end}
                    min={phase.start}
                    onChange={(e) => onChange({ end: e.target.value })}
                  />
                </Field>
              </div>
              <Select
                value={phase.ownerId || UNASSIGNED}
                onChange={(e) => onChange({ ownerId: e.target.value })}
                options={[
                  { value: UNASSIGNED, label: "Unassigned" },
                  ...team.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
              <Toggle
                checked={phase.confirmed}
                onChange={(v) => onChange({ confirmed: v })}
                label="Confirmed"
                description={phase.confirmed ? "Dates are locked in" : "Dates are still proposed"}
              />
              <Checkbox checked={phase.done} onChange={(v) => onChange({ done: v })} label="Phase complete" />
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 text-xs font-semibold text-alert-600 hover:text-alert-700"
              >
                <Trash2 size={13} /> Delete phase
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
