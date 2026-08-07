import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import { TextInput } from "../fields";
import { diffDays, formatShort, parseDate } from "../../lib/dateUtils";
import { useAnchoredPosition } from "../../lib/useAnchoredPosition";

const LANE_HEIGHT = 30;
const ROW_PADDING = 8;
const POPOVER_WIDTH = 220;
const POPOVER_HEIGHT = 150;

// Greedy interval partitioning — each time-off entry goes in the first lane
// whose last-placed entry doesn't overlap it, so simultaneous OOO periods
// for different people stack instead of rendering on top of each other.
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
      {hovering && !open && (
        <div className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-vend-black px-2.5 py-1.5 text-xs text-white shadow-lg">
          <div className="font-bold">
            {entry.name} — Out of office{" "}
            <span className="font-normal text-white/70">
              ({entry.endDay - entry.startDay + 1} day{entry.endDay === entry.startDay ? "" : "s"})
            </span>
          </div>
          <div className="text-white/70">
            {formatShort(parseDate(entry.start))} → {formatShort(parseDate(entry.end))}
          </div>
        </div>
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
        <span className="truncate">{compact ? entry.initials : `${entry.initials} OOO`}</span>
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

export default function OOORow({ team, pxPerDay, rangeStart, ownerFilter, labelWidth, onUpdateTimeOff, onRemoveTimeOff }) {
  const { placed, laneCount } = useMemo(() => {
    const entries = [];
    team.forEach((member) => {
      (member.timeOff || []).forEach((t) => {
        entries.push({
          id: t.id,
          memberId: member.id,
          start: t.start,
          end: t.end,
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

  const rowHeight = placed.length === 0 ? 44 : laneCount * LANE_HEIGHT + ROW_PADDING * 2;

  return (
    <div className="flex border-b-2 border-concrete-200 bg-concrete-100/30" style={{ height: rowHeight }}>
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-concrete-200 bg-concrete-100/30 px-4"
        style={{ width: labelWidth }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Out of office</span>
      </div>
      <div className="relative flex-1">
        {placed.length === 0 && (
          <p className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-300">
            Nobody's time off is on the books — add some under Manage team.
          </p>
        )}
        {placed.map((entry) => (
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
  );
}
