import { useRef, useState } from "react";
import { Check, ChevronDown, Image as ImageIcon, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { readLogoFile } from "../lib/logoFile";

/* ── shared styles ─────────────────────────────────────────────────────── */
const baseInput =
  "w-full rounded-xl border border-concrete-300 bg-white px-3.5 py-2.5 text-sm text-vend-black " +
  "placeholder:text-slate-300 outline-none transition " +
  "focus:border-vend-black focus-visible:ring-2 focus-visible:ring-mint-600/30";

/* ── Field wrapper (label + hint + error) ──────────────────────────────── */
export function Field({ label, hint, required, error, htmlFor, children }) {
  return (
    <div className="block">
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 flex items-baseline gap-1 text-sm font-semibold text-vend-black"
        >
          {label}
          {required && <span className="text-alert">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-alert-600">{error}</p>}
    </div>
  );
}

/* ── Text / number / textarea ──────────────────────────────────────────── */
export function TextInput({ prefix, suffix, className = "", ...props }) {
  if (prefix || suffix) {
    return (
      <div
        className={`flex items-center rounded-xl border border-concrete-300 bg-white transition focus-within:border-vend-black focus-within:ring-2 focus-within:ring-mint-600/30 ${className}`}
      >
        {prefix && <span className="pl-3.5 text-sm text-slate-400">{prefix}</span>}
        <input
          {...props}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-vend-black outline-none placeholder:text-slate-300"
        />
        {suffix && <span className="pr-3.5 text-sm text-slate-400">{suffix}</span>}
      </div>
    );
  }
  return <input {...props} className={`${baseInput} ${className}`} />;
}

export function Textarea({ className = "", rows = 3, ...props }) {
  return <textarea rows={rows} {...props} className={`${baseInput} resize-y ${className}`} />;
}

/* ── Phone input (auto-formats to (111) 111-1111) ──────────────────────── */
export function formatPhone(v) {
  const d = (v || "").replace(/\D/g, "").slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length > 0) return `(${d}`;
  return "";
}

export function PhoneInput({ value, onChange, className = "", ...props }) {
  return (
    <input
      type="tel"
      inputMode="tel"
      value={value || ""}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      className={`${baseInput} ${className}`}
      {...props}
    />
  );
}

/* ── Select ────────────────────────────────────────────────────────────── */
export function Select({ options = [], placeholder = "Select…", className = "", ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${baseInput} appearance-none pr-10 ${props.value ? "" : "text-slate-300"} ${className}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => {
          const value = typeof o === "string" ? o : o.value;
          const label = typeof o === "string" ? o : o.label;
          return (
            <option key={value} value={value} className="text-vend-black">
              {label}
            </option>
          );
        })}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

/* ── Radio cards (segmented choices) ───────────────────────────────────── */
export function RadioCards({ options = [], value, onChange, columns }) {
  const cols = columns || Math.min(options.length, 4);
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        const desc = typeof o === "object" ? o.description : null;
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`rounded-xl border px-3.5 py-3 text-left transition ${
              active
                ? "border-vend-black bg-vend-black text-white"
                : "border-concrete-300 bg-white text-vend-black hover:border-slate-300"
            }`}
          >
            <span className="block text-sm font-semibold">{label}</span>
            {desc && (
              <span className={`mt-0.5 block text-xs ${active ? "text-concrete-300" : "text-slate-400"}`}>
                {desc}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Chip multi-select ─────────────────────────────────────────────────── */
export function ChipMultiSelect({ options = [], value = [], onChange }) {
  const toggle = (v) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        const active = value.includes(val);
        return (
          <button
            key={val}
            type="button"
            onClick={() => toggle(val)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "border-vend-black bg-vend-black text-white"
                : "border-concrete-300 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            {active && <Check size={14} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Toggle (switch) ───────────────────────────────────────────────────── */
export function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span>
        {label && <span className="block text-sm font-semibold text-vend-black">{label}</span>}
        {description && <span className="mt-0.5 block text-xs text-slate-400">{description}</span>}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-go" : "bg-concrete-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/* ── Checkbox ──────────────────────────────────────────────────────────── */
export function Checkbox({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 text-left"
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          checked ? "border-vend-black bg-vend-black text-white" : "border-concrete-300 bg-white"
        }`}
      >
        {checked && <Check size={14} />}
      </span>
      <span>
        <span className="block text-sm font-medium text-vend-black">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-400">{description}</span>}
      </span>
    </button>
  );
}

/* ── File drop zone ────────────────────────────────────────────────────── */
export function FileDrop({ files = [], onChange, accept, multiple = true, hint }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const addFiles = (list) => {
    const incoming = Array.from(list).map((f) => ({ name: f.name, size: f.size }));
    onChange(multiple ? [...files, ...incoming] : incoming.slice(0, 1));
  };
  const remove = (i) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
          drag ? "border-mint-600 bg-mint-200/30" : "border-concrete-300 bg-concrete-100/40 hover:border-slate-300"
        }`}
      >
        <UploadCloud size={22} className="text-slate-400" />
        <p className="mt-2 text-sm font-medium text-vend-black">
          Drag &amp; drop or <span className="underline">browse</span>
        </p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-concrete-200 bg-white px-3 py-2 text-sm"
            >
              <span className="truncate text-vend-black">{f.name}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-3 text-slate-400 hover:text-alert-600"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Image drop (with live preview) ────────────────────────────────────── */
export function ImageDrop({ value, fileName, onChange, hint }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handle = (list) => readLogoFile(list?.[0], onChange);

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 transition ${
          drag ? "border-mint-600 bg-mint-200/30" : "border-concrete-300 bg-concrete-100/40 hover:border-slate-300"
        }`}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-concrete-200 bg-white">
          {value ? (
            <img src={value} alt="logo preview" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon size={20} className="text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-vend-black">
            {fileName ? fileName : <>Drag &amp; drop or <span className="underline">browse</span></>}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {fileName && !value ? "Received — preview not available for vector files" : hint}
          </p>
        </div>
        {fileName && (
          <button type="button" aria-label="Remove file"
            onClick={(e) => { e.stopPropagation(); onChange("", ""); }}
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-concrete-100 hover:text-alert-600">
            <X size={16} />
          </button>
        )}
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp,.ai,.eps,.pdf,.tif,.tiff"
          className="hidden" onChange={(e) => handle(e.target.files)} />
      </div>
    </div>
  );
}

/* ── Repeatable rows ───────────────────────────────────────────────────── */
export function Repeatable({ items = [], render, onAdd, onRemove, addLabel = "Add", minRows = 0 }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.id ?? i} className="relative rounded-xl border border-concrete-200 bg-concrete-100/40 p-4">
          {items.length > minRows && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute right-3 top-3 text-slate-300 transition hover:text-alert-600"
              aria-label="Remove"
            >
              <Trash2 size={16} />
            </button>
          )}
          {render(item, i)}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-full border border-concrete-300 bg-white px-3.5 py-2 text-sm font-semibold text-vend-black transition hover:border-vend-black"
      >
        <Plus size={15} />
        {addLabel}
      </button>
    </div>
  );
}
