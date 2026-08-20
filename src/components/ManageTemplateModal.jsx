import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ExternalLink, GripVertical, Paperclip, Plus, Trash2, X } from "lucide-react";
import { TextInput, Textarea } from "./fields";
import { STAGES } from "../lib/checklistUtils";
import AttachmentUploadButton from "./AttachmentUploadButton";

// A reference hyperlink — always a pasted URL. Kept as its own list,
// separate from attachments below.
function AddLinkForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition hover:text-vend-black"
      >
        <Plus size={11} /> Add link
      </button>
    );
  }

  function submit() {
    if (!url.trim()) return;
    onAdd({ label: label.trim(), url: url.trim() });
    setLabel("");
    setUrl("");
    setOpen(false);
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-concrete-200 bg-concrete-100/40 p-2">
      <TextInput autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="!py-1.5 !text-xs" />
      <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="!py-1.5 !text-xs" />
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!url.trim()}
          className="rounded-full bg-vend-black px-2.5 py-1 text-[11px] font-semibold text-white transition disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function TemplateTaskRow({ item, onUpdate, onRemove, dragControls }) {
  const [editing, setEditing] = useState(false);
  const [task, setTask] = useState(item.task);
  const [timing, setTiming] = useState(item.timing || "");
  const [notes, setNotes] = useState(item.notes || "");

  const links = item.referenceLinks || [];
  const addLink = (link) => onUpdate({ referenceLinks: [...links, link] });
  const removeLink = (idx) => onUpdate({ referenceLinks: links.filter((_, i) => i !== idx) });

  const attachments = item.attachments || [];
  const addAttachment = (file) => onUpdate({ attachments: [...attachments, file] });
  const removeAttachment = (idx) => onUpdate({ attachments: attachments.filter((_, i) => i !== idx) });

  function startEdit() {
    setTask(item.task);
    setTiming(item.timing || "");
    setNotes(item.notes || "");
    setEditing(true);
  }
  function save() {
    if (!task.trim()) return;
    onUpdate({ task: task.trim(), timing: timing.trim(), notes: notes.trim() });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-2xl border border-concrete-200 bg-white p-4">
        <TextInput autoFocus value={task} onChange={(e) => setTask(e.target.value)} placeholder="Task" />
        <TextInput value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="Timing (optional)" />
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for this task…" rows={6} className="!text-sm" />
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-concrete-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-vend-black px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-concrete-200 bg-white px-4 py-4 shadow-sm transition">
      <div className="flex items-start gap-3">
        {dragControls && (
          <span
            onPointerDown={(e) => dragControls.start(e)}
            className="mt-1 shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500"
          >
            <GripVertical size={14} />
          </span>
        )}
        <div
          className="min-w-0 flex-1 cursor-text"
          title="Click to edit — updates this task for every location"
          onClick={(e) => {
            if (e.target.closest("a, button, input, textarea")) return;
            startEdit();
          }}
        >
          <span className="block font-display text-[15px] font-bold text-vend-black">{item.task}</span>
          {item.timing && (
            <span className="mt-2 inline-block shrink-0 rounded-full bg-concrete-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              {item.timing}
            </span>
          )}

          <div className="mt-3.5 rounded-xl bg-concrete-100/50 px-4 py-4">
            {item.notes ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{item.notes}</p>
            ) : (
              <p className="text-sm italic text-slate-300">No notes yet — click to add some.</p>
            )}
            {(links.length > 0 || attachments.length > 0) && (
              <div className="mt-3 space-y-1.5 border-t border-concrete-200/70 pt-3">
                {links.map((l, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-1 text-xs font-semibold text-beacon-700 hover:underline"
                    >
                      <ExternalLink size={11} className="shrink-0" /> <span className="truncate">{l.label || l.url}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      aria-label="Remove link"
                      className="shrink-0 text-beacon-700/50 hover:text-alert-600"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-1 text-xs font-semibold text-mint-700 hover:underline"
                    >
                      <Paperclip size={11} className="shrink-0" /> <span className="truncate">{a.label || a.url}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      aria-label="Remove attachment"
                      className="shrink-0 text-mint-700/50 hover:text-alert-600"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-4">
            <AddLinkForm onAdd={addLink} />
            <AttachmentUploadButton onAdd={addAttachment} />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete task"
          className="shrink-0 rounded-full p-1 text-slate-300 transition hover:bg-alert-100 hover:text-alert-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function TaskDragItem({ item, onUpdate, onRemove, onDragEnd }) {
  const controls = useDragControls();
  return (
    <Reorder.Item as="div" value={item} dragListener={false} dragControls={controls} onDragEnd={onDragEnd}>
      <TemplateTaskRow item={item} onUpdate={onUpdate} onRemove={onRemove} dragControls={controls} />
    </Reorder.Item>
  );
}

// Local drag order, decoupled from the live template data while a drag is
// in flight — same fix as Manage Team's drag-to-reorder: Framer Motion's
// Reorder.Group fires onReorder continuously as the dragged row crosses
// each sibling, not just once on drop, so persisting on every one of those
// (and having a realtime refetch replace the array mid-gesture) is what
// makes dragging feel sticky. This commits to the database only once, when
// the drag actually ends.
function CategoryTaskList({ stageN, category, items, onReorderTasks, onUpdateTask, onRemoveTask }) {
  const [localOrder, setLocalOrder] = useState(items);
  const localOrderRef = useRef(localOrder);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    localOrderRef.current = localOrder;
  }, [localOrder]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    setLocalOrder(items);
  }, [items]);

  function handleDragEnd() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    onReorderTasks(
      stageN,
      category,
      localOrderRef.current.map((t) => t.id)
    );
  }

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={localOrder}
      onReorder={(next) => {
        isDraggingRef.current = true;
        setLocalOrder(next);
      }}
      className="space-y-1.5"
    >
      {localOrder.map((item) => (
        <TaskDragItem
          key={item.id}
          item={item}
          onUpdate={(patch) => onUpdateTask(item.id, patch)}
          onRemove={() => onRemoveTask(item)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </Reorder.Group>
  );
}

function AddTaskForm({ onAdd, placeholder = "New task…" }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState("");
  const [timing, setTiming] = useState("");

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

  function submit() {
    if (!task.trim()) return;
    onAdd({ task: task.trim(), timing: timing.trim() });
    setTask("");
    setTiming("");
    setOpen(false);
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-concrete-300 bg-white p-3">
      <TextInput autoFocus value={task} onChange={(e) => setTask(e.target.value)} placeholder={placeholder} />
      <TextInput value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="Timing (optional)" />
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

// Creating a brand-new category is just adding its first task under a
// category name that doesn't exist yet — there's no separate "empty
// category" concept, so this form doubles as both.
function AddCategoryForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [task, setTask] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-concrete-300 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-vend-black hover:text-vend-black"
      >
        <Plus size={13} /> Add category
      </button>
    );
  }

  function submit() {
    if (!category.trim() || !task.trim()) return;
    onAdd({ category: category.trim(), task: task.trim(), timing: "" });
    setCategory("");
    setTask("");
    setOpen(false);
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-concrete-300 bg-white p-3">
      <TextInput autoFocus value={category} onChange={(e) => setCategory(e.target.value)} placeholder="New category name…" />
      <TextInput value={task} onChange={(e) => setTask(e.target.value)} placeholder="First task in this category…" />
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
          disabled={!category.trim() || !task.trim()}
          className="rounded-full bg-vend-black px-3.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
        >
          Add category
        </button>
      </div>
    </div>
  );
}

// A category isn't its own row anywhere — it's just whatever string a
// group of tasks share — so "renaming" it means relabeling every task
// currently in it. Click-to-edit, same interaction as the task cards.
function CategoryHeader({ stageN, category, onRename }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(category);

  function startEdit() {
    setValue(category);
    setEditing(true);
  }
  function save() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== category) onRename(stageN, category, trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className="rounded border border-concrete-300 bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-vend-black outline-none focus:border-vend-black"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title="Click to rename this category — updates every location"
      className="rounded px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-white hover:text-vend-black"
    >
      {category}
    </button>
  );
}

export default function ManageTemplateModal({ open, onClose, checklistTemplate, onAddTask, onUpdateTask, onRemoveTask, onRemoveCategory, onRenameCategory, onReorderTasks }) {
  if (!open) return null;

  // Location-only tasks (added from inside a single location's own
  // checklist) aren't part of "the template" — this only ever shows and
  // edits the shared items every non-archived location gets.
  const globalItems = checklistTemplate.filter((t) => !t.locationId);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-vend-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-concrete-200 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-vend-black">Manage Template</h2>
            <p className="text-xs text-slate-400">Changes here apply to every non-archived location's checklist.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-vend-black">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {STAGES.map((stage) => {
            const stageItems = globalItems.filter((t) => t.stage === stage.n);
            const byCategory = new Map();
            stageItems.forEach((t) => {
              const cat = t.category || "";
              if (!byCategory.has(cat)) byCategory.set(cat, []);
              byCategory.get(cat).push(t);
            });
            const categories = [...byCategory.entries()];

            return (
              <div key={stage.n}>
                <h3 className="mb-2 font-display text-sm font-bold text-vend-black">{stage.label}</h3>
                <div className="space-y-3">
                  {categories.map(([cat, items]) => (
                    <div key={cat || "_"} className="rounded-xl border border-concrete-200 bg-concrete-100/40 p-3">
                      {cat && (
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <CategoryHeader stageN={stage.n} category={cat} onRename={onRenameCategory} />
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete the whole "${cat}" category (${items.length} task${items.length === 1 ? "" : "s"})? This can't be undone.`)) {
                                onRemoveCategory(stage.n, cat);
                              }
                            }}
                            className="text-[11px] font-semibold text-alert-600 hover:text-alert-700"
                          >
                            Delete category
                          </button>
                        </div>
                      )}
                      <CategoryTaskList
                        stageN={stage.n}
                        category={cat}
                        items={items}
                        onReorderTasks={onReorderTasks}
                        onUpdateTask={onUpdateTask}
                        onRemoveTask={(item) => {
                          if (window.confirm(`Delete "${item.task}"? This removes it from every location.`)) onRemoveTask(item.id);
                        }}
                      />
                      <div className="mt-2">
                        <AddTaskForm onAdd={(fields) => onAddTask({ stage: stage.n, category: cat || null, ...fields })} />
                      </div>
                    </div>
                  ))}
                  <AddCategoryForm onAdd={(fields) => onAddTask({ stage: stage.n, ...fields })} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
