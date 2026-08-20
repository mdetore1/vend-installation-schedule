import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { uploadAttachment } from "../lib/attachments";

// Doubles as a drop target — dragging a file directly onto it uploads,
// same as clicking to browse. Shared by the Dashboard's task rows and
// Manage Template so both get the same behavior for free.
export default function AttachmentUploadButton({ onAdd }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function handleUpload(file) {
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
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          handleUpload(file);
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleUpload(e.dataTransfer.files?.[0]);
        }}
        disabled={uploading}
        className={`inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-[11px] font-semibold transition disabled:opacity-40 ${
          dragOver
            ? "border-mint-600 bg-mint-100 text-mint-700"
            : "border-transparent text-slate-400 hover:border-concrete-300 hover:text-vend-black"
        }`}
      >
        <Paperclip size={11} /> {uploading ? "Uploading…" : dragOver ? "Drop to upload" : "Add attachment"}
      </button>
      {error && <p className="mt-1 text-[11px] font-semibold text-alert-600">{error}</p>}
    </div>
  );
}
