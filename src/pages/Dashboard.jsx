import { useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Reorder, useDragControls } from "framer-motion";
import { Calendar, Check, CheckCheck, ChevronDown, ChevronRight, ExternalLink, GripVertical, Layers, ListChecks, Paperclip, PauseCircle, Pencil, Plus, Rocket, Trash2, X } from "lucide-react";
import { useScheduleStore } from "../lib/scheduleStore";
import { useMapStore } from "../lib/mapStore";
import { uploadAttachment } from "../lib/attachments";
import { canonPhaseLabel, formatDateRange, UNASSIGNED, calendarPhaseHighlight, latestScheduleDate } from "../lib/dateUtils";
import { STAGES, STAGE_STYLES, stageByNumber, summarizeChecklist, effectiveStage } from "../lib/checklistUtils";
import { Checkbox, Field, Select, TextInput, Textarea } from "../components/fields";
import ManageTemplateModal from "../components/ManageTemplateModal";

function markAllDone(items, onUpdate) {
  items.filter((i) => !i.done).forEach((i) => onUpdate(i.itemId, { done: true }));
}

// Bare URLs typed into instructions/notes (as opposed to real reference
// links, captured separately as item.referenceLinks) still deserve to be
// clickable — split on them and wrap only the matched pieces.
const URL_RE = /(https?:\/\/[^\s]+)/g;
function linkify(text) {
  if (!text) return null;
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-beacon-700 underline hover:text-beacon-600"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

function LinkChips({ links, onRemove }) {
  if (!links?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {links.map((l, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-beacon-100 px-2 py-0.5 text-[11px] font-semibold text-beacon-700"
        >
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {l.label || l.url}
          </a>
          <button type="button" onClick={() => onRemove(i)} aria-label="Remove link" className="text-beacon-700/60 hover:text-beacon-700">
            <X size={10} />
          </button>
        </span>
      ))}
    </div>
  );
}

function AddLinkControl({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-vend-black"
      >
        <Plus size={11} /> Add link
      </button>
    );
  }

  const submit = () => {
    if (!url.trim()) return;
    onAdd({ label: label.trim(), url: url.trim() });
    setLabel("");
    setUrl("");
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <TextInput autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="w-32" />
      <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="min-w-[160px] flex-1" />
      <button
        type="button"
        onClick={submit}
        disabled={!url.trim()}
        className="rounded-full bg-vend-black px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
      >
        Add
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-vend-black">
        Cancel
      </button>
    </div>
  );
}

function AddAttachmentControl({ onAdd }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const publicUrl = await uploadAttachment(file);
      onAdd({ label: file.name, url: publicUrl });
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" onChange={handleFile} className="hidden" />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-vend-black disabled:opacity-40"
      >
        <Paperclip size={11} /> {uploading ? "Uploading…" : "Add attachment"}
      </button>
      {error && <p className="mt-1 text-[11px] font-semibold text-alert-600">{error}</p>}
    </div>
  );
}

function ProgressBar({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-concrete-200">
        <div className="h-full rounded-full bg-mint-600 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-semibold text-slate-500">{pct}%</span>
    </div>
  );
}

// The stage pill doubles as an editable control — a manual override is a
// floor, not a permanent pin (see effectiveStage), so this keeps following
// automation on its own once real progress catches up. Not nested inside
// the row's own toggle button (that would be invalid HTML and would also
// toggle the row open/closed on every stage change), so callers place this
// as a sibling of the toggle button, not inside it.
function StageControl({ checklist, override, forceComplete, onSetStage }) {
  const stageNum = forceComplete ? null : effectiveStage(checklist, override);
  if (!stageNum) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-go-100 px-2.5 py-1 text-xs font-semibold text-go-700">
        <Check size={12} /> Complete
      </span>
    );
  }
  const stage = stageByNumber(stageNum);
  const styles = STAGE_STYLES[stage.color];
  return (
    <div className="relative shrink-0">
      <select
        value={stageNum}
        onChange={(e) => onSetStage(Number(e.target.value))}
        title="Move to a different stage"
        className={`cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-6 text-xs font-semibold outline-none ${styles.badge}`}
      >
        {STAGES.map((s) => (
          <option key={s.n} value={s.n}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown size={10} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60" />
    </div>
  );
}

// canvas-confetti's own "fireworks" recipe — repeated bursts from random
// spots near the bottom corners over a few seconds, rather than one single
// pop, so it actually reads as fireworks going off.
const CONFETTI_COLORS = ["#14d5a3", "#3e8bff", "#00ffe0", "#ffc24b"];
function fireFireworks() {
  const duration = 2500;
  const animationEnd = Date.now() + duration;
  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }
    const particleCount = 50 * (timeLeft / duration);
    confetti({
      particleCount,
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: CONFETTI_COLORS,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      particleCount,
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: CONFETTI_COLORS,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

// Outlined and quiet at any other progress — once every task is actually
// checked off, this is the one thing left to do, so it fills in solid to
// make that obvious instead of staying identical the whole time.
function MarkCompleteButton({ onClick, ready }) {
  return (
    <button
      type="button"
      onClick={() => {
        fireFireworks();
        onClick();
      }}
      title="Check everything off and move to Launched Locations"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
        ready
          ? "border-go-600 bg-go-600 text-white shadow-sm hover:bg-go-700"
          : "border-go-600/40 text-go-700 hover:bg-go-100"
      }`}
    >
      <CheckCheck size={12} /> Complete
    </button>
  );
}

// Paused, like a phase with unconfirmed dates — same idea, just at the
// whole-location level instead of one phase bar.
// Rarely used, so the "put it on hold" action itself stays as quiet as
// possible (a bare icon, no border/pill) rather than sitting in the row as
// a peer to Stage/Complete — but the "On Hold" state, once set, still needs
// to read clearly at a glance, so that one stays a small solid badge.
function OnHoldControl({ onHold, onSetOnHold }) {
  if (onHold) {
    return (
      <button
        type="button"
        onClick={() => onSetOnHold(false)}
        title="Resume — clears the on-hold status"
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-caution-100 px-2 py-0.5 text-[10px] font-semibold text-caution-700 transition hover:bg-caution-200"
      >
        <PauseCircle size={10} /> On Hold
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSetOnHold(true)}
      title="Put on hold — client gone quiet, budget hold, etc."
      className="shrink-0 text-slate-300 transition hover:text-caution-600"
    >
      <PauseCircle size={15} />
    </button>
  );
}

function DatePill({ icon: Icon, label, start, end }) {
  if (!start) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-concrete-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
      <Icon size={11} className="text-slate-400" />
      {label} {formatDateRange(start, end)}
    </span>
  );
}

// Calendar-driven, not checklist-driven — on for the duration of whichever
// phase is currently active on the Installation Schedule, off again once
// Go Live has passed. Deliberately a different color language than the
// checklist stage badge so the two concepts don't get visually confused.
// caution-500/go-500 don't exist in this theme (only base/100/600/700 are
// defined) — using them silently produced an unstyled black border instead
// of the intended color. glow-pulse-* (index.css) adds an actual animated
// glow around the card, not just a static border.
function highlightBorderClass(highlight) {
  if (highlight === "install") return "border-beacon-600 glow-pulse-beacon";
  if (highlight === "golive") return "border-go-600 glow-pulse-go";
  return "";
}

function CalendarHighlightBadge({ highlight }) {
  if (!highlight) return null;
  const isInstall = highlight === "install";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        isInstall ? "bg-beacon-100 text-beacon-700" : "bg-go-100 text-go-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${isInstall ? "bg-beacon-600" : "bg-go-600"}`} />
      {isInstall ? "Installing now" : "Going live now"}
    </span>
  );
}

function AssigneeStrip({ team, ids }) {
  const members = ids.map((id) => team.find((t) => t.id === id)).filter(Boolean);
  if (!members.length) return <div className="w-16 shrink-0" />;
  return (
    <div className="flex w-16 shrink-0 -space-x-1.5">
      {members.slice(0, 4).map((m) => (
        <span
          key={m.id}
          title={m.name}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold"
          style={{ backgroundColor: m.color.bg, color: m.color.text }}
        >
          {m.initials}
        </span>
      ))}
    </div>
  );
}

function MarkAllButton({ items, onUpdate }) {
  if (!items.some((i) => !i.done)) return null;
  return (
    <button
      type="button"
      onClick={() => markAllDone(items, onUpdate)}
      title="Mark all as done"
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-white/70 hover:text-vend-black"
    >
      <CheckCheck size={13} /> Mark all
    </button>
  );
}

function ChecklistTaskRow({ item, team, onUpdate, onRemove, onEditNotes, reorderable }) {
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState(item.instructions || "");
  // Done tasks collapse by default (see below) — expanded lets you click
  // back into one to review or edit what's already checked off.
  const [expanded, setExpanded] = useState(false);
  const controls = useDragControls();

  const addLink = (link) => onUpdate(item.itemId, { links: [...(item.links || []), link] });
  const removeLink = (idx) => onUpdate(item.itemId, { links: item.links.filter((_, i) => i !== idx) });
  // Reference links and attachments live on the shared template (same as
  // instructions), so adding/removing either is a template edit — it
  // changes for every location.
  const removeReferenceLink = (idx) => onEditNotes({ referenceLinks: item.referenceLinks.filter((_, i) => i !== idx) });
  const addAttachment = (file) => onEditNotes({ attachments: [...(item.attachments || []), file] });
  const removeAttachment = (idx) => onEditNotes({ attachments: item.attachments.filter((_, i) => i !== idx) });

  function startEditingInstructions() {
    setInstructionsDraft(item.instructions || "");
    setEditingInstructions(true);
  }
  function saveInstructions() {
    onEditNotes({ notes: instructionsDraft.trim() });
    setEditingInstructions(false);
  }

  const removeButton = onRemove && (
    <button
      type="button"
      onClick={onRemove}
      title={
        item.locationId
          ? "Delete this task — it only exists at this location"
          : "Remove this task from this location only — other locations are unaffected"
      }
      aria-label="Remove task"
      className="rounded-full p-1 text-slate-300 transition hover:bg-alert-100 hover:text-alert-600"
    >
      <Trash2 size={14} />
    </button>
  );

  // Done tasks collapse to a single quiet line by default — once a
  // checklist is mostly checked off, expanding every finished task's
  // notes/links just buries what's still open underneath a wall of
  // scroll — but clicking one back open still shows everything.
  const rowContent = item.done && !expanded ? (
    <div className="flex items-center gap-3 rounded-2xl border border-concrete-200 bg-concrete-100/30 px-4 py-2.5">
      {reorderable && (
        <span
          onPointerDown={(e) => controls.start(e)}
          className="shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500"
        >
          <GripVertical size={14} />
        </span>
      )}
      <Checkbox checked={item.done} onChange={(v) => onUpdate(item.itemId, { done: v })} />
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-slate-400 line-through">{item.task}</span>
        <ChevronRight size={13} className="shrink-0 text-slate-300" />
      </button>
      {removeButton}
    </div>
  ) : (
    <div
      className={`rounded-2xl border border-concrete-200 px-4 py-4 transition ${item.done ? "bg-concrete-100/30" : "bg-white shadow-sm"}`}
    >
      <div className="flex items-start gap-3">
        {reorderable && (
          <span
            onPointerDown={(e) => controls.start(e)}
            className="mt-1 shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500"
          >
            <GripVertical size={14} />
          </span>
        )}
        <Checkbox checked={item.done} onChange={(v) => onUpdate(item.itemId, { done: v })} />
        <div className="min-w-0 flex-1">
          {item.done ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex w-full items-center gap-1.5 text-left"
              title="Collapse"
            >
              <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-slate-400 line-through">
                {item.task}
              </span>
              <ChevronDown size={13} className="shrink-0 text-slate-300" />
            </button>
          ) : (
            <span className="block font-display text-[15px] font-bold text-vend-black">{item.task}</span>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.timing && (
              <span className="shrink-0 rounded-full bg-concrete-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                {item.timing}
              </span>
            )}
            <Select
              value={item.assigneeId}
              onChange={(e) => onUpdate(item.itemId, { assigneeId: e.target.value })}
              options={[{ value: UNASSIGNED, label: "Unassigned" }, ...team.map((t) => ({ value: t.id, label: t.name }))]}
              className="!w-auto !rounded-full !border-0 !bg-beacon-100 !py-1 !pl-2.5 !pr-7 !text-[11px] !font-semibold !text-beacon-700"
            />
          </div>

          <div className="mt-3.5 rounded-xl bg-concrete-100/50 px-4 py-4">
            {editingInstructions ? (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  value={instructionsDraft}
                  onChange={(e) => setInstructionsDraft(e.target.value)}
                  placeholder="Notes for this task…"
                  className="!text-sm"
                  rows={8}
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingInstructions(false)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveInstructions}
                    className="rounded-full bg-vend-black px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`group/instructions relative rounded-lg ${onEditNotes ? "-m-1.5 cursor-text p-1.5 transition hover:bg-white/70" : ""}`}
                onClick={
                  onEditNotes
                    ? (e) => {
                        if (e.target.closest("a")) return;
                        startEditingInstructions();
                      }
                    : undefined
                }
                title={onEditNotes ? "Click to edit — updates this task's notes for every location" : undefined}
              >
                {item.instructions ? (
                  <p className="whitespace-pre-wrap pr-7 text-sm leading-relaxed text-slate-600">{linkify(item.instructions)}</p>
                ) : (
                  onEditNotes && <p className="pr-7 text-sm italic text-slate-300">No notes yet — click to add some.</p>
                )}
                {onEditNotes && (
                  <Pencil
                    size={13}
                    className="absolute right-1.5 top-1.5 text-slate-300 opacity-0 transition group-hover/instructions:opacity-100"
                  />
                )}
              </div>
            )}
            {(item.referenceLinks?.length > 0 || item.links?.length > 0 || item.attachments?.length > 0) && (
              <div className="mt-3 space-y-1.5 border-t border-concrete-200/70 pt-3">
                {item.referenceLinks?.map((l, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-1 text-xs font-semibold text-beacon-700 hover:underline"
                    >
                      <ExternalLink size={11} className="shrink-0" /> <span className="truncate">{l.label || "Reference link"}</span>
                    </a>
                    {onEditNotes && (
                      <button
                        type="button"
                        onClick={() => removeReferenceLink(i)}
                        aria-label="Remove reference link"
                        title="Remove — updates this task for every location"
                        className="shrink-0 text-beacon-700/50 hover:text-alert-600"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
                {item.attachments?.map((a, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-1 text-xs font-semibold text-mint-700 hover:underline"
                    >
                      <Paperclip size={11} className="shrink-0" /> <span className="truncate">{a.label || "Attachment"}</span>
                    </a>
                    {onEditNotes && (
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        aria-label="Remove attachment"
                        title="Remove — updates this task for every location"
                        className="shrink-0 text-mint-700/50 hover:text-alert-600"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
                <LinkChips links={item.links} onRemove={removeLink} />
              </div>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-4">
            <AddLinkControl onAdd={addLink} />
            {onEditNotes && <AddAttachmentControl onAdd={addAttachment} />}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">{removeButton}</div>
      </div>
    </div>
  );

  if (reorderable) {
    return (
      <Reorder.Item value={item.itemId} dragListener={false} dragControls={controls}>
        {rowContent}
      </Reorder.Item>
    );
  }
  return rowContent;
}

function AddTaskRow({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState("");
  const [timing, setTiming] = useState("");
  const [notes, setNotes] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-concrete-300 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-vend-black hover:text-vend-black"
      >
        <Plus size={13} /> Add task
      </button>
    );
  }

  const submit = () => {
    if (!task.trim()) return;
    onAdd({ task: task.trim(), timing: timing.trim(), notes: notes.trim() });
    setTask("");
    setTiming("");
    setNotes("");
    setOpen(false);
  };

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-concrete-300 bg-white p-3">
      <TextInput autoFocus value={task} onChange={(e) => setTask(e.target.value)} placeholder="New task…" />
      <div className="grid grid-cols-2 gap-2">
        <TextInput value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="Timing (optional)" />
        <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-concrete-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!task.trim()}
          className="rounded-full bg-vend-black px-3.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// Starts collapsed regardless of progress — with 8 sub-categories under
// Onboarding, auto-opening "the current one" just meant something was
// always expanded whether you wanted it or not. Now every category starts
// closed and you pick which one to look into.
function CategoryGroup({ category, items, team, onUpdate, editable, onAddTask, onRemoveTask, onEditNotes, onReorderTasks, reorderable: categoryReorderable, open, onToggle, forceFlat }) {
  const controls = useDragControls();
  const done = items.filter((i) => i.done).length;
  const complete = items.length > 0 && done === items.length;
  const tasksReorderable = editable && items.length > 1;

  const body = (
    <div className="space-y-1.5">
      {tasksReorderable ? (
        <Reorder.Group axis="y" values={items.map((i) => i.itemId)} onReorder={onReorderTasks} className="space-y-1.5">
          {items.map((item) => (
            <ChecklistTaskRow
              key={item.itemId}
              item={item}
              team={team}
              onUpdate={onUpdate}
              onRemove={editable ? () => onRemoveTask(item) : null}
              onEditNotes={editable ? (patch) => onEditNotes(item, patch) : null}
              reorderable
            />
          ))}
        </Reorder.Group>
      ) : (
        items.map((item) => (
          <ChecklistTaskRow
            key={item.itemId}
            item={item}
            team={team}
            onUpdate={onUpdate}
            onRemove={editable ? () => onRemoveTask(item) : null}
            onEditNotes={editable ? (patch) => onEditNotes(item, patch) : null}
          />
        ))
      )}
      {editable && <AddTaskRow onAdd={onAddTask} />}
    </div>
  );

  // A stage with only one category underneath it (named or not) has nothing
  // worth a second click to reveal — the stage's own dropdown already
  // implies "show me what's in here," so skip this category's own header
  // and show its tasks flat, same as a genuinely categoryless one.
  if (!category || forceFlat) return body;

  const content = (
    <>
      <div className="flex items-center gap-2 bg-concrete-100/60 px-3 py-2">
        {categoryReorderable && editable && (
          <span
            onPointerDown={(e) => controls.start(e)}
            className="shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500"
          >
            <GripVertical size={14} />
          </span>
        )}
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-2 text-left">
          {complete && <Check size={12} className="shrink-0 text-go-600" />}
          <span className={`flex-1 text-xs font-semibold ${complete ? "text-slate-400 line-through" : "text-slate-600"}`}>{category}</span>
          <span className="text-[11px] font-semibold text-slate-400">
            {done}/{items.length}
          </span>
        </button>
        {editable && <MarkAllButton items={items} onUpdate={onUpdate} />}
        <button type="button" onClick={onToggle} aria-label="Toggle category" className="shrink-0">
          <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="p-3">{body}</div>
        </div>
      </div>
    </>
  );

  if (categoryReorderable) {
    return (
      <Reorder.Item
        value={category}
        dragListener={false}
        dragControls={controls}
        className="overflow-hidden rounded-lg border border-concrete-200 bg-white"
      >
        {content}
      </Reorder.Item>
    );
  }
  return <div className="overflow-hidden rounded-lg border border-concrete-200">{content}</div>;
}

function StageAccordion({ stage, categories, open, onToggle, team, onUpdate, editable, onAddTask, onRemoveTask, onEditNotes, onReorderCategories, onReorderTasks }) {
  const items = categories.flatMap(([, its]) => its);
  const done = items.filter((i) => i.done).length;
  const complete = items.length > 0 && done === items.length;
  const styles = STAGE_STYLES[stage.color];
  // Only worth dragging when there's more than one real (named) category —
  // a categoryless stage or a stage with just one category has nothing to
  // reorder.
  const reorderable = categories.length > 1 && !!categories[0][0];
  // Opening one category closes the others — same single-open accordion
  // behavior as the stages themselves, so expanding Internet doesn't leave
  // Signage and Staffing sitting open too.
  const [openCategory, setOpenCategory] = useState(null);

  const list = categories.map(([cat, its]) => (
    <CategoryGroup
      key={cat || "_"}
      category={cat}
      items={its}
      team={team}
      onUpdate={onUpdate}
      editable={editable}
      onAddTask={(fields) => onAddTask({ stage: stage.n, category: cat || null, ...fields })}
      onRemoveTask={onRemoveTask}
      onEditNotes={onEditNotes}
      onReorderTasks={(newOrder) => onReorderTasks(stage.n, cat, newOrder)}
      reorderable={reorderable}
      open={cat === openCategory}
      onToggle={() => setOpenCategory((prev) => (prev === cat ? null : cat))}
      forceFlat={categories.length === 1}
    />
  ));

  return (
    <div className="overflow-hidden rounded-xl border border-concrete-200 bg-white">
      <div className={`flex items-center gap-3 px-4 py-3 transition ${styles.header}`}>
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-3 text-left">
          {complete ? (
            <Check size={14} className="shrink-0 text-go-600" />
          ) : (
            <span className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
          )}
          <span className={`flex-1 font-display text-sm font-bold ${complete ? "text-slate-400 line-through" : "text-vend-black"}`}>
            {stage.label}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {done}/{items.length}
          </span>
        </button>
        {editable && <MarkAllButton items={items} onUpdate={onUpdate} />}
        <button type="button" onClick={onToggle} aria-label="Toggle stage" className="shrink-0">
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          {reorderable ? (
            <Reorder.Group
              axis="y"
              values={categories.map(([cat]) => cat)}
              onReorder={(newOrder) => onReorderCategories(stage.n, newOrder)}
              className="space-y-3 px-4 py-4"
            >
              {list}
            </Reorder.Group>
          ) : (
            <div className="space-y-3 px-4 py-4">{list}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistSection({ location, team, onUpdate, editable, onAddTask, onRemoveTask, onEditNotes, onReorderCategories, onReorderTasks }) {
  // The stage accordion still auto-opens to wherever the location currently
  // is (that part wasn't the complaint) — only one stage stays open at a
  // time now, same single-open accordion behavior as the categories inside
  // each stage.
  const { currentStage } = summarizeChecklist(location.checklist);
  const [openStage, setOpenStage] = useState(currentStage || null);

  const grouped = useMemo(() => {
    const byStage = new Map();
    for (const item of location.checklist) {
      if (!byStage.has(item.stage)) byStage.set(item.stage, new Map());
      const byCat = byStage.get(item.stage);
      const cat = item.category || "";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(item);
    }
    return STAGES.map((s) => {
      const map = byStage.get(s.n);
      return { stage: s, categories: map?.size ? [...map] : [["", []]] };
    });
  }, [location.checklist]);

  const toggleStage = (n) => setOpenStage((prev) => (prev === n ? null : n));

  return (
    <div className="space-y-3 border-t border-concrete-200 bg-concrete-100/40 p-4">
      {grouped.map(({ stage, categories }) => (
        <StageAccordion
          key={stage.n}
          stage={stage}
          categories={categories}
          open={stage.n === openStage}
          onToggle={() => toggleStage(stage.n)}
          team={team}
          onUpdate={onUpdate}
          editable={editable}
          onAddTask={onAddTask}
          onRemoveTask={onRemoveTask}
          onEditNotes={onEditNotes}
          onReorderCategories={onReorderCategories}
          onReorderTasks={onReorderTasks}
        />
      ))}
    </div>
  );
}

// Groups garages into one client — the exact same map_groups table the
// Locations Map's "Group garages" feature uses, so a client grouped here
// shows up grouped on the map too (and vice versa), instead of each surface
// keeping its own separate notion of "these lots belong together."
function ManageLocationGroupsModal({ open, onClose, groups, locations, onCreateGroup, onUpdateGroup, onDeleteGroup }) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [groupName, setGroupName] = useState("");
  const [editingId, setEditingId] = useState(null);

  if (!open) return null;

  const groupedElsewhere = new Set(groups.filter((g) => g.id !== editingId).flatMap((g) => g.memberNames));
  const available = locations.filter(
    (l) => !groupedElsewhere.has(l.name) && l.name.toLowerCase().includes(filter.toLowerCase())
  );

  function toggle(name) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function resetForm() {
    setEditingId(null);
    setGroupName("");
    setSelected(new Set());
    setFilter("");
  }

  function startEdit(g) {
    setEditingId(g.id);
    setGroupName(g.name);
    setSelected(new Set(g.memberNames));
    setFilter("");
  }

  function submit() {
    if (!groupName.trim() || selected.size < 2) return;
    if (editingId) {
      onUpdateGroup(editingId, { name: groupName.trim(), memberNames: [...selected] });
    } else {
      onCreateGroup({ name: groupName.trim(), memberNames: [...selected] });
    }
    resetForm();
  }

  function handleDelete(id) {
    onDeleteGroup(id);
    if (editingId === id) resetForm();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-vend-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-concrete-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-vend-black">Group locations into a client</h2>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-slate-300 hover:text-vend-black"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {groups.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Existing groups</p>
              <div className="space-y-2">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                      editingId === g.id ? "border-vend-black bg-concrete-100/50" : "border-concrete-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-vend-black">{g.name}</p>
                      <p className="text-xs text-slate-400">{g.memberNames.length} locations</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button type="button" onClick={() => startEdit(g)} className="text-xs font-semibold text-slate-500 hover:text-vend-black">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(g.id)} className="text-xs font-semibold text-alert-600 hover:text-alert-700">
                        Ungroup
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {editingId ? "Editing group" : "Create a new group"}
              </p>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-500 hover:text-vend-black">
                  Cancel — start new group
                </button>
              )}
            </div>
            <div className="space-y-3">
              <Field label="Client name">
                <TextInput value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. One Arts Plaza" />
              </Field>
              <Field label="Filter locations">
                <TextInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Start typing a name…" />
              </Field>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-concrete-200 p-2">
                {available.length === 0 && <p className="px-2 py-3 text-sm text-slate-400">No matching locations.</p>}
                {available.map((l) => (
                  <div key={l.name} className="rounded-lg px-2 py-1.5 hover:bg-concrete-100/50">
                    <Checkbox checked={selected.has(l.name)} onChange={() => toggle(l.name)} label={l.name} description={l.place || (l.archived ? "Launched" : "Onboarding")} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">{selected.size} selected — pick at least 2 to group.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-concrete-200 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-concrete-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!groupName.trim() || selected.size < 2}
            className="rounded-full bg-vend-black px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {editingId ? "Save changes" : "Create group"}
          </button>
        </div>
      </div>
    </div>
  );
}

// A grouped client works through ONE shared 75-item checklist, not one per
// garage — the first member (stable by sort_order) holds the real
// checklist_progress rows; every other member is just a label here. If
// members already had their own independent progress before being grouped,
// only the primary's counts carry forward — that's an accepted tradeoff of
// merging N separate checklists into one.
function ClientGroupCard({ group, locations, team, open, onToggle, onUpdate, onAddTask, onRemoveTask, onEditNotes, onSetStage, onMarkComplete, onSetOnHold, onReorderCategories, onReorderTasks }) {
  const [showMembers, setShowMembers] = useState(false);
  const primary = locations[0];
  const editable = !primary.archived;
  const highlight = editable && !primary.onHold ? calendarPhaseHighlight(primary.phases) : null;
  const rawSummary = summarizeChecklist(primary.checklist);
  const { done, total } = editable ? rawSummary : { done: rawSummary.total, total: rawSummary.total };
  const assigneeIds = editable
    ? [...new Set(primary.checklist.filter((c) => !c.done && c.assigneeId !== UNASSIGNED).map((c) => c.assigneeId))]
    : [];
  // Usually every member installs/goes live together — one pill each. Only
  // when they actually differ does this show more than one, so a mismatch
  // is visible rather than silently collapsed to whichever member happens
  // to be first.
  const dedupedRanges = (canon) => [
    ...new Map(
      locations
        .map((l) => l.phases.find((p) => canonPhaseLabel(p.label) === canon))
        .filter(Boolean)
        .map((p) => [`${p.start}|${p.end}`, p])
    ).values(),
  ];
  const installRanges = dedupedRanges("install");
  const goliveRanges = dedupedRanges("golive");

  return (
    <div
      className={`overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-shadow hover:shadow-md ${
        primary.onHold ? "border-dashed border-caution-600" : highlight ? highlightBorderClass(highlight) : "border-beacon-600/30"
      }`}
      style={
        primary.onHold
          ? { backgroundImage: "repeating-linear-gradient(135deg, rgba(217,158,50,0.05) 0 10px, rgba(217,158,50,0.12) 10px 20px)" }
          : undefined
      }
    >
      <div className="flex w-full items-center gap-4 px-5 py-4 transition hover:bg-concrete-100/40">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <ChevronRight size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
          <Layers size={14} className="shrink-0 text-beacon-700" />
          <span className="truncate font-display text-sm font-bold text-vend-black">{group.name}</span>
          <CalendarHighlightBadge highlight={highlight} />
        </button>
        <button
          type="button"
          onClick={() => setShowMembers((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-concrete-100 hover:text-vend-black"
        >
          {locations.length} locations
          <ChevronDown size={12} className={`transition-transform ${showMembers ? "rotate-180" : ""}`} />
        </button>
        <ProgressBar done={done} total={total} />
        <StageControl
          checklist={primary.checklist}
          override={primary.stageOverride}
          forceComplete={!editable}
          onSetStage={(n) => onSetStage(primary.id, n)}
        />
        {editable && <MarkCompleteButton onClick={() => onMarkComplete(primary.id)} ready={total > 0 && done === total} />}
        <AssigneeStrip team={team} ids={assigneeIds} />
        {editable && <OnHoldControl onHold={primary.onHold} onSetOnHold={(v) => onSetOnHold(primary.id, v)} />}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
        {installRanges.map((p) => (
          <DatePill key={`install-${p.start}-${p.end}`} icon={Calendar} label="Install" start={p.start} end={p.end} />
        ))}
        {goliveRanges.map((p) => (
          <DatePill key={`golive-${p.start}-${p.end}`} icon={Rocket} label="Go Live" start={p.start} end={p.end} />
        ))}
        {team.find((t) => t.id === primary.salesPersonId) && (
          <span className="ml-auto text-[10px] font-medium text-slate-400">
            {team.find((t) => t.id === primary.salesPersonId).name}
          </span>
        )}
      </div>
      {showMembers && (
        <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
          {locations.map((l) => (
            <span key={l.id} className="rounded-full bg-concrete-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              {l.name}
            </span>
          ))}
        </div>
      )}
      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <ChecklistSection
            location={primary}
            team={team}
            onUpdate={(itemId, patch) => onUpdate(primary.id, itemId, patch)}
            editable={editable}
            onAddTask={(fields) => onAddTask({ ...fields, locationId: primary.id })}
            onRemoveTask={(item) => onRemoveTask(primary.id, item)}
            onEditNotes={onEditNotes}
            onReorderCategories={onReorderCategories}
            onReorderTasks={onReorderTasks}
          />
        </div>
      </div>
    </div>
  );
}

function LocationRow({ location, team, open, onToggle, onUpdate, onAddTask, onRemoveTask, onEditNotes, onSetStage, onMarkComplete, onSetOnHold, onReorderCategories, onReorderTasks }) {
  const editable = !location.archived;
  const highlight = editable && !location.onHold ? calendarPhaseHighlight(location.phases) : null;
  const rawSummary = summarizeChecklist(location.checklist);
  const { done, total } = editable ? rawSummary : { done: rawSummary.total, total: rawSummary.total };
  const install = location.phases.find((p) => canonPhaseLabel(p.label) === "install");
  const golive = location.phases.find((p) => canonPhaseLabel(p.label) === "golive");
  const assigneeIds = editable
    ? [...new Set(location.checklist.filter((c) => !c.done && c.assigneeId !== UNASSIGNED).map((c) => c.assigneeId))]
    : [];

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md ${
        location.onHold
          ? "border-2 border-dashed border-caution-600"
          : highlight
          ? `border-2 ${highlightBorderClass(highlight)}`
          : "border border-concrete-200"
      }`}
      style={
        location.onHold
          ? { backgroundImage: "repeating-linear-gradient(135deg, rgba(217,158,50,0.05) 0 10px, rgba(217,158,50,0.12) 10px 20px)" }
          : undefined
      }
    >
      <div className="flex w-full items-center gap-4 px-5 py-4 transition hover:bg-concrete-100/40">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <ChevronRight size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-display text-sm font-bold text-vend-black">{location.name}</span>
              {location.place && <span className="truncate text-xs font-medium text-slate-400">{location.place}</span>}
              {location.hasOnsiteStaff && (
                <span className="shrink-0 rounded-full bg-mint-200 px-2 py-0.5 text-[10px] font-bold text-mint-700">Spark</span>
              )}
              <CalendarHighlightBadge highlight={highlight} />
            </div>
          </div>
        </button>
        <ProgressBar done={done} total={total} />
        <StageControl
          checklist={location.checklist}
          override={location.stageOverride}
          forceComplete={!editable}
          onSetStage={(n) => onSetStage(location.id, n)}
        />
        {editable && <MarkCompleteButton onClick={() => onMarkComplete(location.id)} ready={total > 0 && done === total} />}
        <AssigneeStrip team={team} ids={assigneeIds} />
        {editable && <OnHoldControl onHold={location.onHold} onSetOnHold={(v) => onSetOnHold(location.id, v)} />}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
        <DatePill icon={Calendar} label="Install" start={install?.start} end={install?.end} />
        <DatePill icon={Rocket} label="Go Live" start={golive?.start} end={golive?.end} />
        {team.find((t) => t.id === location.salesPersonId) && (
          <span className="ml-auto text-[10px] font-medium text-slate-400">
            {team.find((t) => t.id === location.salesPersonId).name}
          </span>
        )}
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <ChecklistSection
            location={location}
            team={team}
            onUpdate={(itemId, patch) => onUpdate(location.id, itemId, patch)}
            editable={editable}
            onAddTask={(fields) => onAddTask({ ...fields, locationId: location.id })}
            onRemoveTask={(item) => onRemoveTask(location.id, item)}
            onEditNotes={onEditNotes}
            onReorderCategories={onReorderCategories}
            onReorderTasks={onReorderTasks}
          />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ isAdmin = true }) {
  const store = useScheduleStore();
  const { data, loaded } = store;
  const mapStore = useMapStore();
  const denyWrite = () => window.alert("You have view-only access — ask an admin to make this change.");
  const updateChecklistItem = isAdmin ? store.updateChecklistItem : denyWrite;
  const addChecklistItem = isAdmin ? store.addChecklistItem : denyWrite;
  const updateChecklistTemplateItem = isAdmin ? store.updateChecklistTemplateItem : denyWrite;
  const setStageOverride = isAdmin ? store.setStageOverride : denyWrite;
  const setOnHold = isAdmin ? store.setOnHold : denyWrite;
  const markLocationComplete = isAdmin ? store.markLocationComplete : denyWrite;
  const reorderChecklistCategories = isAdmin ? store.reorderChecklistCategories : denyWrite;
  const reorderChecklistTasks = isAdmin ? store.reorderChecklistTasks : denyWrite;
  const createGroup = isAdmin ? mapStore.createGroup : denyWrite;
  const updateGroup = isAdmin ? mapStore.updateGroup : denyWrite;
  const deleteGroup = isAdmin ? mapStore.deleteGroup : denyWrite;

  const [expanded, setExpanded] = useState(() => new Set());
  const [launchedOpen, setLaunchedOpen] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showManageTemplate, setShowManageTemplate] = useState(false);
  // A single-slot "undo my last action" for deleted template tasks — matches
  // the pattern already used for phases/locations/teammates elsewhere.
  const [undoAction, setUndoAction] = useState(null);

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // A location-only task (item.locationId set) never existed anywhere else,
  // so removing it is a plain delete. A shared template task instead gets
  // excluded just for this one location (checklist_progress.excluded) —
  // the shared checklist_items row, and every other location's copy of it,
  // is untouched. Editing the template itself now only happens from Manage
  // Template.
  async function removeTaskForLocation(locationId, item) {
    if (!isAdmin) return denyWrite();
    if (item.locationId) {
      await store.removeChecklistItem(item.itemId);
      setUndoAction({ label: `Deleted "${item.task}"`, run: () => store.restoreChecklistItem(item) });
    } else {
      await store.updateChecklistItem(locationId, item.itemId, { excluded: true });
      setUndoAction({
        label: `Removed "${item.task}" from this location`,
        run: () => store.updateChecklistItem(locationId, item.itemId, { excluded: false }),
      });
    }
  }

  async function runUndo() {
    const action = undoAction;
    if (!action) return;
    setUndoAction(null);
    await action.run();
  }

  if (!loaded) {
    return <div className="p-8 text-sm text-slate-400">Loading…</div>;
  }

  // Same map_groups records the Locations Map's "Group garages" feature
  // uses — a client grouped here is grouped there too.
  const { groups } = mapStore;
  const groupedNames = new Set(groups.flatMap((g) => g.memberNames));
  const groupMembers = (g) => data.locations.filter((l) => g.memberNames.includes(l.name));
  const activeGroups = groups.map((g) => ({ group: g, members: groupMembers(g) })).filter(({ members }) => members.some((l) => !l.archived));
  const launchedGroups = groups
    .map((g) => ({ group: g, members: groupMembers(g) }))
    .filter(({ members }) => members.length > 0 && members.every((l) => l.archived));

  const active = data.locations.filter((l) => !l.archived && !groupedNames.has(l.name));
  const launched = data.locations.filter((l) => l.archived && !groupedNames.has(l.name));

  // One unified list, most-recently-launched first (by each entry's latest
  // phase end date) — same "most recent finished first" convention the
  // Installation Schedule's own Completed section already uses. A grouped
  // client sorts by its primary member's dates, matching how the group
  // already borrows the primary for everything else.
  const launchedEntries = [
    ...launchedGroups.map((lg) => ({ type: "group", date: latestScheduleDate(lg.members[0].phases), ...lg })),
    ...launched.map((loc) => ({ type: "location", date: latestScheduleDate(loc.phases), loc })),
  ].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date - a.date;
  });

  const rowProps = {
    team: data.team,
    onUpdate: updateChecklistItem,
    onAddTask: addChecklistItem,
    onRemoveTask: removeTaskForLocation,
    onEditNotes: (item, patch) => updateChecklistTemplateItem(item.itemId, patch),
    onSetStage: setStageOverride,
    onSetOnHold: setOnHold,
    onMarkComplete: markLocationComplete,
    onReorderCategories: reorderChecklistCategories,
    onReorderTasks: reorderChecklistTasks,
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-vend-black">Onboarding Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track every location's onboarding checklist and assign tasks to the team.
          </p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowManageTemplate(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-concrete-300 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
            >
              <ListChecks size={13} /> Manage Template
            </button>
            <button
              type="button"
              onClick={() => setShowGroups(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-concrete-300 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
            >
              <Layers size={13} /> Group locations
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {activeGroups.map(({ group, members }) => (
          <ClientGroupCard
            key={group.id}
            group={group}
            locations={members}
            open={expanded.has(group.id)}
            onToggle={() => toggleExpanded(group.id)}
            {...rowProps}
          />
        ))}
        {active.map((loc) => (
          <LocationRow key={loc.id} location={loc} open={expanded.has(loc.id)} onToggle={() => toggleExpanded(loc.id)} {...rowProps} />
        ))}
        {!active.length && !activeGroups.length && <p className="text-sm text-slate-400">No active locations yet.</p>}
      </div>

      {!!(launched.length || launchedGroups.length) && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-concrete-200">
          <button
            type="button"
            onClick={() => setLaunchedOpen((v) => !v)}
            className="flex w-full items-center justify-between bg-beacon-700 px-5 py-3 text-left text-white transition hover:bg-beacon-700/90"
          >
            <span className="text-sm font-semibold">
              Launched Locations <span className="opacity-80">({launched.length + launchedGroups.reduce((n, g) => n + g.members.length, 0)})</span>
            </span>
            <ChevronDown size={16} className={`transition-transform ${launchedOpen ? "rotate-180" : ""}`} />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ${launchedOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 bg-white p-4">
                {launchedEntries.map((entry) =>
                  entry.type === "group" ? (
                    <ClientGroupCard
                      key={entry.group.id}
                      group={entry.group}
                      locations={entry.members}
                      open={expanded.has(entry.group.id)}
                      onToggle={() => toggleExpanded(entry.group.id)}
                      {...rowProps}
                    />
                  ) : (
                    <LocationRow
                      key={entry.loc.id}
                      location={entry.loc}
                      open={expanded.has(entry.loc.id)}
                      onToggle={() => toggleExpanded(entry.loc.id)}
                      {...rowProps}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ManageLocationGroupsModal
        open={showGroups}
        onClose={() => setShowGroups(false)}
        groups={groups}
        locations={data.locations}
        onCreateGroup={createGroup}
        onUpdateGroup={updateGroup}
        onDeleteGroup={deleteGroup}
      />

      <ManageTemplateModal
        open={showManageTemplate}
        onClose={() => setShowManageTemplate(false)}
        checklistTemplate={data.checklistTemplate}
        onAddTask={addChecklistItem}
        onUpdateTask={updateChecklistTemplateItem}
        onRemoveTask={store.removeChecklistItem}
        onRemoveCategory={store.removeChecklistCategory}
        onReorderTasks={reorderChecklistTasks}
      />

      {undoAction && (
        <div className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-full bg-vend-black px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
          <span>{undoAction.label}</span>
          <button
            type="button"
            onClick={runUndo}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide transition hover:bg-white/25"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setUndoAction(null)}
            aria-label="Dismiss"
            className="text-white/50 transition hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
