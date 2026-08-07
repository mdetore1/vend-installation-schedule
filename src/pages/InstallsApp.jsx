import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { VendMark } from "../components/Logo";
import { exportAllData, importAllData } from "../lib/exportImport";
import ProjectTracker from "./ProjectTracker";
import LocationsMap from "../components/globe/LocationsMap";

const TABS = [
  { id: "schedule", label: "Installation Schedule" },
  { id: "map", label: "Map" },
];

export default function InstallsApp() {
  const [view, setView] = useState("schedule");
  const fileInputRef = useRef(null);

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const proceed = window.confirm(
        "This replaces the schedule, map pins, and groups currently in this browser with the ones from that file. Continue?"
      );
      if (!proceed) return;
      try {
        importAllData(reader.result);
        window.location.reload();
      } catch {
        window.alert("That file doesn't look like a valid backup — nothing was changed.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex h-screen flex-col bg-concrete-100/50">
      <div className="flex shrink-0 items-center gap-4 border-b border-concrete-200 bg-white px-6 py-2.5">
        <VendMark size={32} />
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                view === t.id ? "bg-vend-black text-white" : "text-slate-500 hover:bg-concrete-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={exportAllData}
            title="Download a backup of everything in this browser"
            className="inline-flex items-center gap-1.5 rounded-full border border-concrete-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
          >
            <Download size={13} /> Export data
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Restore from a backup file (e.g. to move data to another browser/domain)"
            className="inline-flex items-center gap-1.5 rounded-full border border-concrete-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
          >
            <Upload size={13} /> Import data
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "schedule" && (
          <div className="h-full overflow-y-auto">
            <ProjectTracker />
          </div>
        )}
        {view === "map" && (
          <div className="h-full">
            <LocationsMap />
          </div>
        )}
      </div>
    </div>
  );
}
