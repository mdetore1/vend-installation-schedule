import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, HardHat } from "lucide-react";
import { useAnchoredPosition } from "../../lib/useAnchoredPosition";

const FILTER_WIDTH = 220;

// Unlike the Team filter (which just dims non-matching phase bars), this
// hides non-matching locations from the calendar entirely — built so a
// screenshot for one contractor never shows any other contractor's sites,
// even dimmed.
export default function ContractorFilter({ contractors, filter, onFilterChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const pos = useAnchoredPosition(open, btnRef, { width: FILTER_WIDTH, height: 72 + contractors.length * 40 });

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [open]);

  function pick(value) {
    onFilterChange(filter === value ? null : value);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-3 text-sm font-semibold transition ${
          filter || open
            ? "border-vend-black bg-concrete-100 text-vend-black"
            : "border-concrete-200 bg-white text-slate-500 hover:border-slate-300"
        }`}
      >
        <HardHat size={15} className="shrink-0 text-slate-400" />
        <span>{filter || "Filter"}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: FILTER_WIDTH, zIndex: 100 }}
            className="rounded-2xl border border-concrete-200 bg-white p-2 shadow-xl"
          >
            <p className="mb-1 px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Show only this contractor
            </p>
            <div className="space-y-0.5">
              {contractors.map((c) => {
                const active = filter === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pick(c)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition ${
                      active ? "bg-concrete-100 text-vend-black" : "text-slate-600 hover:bg-concrete-100/60"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{c}</span>
                    {active && <Check size={15} className="shrink-0 text-vend-black" />}
                  </button>
                );
              })}
            </div>
            {filter && (
              <button
                type="button"
                onClick={() => {
                  onFilterChange(null);
                  setOpen(false);
                }}
                className="mt-1 w-full rounded-lg border-t border-concrete-200 px-2 pt-2 text-left text-xs font-semibold text-slate-400 hover:text-vend-black"
              >
                Show every contractor
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
