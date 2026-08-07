import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Select, TextInput } from "../fields";

// A Select over the sales-rep roster, plus a small "+" that flips into an
// inline add-form for a new hire — mirrors the compact add patterns used
// elsewhere (team time-off, teammate add) rather than a separate modal.
export default function SalesRepSelect({ value, salesReps, onChange, onAddRep, className }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddRep(trimmed);
    onChange(trimmed);
    setName("");
    setAdding(false);
  }

  if (adding) {
    return (
      <div className="flex items-center gap-1">
        <TextInput
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setAdding(false);
              setName("");
            }
          }}
          placeholder="New sales person"
          className={className}
        />
        <button type="button" onClick={submit} className="shrink-0 text-go-700 transition hover:text-go" aria-label="Save">
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setName("");
          }}
          className="shrink-0 text-slate-300 transition hover:text-alert-600"
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={value || ""} onChange={(e) => onChange(e.target.value)} options={salesReps} className={className} />
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="shrink-0 rounded-full border border-dashed border-concrete-300 p-1.5 text-slate-400 transition hover:border-vend-black hover:text-vend-black"
        aria-label="Add new sales person"
        title="Add new sales person"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
