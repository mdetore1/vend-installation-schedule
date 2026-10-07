import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Layers, MapPin, Minus, Search } from "lucide-react";
import { useAnchoredPosition } from "../../lib/useAnchoredPosition";

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 440;

// Pick exactly which locations (or whole groups) the calendar shows —
// everything else is hidden, so you can screen-share a customer's dates
// without their neighbors' on screen. Picking a group toggles all of its
// garages at once; individual garages can still be added or removed after.
export default function LocationPicker({ locations, groups, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const pos = useAnchoredPosition(open, btnRef, { width: PANEL_WIDTH, height: PANEL_HEIGHT });

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [open]);

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations]
  );
  const groupEntries = useMemo(
    () =>
      groups
        .map((g) => ({ group: g, members: locations.filter((l) => g.memberNames.includes(l.name)) }))
        .filter((e) => e.members.length > 0)
        .sort((a, b) => a.group.name.localeCompare(b.group.name)),
    [groups, locations]
  );

  const q = query.trim().toLowerCase();
  const visibleGroups = groupEntries.filter((e) => !q || e.group.name.toLowerCase().includes(q));
  const visibleLocations = sortedLocations.filter(
    (l) => !q || l.name.toLowerCase().includes(q) || (l.place || "").toLowerCase().includes(q)
  );

  function toggleLocation(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function toggleGroup(members) {
    const next = new Set(selectedIds);
    const allSelected = members.every((l) => next.has(l.id));
    members.forEach((l) => (allSelected ? next.delete(l.id) : next.add(l.id)));
    onChange(next);
  }

  const count = selectedIds.size;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border py-1 pl-2.5 pr-3 text-sm font-semibold transition ${
          count || open
            ? "border-vend-black bg-concrete-100 text-vend-black"
            : "border-concrete-200 bg-white text-slate-500 hover:border-slate-300"
        }`}
      >
        <MapPin size={15} className="shrink-0 text-slate-400" />
        <span>{count ? `${count} location${count === 1 ? "" : "s"}` : "Locations"}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH, zIndex: 100 }}
            className="flex max-h-[70vh] flex-col rounded-2xl border border-concrete-200 bg-white p-2 shadow-xl"
          >
            <div className="relative mb-2">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search locations or groups…"
                className="w-full rounded-lg border border-concrete-200 bg-white py-1.5 pl-8 pr-2 text-sm text-vend-black outline-none transition placeholder:text-slate-300 focus:border-vend-black"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {visibleGroups.length > 0 && (
                <>
                  <p className="mb-1 flex items-center gap-1.5 px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <Layers size={12} /> Groups
                  </p>
                  <div className="space-y-0.5">
                    {visibleGroups.map(({ group, members }) => {
                      const selectedCount = members.filter((l) => selectedIds.has(l.id)).length;
                      const all = selectedCount === members.length;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => toggleGroup(members)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-vend-black transition hover:bg-concrete-100/60"
                        >
                          <PickBox state={all ? "all" : selectedCount ? "some" : "none"} />
                          <span className="min-w-0 flex-1 truncate">{group.name}</span>
                          <span className="shrink-0 text-xs text-slate-400">{members.length}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="mb-1 mt-3 flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <MapPin size={12} /> Locations
              </p>
              <div className="space-y-0.5">
                {visibleLocations.length === 0 && <p className="px-2 py-1 text-xs text-slate-300">No matches.</p>}
                {visibleLocations.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLocation(l.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-vend-black transition hover:bg-concrete-100/60"
                  >
                    <PickBox state={selectedIds.has(l.id) ? "all" : "none"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{l.name}</span>
                      <span className="block truncate text-xs font-normal text-slate-400">
                        {l.place || "No city yet"}
                        {l.archived ? " · Launched" : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="mt-2 w-full rounded-lg border-t border-concrete-200 px-2 pt-2 text-left text-xs font-semibold text-slate-400 hover:text-vend-black"
              >
                Clear — show all locations
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

function PickBox({ state }) {
  const on = state !== "none";
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
        on ? "border-vend-black bg-vend-black text-white" : "border-concrete-300 bg-white"
      }`}
    >
      {state === "all" && <Check size={14} />}
      {state === "some" && <Minus size={14} />}
    </span>
  );
}
