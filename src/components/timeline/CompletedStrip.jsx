import { useEffect, useMemo, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { addDays, parseDate, startOfMonth } from "../../lib/dateUtils";
import TimelineGrid from "./TimelineGrid";

export default function CompletedStrip({
  locations,
  team,
  open,
  onToggle,
  onRestore,
  pxPerDay,
  onUpdatePhase,
  onDeletePhase,
  onDeleteLocation,
  onEditLocation,
  onShiftPhases,
  labelWidth,
  onResizeLabelWidth,
}) {
  const { rangeStart, rangeEnd } = useMemo(() => {
    const all = locations.flatMap((l) => l.phases);
    if (!all.length) {
      const start = startOfMonth(new Date());
      return { rangeStart: start, rangeEnd: addDays(start, 120) };
    }
    const starts = all.map((p) => parseDate(p.start).getTime());
    const ends = all.map((p) => parseDate(p.end).getTime());
    return {
      rangeStart: startOfMonth(addDays(new Date(Math.min(...starts)), -10)),
      rangeEnd: addDays(new Date(Math.max(...ends)), 21),
    };
  }, [locations]);

  // Opening the strip jumps the horizontal scroll to the most recent dates
  // (the right edge) instead of leaving it at the earliest completed work.
  const scrollRef = useRef(null);
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [open]);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-concrete-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-beacon-700 px-5 py-3 text-left text-white transition hover:bg-beacon-700/90"
      >
        <span className="text-sm font-semibold">
          Completed <span className="opacity-80">({locations.length})</span>
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div ref={scrollRef} className="scrollx overflow-auto bg-white" style={{ maxHeight: "calc(100vh - 300px)" }}>
            <TimelineGrid
              locations={locations}
              team={team}
              pxPerDay={pxPerDay}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onUpdatePhase={onUpdatePhase}
              onDeletePhase={onDeletePhase}
              onArchive={onRestore}
              onDeleteLocation={onDeleteLocation}
              onEditLocation={onEditLocation}
              onShiftPhases={onShiftPhases}
              showOOO={false}
              showBlankRows={false}
              restoreMode
              sortable={false}
              labelWidth={labelWidth}
              onResizeLabelWidth={onResizeLabelWidth}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
