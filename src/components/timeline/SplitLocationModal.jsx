import { useState } from "react";
import { X } from "lucide-react";
import { Field, TextInput } from "../fields";

// Splits one location into several garages under the same client name —
// e.g. "Four Oaks Place" (one row) becomes "Four Oaks Place 1/2/3" (three
// rows), each starting as a full copy of the original's timeline, grouped
// together the same way "Group locations" would group them by hand.
export default function SplitLocationModal({ open, location, onClose, onSubmit }) {
  const [count, setCount] = useState(2);

  if (!open || !location) return null;

  function submit() {
    const n = Math.max(2, Math.min(20, Number(count) || 2));
    onSubmit(n);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-vend-black/40 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-concrete-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-vend-black">Split into garages</h2>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-vend-black">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-6">
          <p className="text-sm text-slate-500">
            "{location.name}" will become {count} separate garages, each starting as a full copy of its current
            timeline, dates, and settings — grouped together under "{location.name}" so you can still tell they
            belong to the same client. You'll rename each one afterward.
          </p>
          <Field label="How many garages total?">
            <TextInput
              type="number"
              min="2"
              max="20"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 border-t border-concrete-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-concrete-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-vend-black px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Split into {Math.max(2, Math.min(20, Number(count) || 2))} garages
          </button>
        </div>
      </div>
    </div>
  );
}
