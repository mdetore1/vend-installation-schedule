import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import { TextInput } from "../fields";
import { diffDays, formatShort, parseDate } from "../../lib/dateUtils";
import { useAnchoredPosition, useCenteredTooltipPosition } from "../../lib/useAnchoredPosition";

const LANE_HEIGHT = 30;
const ROW_PADDING = 8;
const POPOVER_WIDTH = 220;
const POPOVER_HEIGHT = 150;
const EVENT_POPOVER_HEIGHT = 180;
const ADD_POPOVER_WIDTH = 240;
const ADD_POPOVER_HEIGHT = 190;

// Greedy interval partitioning — each entry goes in the first lane whose
// last-placed entry doesn't overlap it, so simultaneous OOO/events for
// different people (or the whole company) stack instead of rendering on
// top of each other.
function assignLanes(entries) {
  const laneEnds = [];
  const placed = [];
  for (const entry of entries) {
    let lane = laneEnds.findIndex((end) => end < entry.startDay);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(entry.endDay);
    } else {
      laneEnds[lane] = entry.endDay;
    }
    placed.push({ ...entry, lane });
  }
  return { placed, laneCount: Math.max(laneEnds.length, 1) };
}

function TimeOffBar({ entry, pxPerDay, dimmed, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const barRef = useRef(null);
  const popoverRef = useRef(null);
  const pos = useAnchoredPosition(open, barRef, { width: POPOVER_WIDTH, height: POPOVER_HEIGHT });
  const hoverPos = useCenteredTooltipPosition(hovering && !open, barRef, { width: 200, height: 50 });

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (barRef.current?.contains(e.target) || popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [open]);

  const left = entry.startDay * pxPerDay;
  const width = Math.max((entry.endDay - entry.startDay + 1) * pxPerDay, 26);
  const compact = width < 70;
  const label = entry.reason || "OOO";

  return (
    <div
      className="absolute"
      style={{
        left,
        width,
        top: ROW_PADDING + entry.lane * LANE_HEIGHT,
        height: LANE_HEIGHT - 6,
        zIndex: open ? 30 : hovering ? 25 : 1,
      }}
    >
      {hovering &&
        !open &&
        hoverPos &&
        createPortal(
          <div
            style={{ position: "fixed", top: hoverPos.top, left: hoverPos.left, zIndex: 100 }}
            className="pointer-events-none whitespace-nowrap rounded-md bg-vend-black px-2.5 py-1.5 text-xs text-white shadow-lg"
          >
            <div className="font-bold">
              {entry.name} — {label}{" "}
              <span className="font-normal text-white/70">
                ({entry.endDay - entry.startDay + 1} day{entry.endDay === entry.startDay ? "" : "s"})
              </span>
            </div>
            <div className="text-white/70">
              {formatShort(parseDate(entry.start))} → {formatShort(parseDate(entry.end))}
            </div>
          </div>,
          document.body
        )}
      <button
        ref={barRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`flex h-full w-full items-center overflow-hidden rounded-md px-2 text-xs font-semibold shadow-sm transition-opacity ${
          dimmed ? "opacity-25" : ""
        }`}
        style={{ backgroundColor: entry.color.bg, color: entry.color.text }}
      >
        <span className="truncate">{compact ? entry.initials : `${entry.initials}: ${label}`}</span>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: POPOVER_WIDTH, zIndex: 100 }}
            className="rounded-xl border border-concrete-200 bg-white p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-vend-black">{entry.name}</p>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-300 hover:text-vend-black">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-2">
              <TextInput
                value={entry.reason || ""}
                onChange={(e) => onUpdate({ reason: e.target.value })}
                placeholder="Reason (e.g. Vacation, Conference)"
                className="!py-1.5 !text-xs"
              />
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="date"
                  value={entry.start}
                  max={entry.end}
                  onChange={(e) => onUpdate({ start: e.target.value })}
                  className="!py-1.5 !text-xs"
                />
                <span className="text-slate-300">–</span>
                <TextInput
                  type="date"
                  value={entry.end}
                  min={entry.start}
                  onChange={(e) => onUpdate({ end: e.target.value })}
                  className="!py-1.5 !text-xs"
                />
              </div>
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1.5 text-xs font-semibold text-alert-600 hover:text-alert-700"
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function CompanyEventBar({ entry, pxPerDay, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const barRef = useRef(null);
  const popoverRef = useRef(null);
  const pos = useAnchoredPosition(open, barRef, { width: POPOVER_WIDTH, height: EVENT_POPOVER_HEIGHT });
  const hoverPos = useCenteredTooltipPosition(hovering && !open, barRef, { width: 200, height: 50 });

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (barRef.current?.contains(e.target) || popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [open]);

  const left = entry.startDay * pxPerDay;
  const width = Math.max((entry.endDay - entry.startDay + 1) * pxPerDay, 26);

  return (
    <div
      className="absolute"
      style={{
        left,
        width,
        top: ROW_PADDING + entry.lane * LANE_HEIGHT,
        height: LANE_HEIGHT - 6,
        zIndex: open ? 30 : hovering ? 25 : 1,
      }}
    >
      {hovering &&
        !open &&
        hoverPos &&
        createPortal(
          <div
            style={{ position: "fixed", top: hoverPos.top, left: hoverPos.left, zIndex: 100 }}
            className="pointer-events-none whitespace-nowrap rounded-md bg-vend-black px-2.5 py-1.5 text-xs text-white shadow-lg"
          >
            <div className="font-bold">
              {entry.name}{" "}
              <span className="font-normal text-white/70">
                ({entry.endDay - entry.startDay + 1} day{entry.endDay === entry.startDay ? "" : "s"})
              </span>
            </div>
            <div className="text-white/70">
              {formatShort(parseDate(entry.start))} → {formatShort(parseDate(entry.end))}
            </div>
          </div>,
          document.body
        )}
      <button
        ref={barRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="flex h-full w-full items-center overflow-hidden rounded-md border border-dashed border-vend-black/40 bg-concrete-200 px-2 text-xs font-semibold text-vend-black shadow-sm"
      >
        <span className="truncate">{entry.name}</span>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: POPOVER_WIDTH, zIndex: 100 }}
            className="rounded-xl border border-concrete-200 bg-white p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-vend-black">Company event</p>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-300 hover:text-vend-black">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-2">
              <TextInput
                value={entry.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="e.g. Thanksgiving, Company offsite"
                className="!py-1.5 !text-xs"
              />
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="date"
                  value={entry.start}
                  max={entry.end}
                  onChange={(e) => onUpdate({ start: e.target.value })}
                  className="!py-1.5 !text-xs"
                />
                <span className="text-slate-300">–</span>
                <TextInput
                  type="date"
                  value={entry.end}
                  min={entry.start}
                  onChange={(e) => onUpdate({ end: e.target.value })}
                  className="!py-1.5 !text-xs"
                />
              </div>
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1.5 text-xs font-semibold text-alert-600 hover:text-alert-700"
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function AddCompanyEventButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const pos = useAnchoredPosition(open, btnRef, { width: ADD_POPOVER_WIDTH, height: ADD_POPOVER_HEIGHT });

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [open]);

  function submit() {
    if (!name.trim() || !start) return;
    onAdd(name.trim(), { start, end: end && end >= start ? end : start });
    setName("");
    setStart("");
    setEnd("");
    setOpen(false);
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 transition hover:border-vend-black hover:text-vend-black"
        title="Add a company-wide holiday or event"
        aria-label="Add company event"
      >
        <Plus size={12} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: ADD_POPOVER_WIDTH, zIndex: 100 }}
            className="space-y-2 rounded-xl border border-concrete-200 bg-white p-3 shadow-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company event / holiday</p>
            <TextInput
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thanksgiving"
              className="!py-1.5 !text-xs"
            />
            <div className="flex items-center gap-1.5">
              <TextInput
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="!py-1.5 !text-xs"
              />
              <span className="text-slate-300">–</span>
              <TextInput
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
                className="!py-1.5 !text-xs"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!name.trim() || !start}
              className="w-full rounded-full bg-vend-black px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Add
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function OOORow({
  team,
  pxPerDay,
  rangeStart,
  ownerFilter,
  labelWidth,
  onUpdateTimeOff,
  onRemoveTimeOff,
  companyEvents = [],
  onAddCompanyEvent,
  onUpdateCompanyEvent,
  onRemoveCompanyEvent,
}) {
  const { placed, laneCount } = useMemo(() => {
    const entries = [];
    team.forEach((member) => {
      (member.timeOff || []).forEach((t) => {
        entries.push({
          kind: "timeoff",
          id: t.id,
          memberId: member.id,
          start: t.start,
          end: t.end,
          reason: t.reason || "",
          startDay: diffDays(rangeStart, parseDate(t.start)),
          endDay: diffDays(rangeStart, parseDate(t.end)),
          color: member.color,
          initials: member.initials,
          name: member.name,
        });
      });
    });
    companyEvents.forEach((e) => {
      entries.push({
        kind: "event",
        id: e.id,
        start: e.start,
        end: e.end,
        name: e.name,
        startDay: diffDays(rangeStart, parseDate(e.start)),
        endDay: diffDays(rangeStart, parseDate(e.end)),
      });
    });
    entries.sort((a, b) => a.startDay - b.startDay);
    return assignLanes(entries);
  }, [team, companyEvents, rangeStart]);

  const rowHeight = placed.length === 0 ? 44 : laneCount * LANE_HEIGHT + ROW_PADDING * 2;

  return (
    <div className="flex border-b-2 border-concrete-200 bg-concrete-100/30" style={{ height: rowHeight }}>
      <div
        className="sticky left-0 z-[45] flex shrink-0 items-center gap-2 border-r border-concrete-200 bg-concrete-100/30 px-4"
        style={{ width: labelWidth }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Out of office</span>
        {onAddCompanyEvent && <AddCompanyEventButton onAdd={onAddCompanyEvent} />}
      </div>
      <div className="relative flex-1">
        {placed.length === 0 && (
          <p className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-300">
            Nobody's time off is on the books — add some under Manage team.
          </p>
        )}
        {placed.map((entry) =>
          entry.kind === "event" ? (
            <CompanyEventBar
              key={entry.id}
              entry={entry}
              pxPerDay={pxPerDay}
              onUpdate={(patch) => onUpdateCompanyEvent(entry.id, patch)}
              onRemove={() => onRemoveCompanyEvent(entry.id)}
            />
          ) : (
            <TimeOffBar
              key={entry.id}
              entry={entry}
              pxPerDay={pxPerDay}
              dimmed={!!ownerFilter && ownerFilter !== entry.memberId}
              onUpdate={(patch) => onUpdateTimeOff(entry.memberId, entry.id, patch)}
              onRemove={() => onRemoveTimeOff(entry.memberId, entry.id)}
            />
          )
        )}
      </div>
    </div>
  );
}
