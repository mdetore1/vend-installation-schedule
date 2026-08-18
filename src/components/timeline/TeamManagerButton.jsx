import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings2 } from "lucide-react";
import TeamManager from "./TeamManager";
import { useAnchoredPosition } from "../../lib/useAnchoredPosition";

const MANAGE_WIDTH = 384;
const MANAGE_HEIGHT = 480;

export default function TeamManagerButton({
  team,
  onAddTeammate,
  onUpdateTeammate,
  onRemoveTeammate,
  onReorderTeam,
  onAddTimeOff,
  onRemoveTimeOff,
}) {
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

  return (
    <>
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
    </>
  );
}
