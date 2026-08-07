import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Reorder, useDragControls } from "framer-motion";
import { Check, GripVertical, Palette, Plus, Trash2, X } from "lucide-react";
import { TextInput } from "../fields";
import { OWNER_PALETTE, contrastText, formatShort, initialsOf, parseDate } from "../../lib/dateUtils";
import { useAnchoredPosition } from "../../lib/useAnchoredPosition";

const isPreset = (bg) => OWNER_PALETTE.some((c) => c.bg.toLowerCase() === bg.toLowerCase());

const SWATCH_PANEL_WIDTH = 176;
const SWATCH_PANEL_HEIGHT = 100;

function ColorPicker({ member, onPick }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const pos = useAnchoredPosition(open, btnRef, {
    width: SWATCH_PANEL_WIDTH,
    height: SWATCH_PANEL_HEIGHT,
  });

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-7 rounded-full ring-2 ring-white transition hover:scale-105"
        style={{ backgroundColor: member.color.bg }}
        aria-label="Change color"
      />
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: SWATCH_PANEL_WIDTH, zIndex: 200 }}
            className="grid grid-cols-5 gap-1.5 rounded-lg border border-concrete-200 bg-white p-2 shadow-lg"
          >
            {OWNER_PALETTE.map((c) => (
              <button
                key={c.bg}
                type="button"
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className={`h-6 w-6 rounded-full transition ${
                  member.color.bg === c.bg ? "ring-2 ring-vend-black ring-offset-1" : ""
                }`}
                style={{ backgroundColor: c.bg }}
                aria-label={c.bg}
              />
            ))}
            <label
              className={`relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed transition hover:border-vend-black hover:text-vend-black ${
                !isPreset(member.color.bg)
                  ? "border-vend-black text-vend-black ring-2 ring-vend-black ring-offset-1"
                  : "border-slate-300 text-slate-400"
              }`}
              title="Pick a custom color"
            >
              <Palette size={12} />
              <input
                type="color"
                value={member.color.bg}
                onChange={(e) => onPick({ bg: e.target.value, text: contrastText(e.target.value) })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>,
          document.body
        )}
    </div>
  );
}

const dateInputCls =
  "w-[118px] shrink-0 rounded-md border border-concrete-300 px-1.5 py-0.5 text-[11px] text-vend-black outline-none focus:border-vend-black";

function TimeOffEditor({ member, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  function submit() {
    if (!start) return;
    onAdd(member.id, { start, end: end && end >= start ? end : start });
    setStart("");
    setEnd("");
    setAdding(false);
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-9">
      {(member.timeOff || []).map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full bg-concrete-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
        >
          {formatShort(parseDate(t.start))}
          {t.end !== t.start && <>–{formatShort(parseDate(t.end))}</>}
          <button
            type="button"
            onClick={() => onRemove(member.id, t.id)}
            className="text-slate-400 transition hover:text-alert-600"
            aria-label="Remove time off"
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {adding ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={dateInputCls} />
          <span className="shrink-0 text-slate-300">–</span>
          <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={dateInputCls} />
          <button
            type="button"
            onClick={submit}
            className="shrink-0 text-go-700 transition hover:text-go"
            aria-label="Save time off"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="shrink-0 text-slate-300 transition hover:text-alert-600"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-concrete-300 px-2 py-0.5 text-[11px] font-semibold text-slate-400 transition hover:border-vend-black hover:text-vend-black"
        >
          <Plus size={10} /> Time off
        </button>
      )}
    </div>
  );
}

function TeamRow({ member, onUpdate, onRemove, onAddTimeOff, onRemoveTimeOff }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={member}
      dragListener={false}
      dragControls={controls}
      className="rounded-xl border border-concrete-200 bg-white p-2.5"
    >
      <div className="flex items-center gap-2.5">
        <span
          onPointerDown={(e) => controls.start(e)}
          className="shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500"
        >
          <GripVertical size={16} />
        </span>
        <ColorPicker member={member} onPick={(color) => onUpdate(member.id, { color })} />
        <input
          value={member.name}
          onChange={(e) => onUpdate(member.id, { name: e.target.value, initials: initialsOf(e.target.value) })}
          className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-vend-black outline-none transition focus:border-concrete-300 focus:bg-concrete-100/50"
        />
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          className="shrink-0 text-slate-300 transition hover:text-alert-600"
          aria-label="Remove teammate"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <TimeOffEditor member={member} onAdd={onAddTimeOff} onRemove={onRemoveTimeOff} />
    </Reorder.Item>
  );
}

export default function TeamManager({ team, onUpdate, onRemove, onReorder, onAdd, onAddTimeOff, onRemoveTimeOff }) {
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setName("");
  }

  return (
    <div className="w-96 rounded-2xl border border-concrete-200 bg-white p-3 shadow-xl">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Team — drag to reorder
      </p>
      <Reorder.Group axis="y" values={team} onReorder={onReorder} className="max-h-80 space-y-2 overflow-y-auto">
        {team.map((member) => (
          <TeamRow
            key={member.id}
            member={member}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onAddTimeOff={onAddTimeOff}
            onRemoveTimeOff={onRemoveTimeOff}
          />
        ))}
      </Reorder.Group>
      <div className="mt-3 flex items-center gap-2 border-t border-concrete-200 pt-3">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add teammate…"
          className="flex-1"
        />
        <button
          type="button"
          onClick={submit}
          className="shrink-0 rounded-full bg-vend-black p-2 text-white transition hover:opacity-90"
          aria-label="Add teammate"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
