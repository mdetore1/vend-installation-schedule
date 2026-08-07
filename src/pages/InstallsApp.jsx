import { useState } from "react";
import { VendMark } from "../components/Logo";
import ProjectTracker from "./ProjectTracker";
import LocationsMap from "../components/globe/LocationsMap";

const TABS = [
  { id: "schedule", label: "Installation Schedule" },
  { id: "map", label: "Map" },
];

export default function InstallsApp() {
  const [view, setView] = useState("schedule");

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
