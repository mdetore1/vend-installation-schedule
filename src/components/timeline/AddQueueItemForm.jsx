import { useState } from "react";
import { X } from "lucide-react";
import { Field, TextInput, Select } from "../fields";
import { ACCESS_TYPES, CONTRACT_STATES } from "../../lib/locationDefaults";
import SalesRepSelect from "./SalesRepSelect";

const empty = {
  name: "",
  place: "",
  lanes: "",
  accessType: "",
  contractState: "In Progress",
  potentialGoLiveDate: "",
  salesRep: "",
  propertyManagement: "",
  ownership: "",
};

export default function AddQueueItemForm({ open, onClose, onSubmit, salesReps, onAddSalesRep }) {
  const [form, setForm] = useState(empty);

  if (!open) return null;

  function patch(fields) {
    setForm((f) => ({ ...f, ...fields }));
  }

  function submit() {
    if (!form.name.trim()) return;
    onSubmit({ ...form, name: form.name.trim(), place: form.place.trim() });
    setForm(empty);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vend-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-vend-black">Add to queue</h2>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-vend-black">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <Field label="Location name" required>
            <TextInput value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. 2626 Cole" />
          </Field>

          <Field label="City, state">
            <TextInput value={form.place} onChange={(e) => patch({ place: e.target.value })} placeholder="e.g. Dallas, TX" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Number of lanes">
              <TextInput
                type="number"
                min="0"
                value={form.lanes}
                onChange={(e) => patch({ lanes: e.target.value })}
                placeholder="e.g. 2"
              />
            </Field>
            <Field label="Access type">
              <Select
                value={form.accessType}
                onChange={(e) => patch({ accessType: e.target.value })}
                options={ACCESS_TYPES}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contract state">
              <Select
                value={form.contractState}
                onChange={(e) => patch({ contractState: e.target.value })}
                options={CONTRACT_STATES}
              />
            </Field>
            <Field label="Potential go-live date requested">
              <TextInput
                type="date"
                value={form.potentialGoLiveDate}
                onChange={(e) => patch({ potentialGoLiveDate: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Sales person">
            <SalesRepSelect
              value={form.salesRep}
              salesReps={salesReps}
              onAddRep={onAddSalesRep}
              onChange={(v) => patch({ salesRep: v })}
            />
          </Field>

          <Field label="Property management">
            <TextInput
              value={form.propertyManagement}
              onChange={(e) => patch({ propertyManagement: e.target.value })}
              placeholder="Property management contact/company"
            />
          </Field>

          <Field label="Ownership">
            <TextInput
              value={form.ownership}
              onChange={(e) => patch({ ownership: e.target.value })}
              placeholder="Who owns the property"
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
            disabled={!form.name.trim()}
            className="rounded-full bg-vend-black px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            Add to queue
          </button>
        </div>
      </div>
    </div>
  );
}
