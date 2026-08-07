// Every localStorage key this app writes — bundled together so a full
// backup/restore (or moving data from one browser/domain to another, since
// localStorage is scoped per-origin) is a single file instead of copying
// keys one at a time through devtools.
const KEYS = [
  "vend.projectTracker.v3",
  "vend.projectTracker.labelWidth",
  "vend.mapPins.v1",
  "vend.mapGroups.v1",
];

export function exportAllData() {
  const bundle = {};
  KEYS.forEach((k) => {
    const raw = localStorage.getItem(k);
    if (raw !== null) bundle[k] = raw;
  });
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `vend-installs-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllData(jsonText) {
  const bundle = JSON.parse(jsonText);
  KEYS.forEach((k) => {
    if (bundle[k] !== undefined) localStorage.setItem(k, bundle[k]);
  });
}
