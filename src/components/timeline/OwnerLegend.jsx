import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Settings2, UserX, Users } from "lucide-react";
import TeamManager from "./TeamManager";
import { useAnchoredPosition } from "../../lib/useAnchoredPosition";
import { UNASSIGNED } from "../../lib/dateUtils";

const FILTER_WIDTH = 240;
const MANAGE_WIDTH = 384;
const MANAGE_HEIGHT = 480;

export default function OwnerLegend({
  team,
  filter,
  onFilterChange,
  onAddTeammate,
  onUpdateTeammate,
  onRemoveTeammate,
  onReorderTeam,
  onAddTimeOff,
  onRemoveTimeOff,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterBtnRef = useRef(null);
  const filterPanelRef = useRef(null);

  const filterPos = useAnchoredPosition(filterOpen, filterBtnRef, {
    width: FILTER_WIDTH,
    height: 72 + (team.length + 1) * 40,
  });

  useEffect(() => {
    if (!filterOpen) return;
    const onDocDown = (e) => {
      if (filterBtnRef.current?.contains(e.target) || filterPanelRef.current?.contains(e.target)) return;
      setFilterOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [filterOpen]);

  const [managerOpen, setManagerOpen] = useState(false);
  const manageBtnRef = useRef(null);
  const managePanelRef = useRef(null);

  const managePos = useAnchoredPosition(managerOpen, manageBtnRef, {
    width: MANAGE_WIDTH,
    height: MANAGE_HEIGHT,
  });

  useEffect(() => {
    if (!managerOpen) return;
    const onDocDown = (e) => {
      if (manageBtnRef.current?.contains(e.target) || managePanelRef.current?.contains(e.target)) return;
      setManagerOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [managerOpen]);

  const activeMember = filter && filter !== UNASSIGNED ? team.find((t) => t.id === filter) : null;
  const isUnassignedFilter = filter === UNASSIGNED;

  function pick(value) {
    onFilterChange(filter === value ? null : value);
    setFilterOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        ref={filterBtnRef}
        type="button"
        onClick={() => setFilterOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-sm font-semibold transition ${
          filter || filterOpen
            ? "border-vend-black bg-concrete-100 text-vend-black"
            : "border-concrete-200 bg-white text-slate-500 hover:border-slate-300"
        }`}
      >
        {activeMember ? (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ backgroundColor: activeMember.color.bg, color: activeMember.color.text }}
          >
            {activeMember.initials}
          </span>
        ) : isUnassignedFilter ? (
          <UserX size={16} className="shrink-0" />
        ) : (
          <Users size={16} className="shrink-0 text-slate-400" />
        )}
        <span>{activeMember ? activeMember.name : isUnassignedFilter ? "Unassigned" : "Team"}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
      </button>

      {filterOpen &&
        filterPos &&
        createPortal(
          <div
            ref={filterPanelRef}
            style={{ position: "fixed", top: filterPos.top, left: filterPos.left, width: FILTER_WIDTH, zIndex: 100 }}
            className="rounded-2xl border border-concrete-200 bg-white p-2 shadow-xl"
          >
            <p className="mb-1 px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Filter by owner
            </p>
            <div className="space-y-0.5">
              {team.map((t) => {
                const active = filter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pick(t.id)}
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
                onClick={() => pick(UNASSIGNED)}
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
            {filter && (
              <button
                type="button"
                onClick={() => {
                  onFilterChange(null);
                  setFilterOpen(false);
                }}
                className="mt-1 w-full rounded-lg border-t border-concrete-200 px-2 pt-2 text-left text-xs font-semibold text-slate-400 hover:text-vend-black"
              >
                Show everyone
              </button>
            )}
          </div>,
          document.body
        )}

      <button
        ref={manageBtnRef}
        type="button"
        onClick={() => setManagerOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
          managerOpen
            ? "border-vend-black bg-vend-black text-white"
            : "border-dashed border-concrete-300 text-slate-400 hover:border-vend-black hover:text-vend-black"
        }`}
      >
        <Settings2 size={14} /> Manage team
      </button>

      {managerOpen &&
        managePos &&
        createPortal(
          <div ref={managePanelRef} style={{ position: "fixed", top: managePos.top, left: managePos.left, zIndex: 100 }}>
            <TeamManager
              team={team}
              onUpdate={onUpdateTeammate}
              onRemove={onRemoveTeammate}
              onReorder={onReorderTeam}
              onAdd={onAddTeammate}
              onAddTimeOff={onAddTimeOff}
              onRemoveTimeOff={onRemoveTimeOff}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
