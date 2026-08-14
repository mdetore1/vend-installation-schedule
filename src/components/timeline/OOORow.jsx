import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Flag, Plus, Trash2, X } from "lucide-react";
import { TextInput } from "../fields";
import { diffDays, formatShort, parseDate } from "../../lib/dateUtils";
import { useAnchoredPosition, useCenteredTooltipPosition } from "../../lib/useAnchoredPosition";

const LANE_HEIGHT = 24;
const ROW_PADDING = 5;
const POPOVER_WIDTH = 300;
const POPOVER_HEIGHT = 150;
const EVENT_POPOVER_HEIGHT = 180;
const ADD_POPOVER_WIDTH = 300;
const ADD_POPOVER_HEIGHT = 190;

// Greedy interval partitioning — each entry goes in the first lane whose
// last-placed entry doesn't overlap it, so simultaneous OOO/events for
// different people (or the whole company) stack instead of rendering on
// top of each other. Only actual date ranges count here — a narrow
// entry's label spilling outside its own bar (see externalLabel) is left
// to overlap the next bar rather than reserving it a whole extra lane;
// CompanyEventBar boosts its own z-index in that case so the label/icon
// still stays legible on top instead of getting buried.
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

  // Local, immediately-responsive copies — typing shouldn't feel gated on a
  // database round-trip. Committed on blur/change; re-synced from the real
  // value if it changes from outside (e.g. someone else edited it, or the
  // save failed and the field needs to reflect what's actually saved).
  const [reason, setReason] = useState(entry.reason || "");
  const [start, setStart] = useState(entry.start);
  const [end, setEnd] = useState(entry.end);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncing local edit buffers when the source value changes externally, not a data fetch
  useEffect(() => setReason(entry.reason || ""), [entry.reason]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- same as above
  useEffect(() => setStart(entry.start), [entry.start]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- same as above
  useEffect(() => setEnd(entry.end), [entry.end]);

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
        height: LANE_HEIGHT - 4,
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
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => reason !== (entry.reason || "") && onUpdate({ reason })}
                placeholder="Reason (e.g. Vacation, Conference)"
                className="!py-1.5 !text-xs"
              />
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="date"
                  value={start}
                  max={end}
                  onChange={(e) => setStart(e.target.value)}
                  onBlur={() => start !== entry.start && onUpdate({ start })}
                  className="min-w-0 flex-1 !py-1.5 !text-xs"
                />
                <span className="shrink-0 text-slate-300">–</span>
                <TextInput
                  type="date"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                  onBlur={() => end !== entry.end && onUpdate({ end })}
                  className="min-w-0 flex-1 !py-1.5 !text-xs"
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

function CompanyEventBar({ entry, pxPerDay, onUpdate, onRemove, labelLayer }) {
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const barRef = useRef(null);
  const popoverRef = useRef(null);
  const pos = useAnchoredPosition(open, barRef, { width: POPOVER_WIDTH, height: EVENT_POPOVER_HEIGHT });
  const hoverPos = useCenteredTooltipPosition(hovering && !open, barRef, { width: 200, height: 50 });

  // Same local-buffer-then-commit pattern as TimeOffBar — typing shouldn't
  // feel gated on a database round-trip.
  const [name, setName] = useState(entry.name);
  const [start, setStart] = useState(entry.start);
  const [end, setEnd] = useState(entry.end);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncing local edit buffers when the source value changes externally, not a data fetch
  useEffect(() => setName(entry.name), [entry.name]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- same as above
  useEffect(() => setStart(entry.start), [entry.start]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- same as above
  useEffect(() => setEnd(entry.end), [entry.end]);

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
  // Too narrow for the name to read inside the bar — show it just outside
  // instead of letting it truncate down to a single letter.
  const externalLabel = width < 70;

  return (
    <div
      className="absolute"
      style={{
        left,
        width,
        top: ROW_PADDING + entry.lane * LANE_HEIGHT,
        height: LANE_HEIGHT - 4,
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
        className={`flex h-full w-full items-center gap-1 overflow-hidden rounded-md bg-vend-black text-xs font-semibold text-white shadow-sm ${
          externalLabel ? "justify-center px-1" : "px-2"
        }`}
      >
        <Flag size={11} className="shrink-0" />
        {!externalLabel && <span className="truncate">{entry.name}</span>}
      </button>
      {externalLabel &&
        labelLayer &&
        createPortal(
          // Portaled into a shared layer above every bar in this row (see
          // OOORow) instead of living inside this event's own z-indexed
          // wrapper — otherwise whichever event happens to render later
          // fully covers an earlier, overlapping one's label text. Mint on
          // top of another bar (rather than avoiding overlap altogether)
          // is the point: it should stay legible over anything beneath it.
          <span
            className="pointer-events-none absolute whitespace-nowrap text-xs font-bold text-mint"
            style={{ left: left + width + 6, top: "50%", transform: "translateY(-50%)" }}
          >
            {entry.name}
          </span>,
          labelLayer
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
              <p className="text-sm font-bold text-vend-black">Company event</p>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-300 hover:text-vend-black">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-2">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name !== entry.name && onUpdate({ name })}
                placeholder="e.g. Thanksgiving, Company offsite"
                className="!py-1.5 !text-xs"
              />
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="date"
                  value={start}
                  max={end}
                  onChange={(e) => setStart(e.target.value)}
                  onBlur={() => start !== entry.start && onUpdate({ start })}
                  className="min-w-0 flex-1 !py-1.5 !text-xs"
                />
                <span className="shrink-0 text-slate-300">–</span>
                <TextInput
                  type="date"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                  onBlur={() => end !== entry.end && onUpdate({ end })}
                  className="min-w-0 flex-1 !py-1.5 !text-xs"
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
                className="min-w-0 flex-1 !py-1.5 !text-xs"
              />
              <span className="shrink-0 text-slate-300">–</span>
              <TextInput
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
                className="min-w-0 flex-1 !py-1.5 !text-xs"
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
  // Company events get their own lane-packing pool, entirely separate from
  // personal time off — sharing one pool meant a short event's outside-the-
  // bar label (see externalLabel above) could visually collide with the
  // next unrelated person's bar landing in the same lane right after it.
  // Two independent rows means that can never happen.
  const { placed: companyPlaced, laneCount: companyLaneCount } = useMemo(() => {
    const entries = companyEvents
      .map((e) => ({
        kind: "event",
        id: e.id,
        start: e.start,
        end: e.end,
        name: e.name,
        startDay: diffDays(rangeStart, parseDate(e.start)),
        endDay: diffDays(rangeStart, parseDate(e.end)),
      }))
      .sort((a, b) => a.startDay - b.startDay);
    return assignLanes(entries);
  }, [companyEvents, rangeStart]);

  const { placed: personalPlaced, laneCount: personalLaneCount } = useMemo(() => {
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
    entries.sort((a, b) => a.startDay - b.startDay);
    return assignLanes(entries);
  }, [team, rangeStart]);

  const companyRowHeight = companyLaneCount * LANE_HEIGHT + ROW_PADDING * 2;
  const personalRowHeight = personalPlaced.length === 0 ? 34 : personalLaneCount * LANE_HEIGHT + ROW_PADDING * 2;
  const hasCompanyEvents = companyPlaced.length > 0;

  // Shared layer every company-event label portals into, so a later event's
  // opaque bar can never bury an earlier, overlapping one's label text —
  // same trick as the phase-bar labels on the main calendar.
  const [companyLabelLayer, setCompanyLabelLayer] = useState(null);

  return (
    <div className="flex flex-col border-b-2 border-concrete-200 bg-concrete-100/30">
      {hasCompanyEvents && (
        <div className="flex border-b border-concrete-200" style={{ height: companyRowHeight }}>
          <div
            className="sticky left-0 z-[45] flex shrink-0 items-center gap-2 border-r border-concrete-200 bg-concrete-100 px-4"
            style={{ width: labelWidth }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company Events/Holidays</span>
            {onAddCompanyEvent && <AddCompanyEventButton onAdd={onAddCompanyEvent} />}
          </div>
          <div className="relative flex-1">
            {companyPlaced.map((entry) => (
              <CompanyEventBar
                key={entry.id}
                entry={entry}
                pxPerDay={pxPerDay}
                onUpdate={(patch) => onUpdateCompanyEvent(entry.id, patch)}
                onRemove={() => onRemoveCompanyEvent(entry.id)}
                labelLayer={companyLabelLayer}
              />
            ))}
            <div ref={setCompanyLabelLayer} className="pointer-events-none absolute inset-0" style={{ zIndex: 35 }} />
          </div>
        </div>
      )}

      <div className="flex" style={{ height: personalRowHeight }}>
        <div
          className="sticky left-0 z-[45] flex shrink-0 items-center gap-2 border-r border-concrete-200 bg-concrete-100 px-4"
          style={{ width: labelWidth }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Out of office</span>
          {!hasCompanyEvents && onAddCompanyEvent && <AddCompanyEventButton onAdd={onAddCompanyEvent} />}
        </div>
        <div className="relative flex-1">
          {personalPlaced.length === 0 && (
            <p className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-300">
              Nobody's time off is on the books — add some under Manage team.
            </p>
          )}
          {personalPlaced.map((entry) => (
            <TimeOffBar
              key={entry.id}
              entry={entry}
              pxPerDay={pxPerDay}
              dimmed={!!ownerFilter && ownerFilter !== entry.memberId}
              onUpdate={(patch) => onUpdateTimeOff(entry.memberId, entry.id, patch)}
              onRemove={() => onRemoveTimeOff(entry.memberId, entry.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
