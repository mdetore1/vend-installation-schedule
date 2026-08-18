import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Filter, HardHat, UserX, Users, Zap } from "lucide-react";
import { useAnchoredPosition } from "../../lib/useAnchoredPosition";
import { UNASSIGNED } from "../../lib/dateUtils";
import { TEAM_DEPARTMENTS, DEFAULT_DEPARTMENT } from "../../lib/locationDefaults";

const PANEL_WIDTH = 260;

// One combined filter button covering every way to narrow the calendar down
// (team member, contractor, onsite staff) — replaces the old separate Team
// and Contractor filter buttons. Picking any option hides non-matching
// locations entirely rather than dimming their phase bars, so the view is
// a clean subset instead of a full board with some things faded out.
export default function LocationFilter({ team, contractors, filter, onFilterChange }) {
  const [open, setOpen] = useState(false);
  const [dept, setDept] = useState(DEFAULT_DEPARTMENT);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const estimatedHeight = Math.min(460, 220 + (team.length + 1) * 36 + contractors.length * 36);
  const pos = useAnchoredPosition(open, btnRef, { width: PANEL_WIDTH, height: estimatedHeight });

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [open]);

  function pick(next) {
    const same = filter && filter.type === next.type && filter.value === next.value;
    onFilterChange(same ? null : next);
    setOpen(false);
  }

  const activeMember =
    filter?.type === "owner" && filter.value !== UNASSIGNED ? team.find((t) => t.id === filter.value) : null;
  const isUnassignedFilter = filter?.type === "owner" && filter.value === UNASSIGNED;
  const activeContractor = filter?.type === "contractor" ? filter.value : null;
  const isOnsiteFilter = filter?.type === "onsite";

  let label = "Filter";
  let icon = <Filter size={15} className="shrink-0 text-slate-400" />;
  if (activeMember) {
    label = activeMember.name;
    icon = (
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ backgroundColor: activeMember.color.bg, color: activeMember.color.text }}
      >
        {activeMember.initials}
      </span>
    );
  } else if (isUnassignedFilter) {
    label = "Unassigned";
    icon = <UserX size={15} className="shrink-0" />;
  } else if (activeContractor) {
    label = activeContractor;
    icon = <HardHat size={15} className="shrink-0 text-slate-400" />;
  } else if (isOnsiteFilter) {
    label = "Onsite staff";
    icon = <Zap size={15} className="shrink-0 text-mint-700" />;
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-sm font-semibold transition ${
          filter || open
            ? "border-vend-black bg-concrete-100 text-vend-black"
            : "border-concrete-200 bg-white text-slate-500 hover:border-slate-300"
        }`}
      >
        {icon}
        <span>{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH, zIndex: 100 }}
            className="max-h-[70vh] overflow-y-auto rounded-2xl border border-concrete-200 bg-white p-2 shadow-xl"
          >
            <p className="mb-1 flex items-center gap-1.5 px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Users size={12} /> Team member
            </p>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="mb-1 w-full rounded-lg border border-concrete-200 px-2 py-1 text-xs font-semibold text-vend-black outline-none transition focus:border-vend-black"
            >
              {TEAM_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div className="space-y-0.5">
              {team.filter((t) => (t.department || DEFAULT_DEPARTMENT) === dept).length === 0 && (
                <p className="px-2 py-1 text-xs text-slate-300">Nobody here yet.</p>
              )}
              {team
                .filter((t) => (t.department || DEFAULT_DEPARTMENT) === dept)
                .map((t) => {
                  const active = filter?.type === "owner" && filter.value === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pick({ type: "owner", value: t.id })}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition ${
                        active ? "bg-concrete-100 text-vend-black" : "text-slate-600 hover:bg-concrete-100/60"
                      }`}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                        style={{ backgroundColor: t.color.bg, color: t.color.text }}
                      >
                        {t.initials}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{t.name}</span>
                      {active && <Check size={15} className="shrink-0 text-vend-black" />}
                    </button>
                  );
                })}
              <button
                type="button"
                onClick={() => pick({ type: "owner", value: UNASSIGNED })}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition ${
                  isUnassignedFilter ? "bg-concrete-100 text-vend-black" : "text-slate-500 hover:bg-concrete-100/60"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300">
                  <UserX size={12} />
                </span>
                <span className="min-w-0 flex-1 truncate">Unassigned</span>
                {isUnassignedFilter && <Check size={15} className="shrink-0 text-vend-black" />}
              </button>
            </div>

            <p className="mb-1 mt-3 flex items-center gap-1.5 border-t border-concrete-200 px-2 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <HardHat size={12} /> Contractor
            </p>
            <div className="space-y-0.5">
              {contractors.map((c) => {
                const active = filter?.type === "contractor" && filter.value === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pick({ type: "contractor", value: c })}
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

            <p className="mb-1 mt-3 flex items-center gap-1.5 border-t border-concrete-200 px-2 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Zap size={12} /> Onsite staff
            </p>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => pick({ type: "onsite", value: true })}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition ${
                  isOnsiteFilter ? "bg-concrete-100 text-vend-black" : "text-slate-600 hover:bg-concrete-100/60"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint-200 text-mint-700">
                  <Zap size={12} />
                </span>
                <span className="min-w-0 flex-1 truncate">Has onsite staff (Spark)</span>
                {isOnsiteFilter && <Check size={15} className="shrink-0 text-vend-black" />}
              </button>
            </div>

            {filter && (
              <button
                type="button"
                onClick={() => {
                  onFilterChange(null);
                  setOpen(false);
                }}
                className="mt-2 w-full rounded-lg border-t border-concrete-200 px-2 pt-2 text-left text-xs font-semibold text-slate-400 hover:text-vend-black"
              >
                Show everyone
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
