import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { TextInput } from "./fields";
import { STAGES } from "../lib/checklistUtils";

function TemplateTaskRow({ item, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [task, setTask] = useState(item.task);
  const [timing, setTiming] = useState(item.timing || "");

  function startEdit() {
    setTask(item.task);
    setTiming(item.timing || "");
    setEditing(true);
  }
  function save() {
    if (!task.trim()) return;
    onUpdate({ task: task.trim(), timing: timing.trim() });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-1.5 rounded-lg border border-concrete-200 bg-white p-2.5">
        <TextInput autoFocus value={task} onChange={(e) => setTask(e.target.value)} placeholder="Task" />
        <TextInput value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="Timing (optional)" />
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-concrete-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-vend-black px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-concrete-200 bg-white px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-vend-black">{item.task}</p>
        {item.timing && (
          <span className="mt-1 inline-block rounded-full bg-concrete-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {item.timing}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={startEdit}
        aria-label="Edit task"
        className="shrink-0 rounded-full p-1 text-slate-300 transition hover:bg-concrete-100 hover:text-vend-black"
      >
        <Pencil size={13} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Delete task"
        className="shrink-0 rounded-full p-1 text-slate-300 transition hover:bg-alert-100 hover:text-alert-600"
      >
        <Trash2 size={13} />
      </button>
    </div>
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

export default function ManageTemplateModal({ open, onClose, checklistTemplate, onAddTask, onUpdateTask, onRemoveTask, onRemoveCategory }) {
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
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</span>
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
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <TemplateTaskRow
                            key={item.id}
                            item={item}
                            onUpdate={(patch) => onUpdateTask(item.id, patch)}
                            onRemove={() => {
                              if (window.confirm(`Delete "${item.task}"? This removes it from every location.`)) onRemoveTask(item.id);
                            }}
                          />
                        ))}
                      </div>
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
