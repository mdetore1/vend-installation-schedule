import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Field, TextInput, Checkbox } from "./fields";

// Groups locations into one client — backed by the map_groups table, the
// same one the Locations Map's "Group garages" feature uses, so a client
// grouped here shows up grouped on the map (and the Installation Schedule)
// too, and vice versa. Shared by Dashboard.jsx and ProjectTracker.jsx
// rather than duplicated, since both need the exact same grouping data.
export default function ManageLocationGroupsModal({
  open,
  onClose,
  groups,
  locations,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  initialEditGroup,
}) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [groupName, setGroupName] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Opening via a specific group's own "edit" pencil (e.g. from the
  // Installation Schedule) jumps straight into editing that group instead
  // of landing on the generic "create new" view.
  useEffect(() => {
    if (!open || !initialEditGroup) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local form state to which group was targeted, not derivable from render
    setEditingId(initialEditGroup.id);
    setGroupName(initialEditGroup.name);
    setSelected(new Set(initialEditGroup.memberNames));
    setFilter("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the modal (re)opens targeting a group, not on every groups refetch
  }, [open, initialEditGroup?.id]);

  if (!open) return null;

  const groupedElsewhere = new Set(groups.filter((g) => g.id !== editingId).flatMap((g) => g.memberNames));
  // A location currently selected for THIS edit always stays visible, even if
  // it's also (incorrectly) listed on another group's memberNames — e.g. from
  // splitting an already-grouped garage again, which can leave the same name
  // on two group rows. Without this, editing a group whose members overlap
  // another group hides every one of its own garages from the checklist
  // (nothing to check, nothing to remove), even though the group plainly has
  // members — the empty list is the bug, not the group.
  const available = locations.filter(
    (l) => (selected.has(l.name) || !groupedElsewhere.has(l.name)) && l.name.toLowerCase().includes(filter.toLowerCase())
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
