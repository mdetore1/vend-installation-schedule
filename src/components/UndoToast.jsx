import { X } from "lucide-react";

export default function UndoToast({ action, onUndo, onDismiss }) {
  if (!action) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-full bg-vend-black px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
      <span>{action.label}</span>
      <button
        type="button"
        onClick={onUndo}
        className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide transition hover:bg-white/25"
      >
        Undo
      </button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-white/50 transition hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}
