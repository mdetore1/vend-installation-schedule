import { useState } from "react";
import { X } from "lucide-react";
import { Field, TextInput, Select, Toggle, Checkbox, Repeatable } from "../fields";
import { addDays, cascadeDates, UNASSIGNED } from "../../lib/dateUtils";
import { emptyPhase, defaultPhases } from "../../lib/locationDefaults";

export default function AddLocationForm({
  open,
  onClose,
  team,
  onSubmit,
  title = "Add location",
  submitLabel = "Add location",
  initialName = "",
  initialPlace = "",
  initialContractor = "",
  initialHasOnsiteStaff = false,
  initialSalesPersonId = UNASSIGNED,
  initialPhases,
}) {
  const [name, setName] = useState(initialName);
  const [place, setPlace] = useState(initialPlace);
  const [contractor, setContractor] = useState(initialContractor || "Task Force");
  const [hasOnsiteStaff, setHasOnsiteStaff] = useState(initialHasOnsiteStaff);
  const [salesPersonId, setSalesPersonId] = useState(initialSalesPersonId || UNASSIGNED);
  const salesTeam = team.filter((t) => t.department === "Sales");
  const [phases, setPhases] = useState(() => initialPhases ?? defaultPhases(team));
  // Auto-cascading (push Install/Go-Live to the next Monday etc.) is a
  // useful default when phases don't have real dates yet, but it actively
  // fights an intentional overlap — e.g. Onboarding running long past
  // Install's start — on a location that's already scheduled. So it only
  // applies while adding a brand-new location, never while editing one.
  const isEditing = !!initialPhases;

  if (!open) return null;

  function updatePhase(i, patch) {
    setPhases((ph) => {
      const patched = ph.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
      return "end" in patch && !isEditing ? cascadeDates(patched, ph[i].id) : patched;
    });
  }

  function submit() {
    if (!name.trim() || phases.length === 0) return;
    onSubmit({
      name: name.trim(),
      place: place.trim(),
      contractor: contractor.trim() || "Task Force",
      hasOnsiteStaff,
      salesPersonId,
      phases,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vend-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-vend-black">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-vend-black">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <Field label="Location name" required>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2626 Cole"
            />
          </Field>

          <Field label="City, state">
            <TextInput
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g. Dallas, TX"
            />
          </Field>

          <Field label="Contractor">
            <TextInput
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              placeholder="e.g. Task Force"
            />
          </Field>

          <Checkbox
            checked={hasOnsiteStaff}
            onChange={setHasOnsiteStaff}
            label="Has onsite staff (Spark)"
            description="Shows a Spark bubble next to the city on the Dashboard"
          />

          <Field label="Sales person">
            <Select
              value={salesPersonId}
              onChange={(e) => setSalesPersonId(e.target.value)}
              options={[
                { value: UNASSIGNED, label: "None" },
                ...salesTeam.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </Field>

          <Field label="Phases">
            <Repeatable
              items={phases}
              minRows={1}
              addLabel="Add phase"
              onAdd={() =>
                setPhases((ph) => [
                  ...ph,
                  emptyPhase(team, new Date(), addDays(new Date(), 7)),
                ])
              }
              onRemove={(i) => setPhases((ph) => ph.filter((_, idx) => idx !== i))}
              render={(phase, i) => (
                <div className="space-y-3">
                  <TextInput
                    value={phase.label}
                    onChange={(e) => updatePhase(i, { label: e.target.value })}
                    placeholder="Phase name"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput
                      type="date"
                      value={phase.start}
                      onChange={(e) => updatePhase(i, { start: e.target.value })}
                    />
                    <TextInput
                      type="date"
                      value={phase.end}
                      onChange={(e) => updatePhase(i, { end: e.target.value })}
                    />
                  </div>
                  <Select
                    value={phase.ownerId || UNASSIGNED}
                    onChange={(e) => updatePhase(i, { ownerId: e.target.value })}
                    options={[
                      { value: UNASSIGNED, label: "Unassigned" },
                      ...team.map((t) => ({ value: t.id, label: t.name })),
                    ]}
                  />
                  <Toggle
                    checked={phase.confirmed}
                    onChange={(v) => updatePhase(i, { confirmed: v })}
                    label="Confirmed"
                    description={phase.confirmed ? "Dates are locked in" : "Dates are still proposed"}
                  />
                </div>
              )}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-concrete-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className="rounded-full bg-vend-black px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
