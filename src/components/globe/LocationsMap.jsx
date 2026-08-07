import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Layers, Plus, Trash2, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useScheduleStore } from "../../lib/scheduleStore";
import { useMapStore } from "../../lib/mapStore";
import { geocodePlace } from "../../lib/geocode";
import { Field, TextInput, Checkbox } from "../fields";

function normalizeName(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function wordsOf(s) {
  return normalizeName(s).split(" ").filter(Boolean);
}
// Loose match — the Installation Schedule and the live garage export don't
// always use identical names for the same building ("McPherson Building" vs
// "McPherson", "One Mobile Plaza" vs "Mobile Plaza / Trip Bower") — so two
// or more shared significant words counts as the same place.
function namesMatch(a, b) {
  const wa = wordsOf(a);
  const wb = wordsOf(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa);
  const shared = wb.filter((w) => w.length >= 3 && setA.has(w));
  return shared.length >= Math.min(2, Math.min(wa.length, wb.length));
}

function AddPinForm({ open, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  function submit() {
    if (!name.trim()) return;
    const geo = geocodePlace(place);
    if (!geo) {
      setError(`Couldn't find "${place}" — try a city and state, e.g. "Miami, FL".`);
      return;
    }
    onSubmit({ name: name.trim(), place: place.trim(), lat: geo.lat, lng: geo.lng });
    setName("");
    setPlace("");
    setError("");
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-vend-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 font-display text-lg font-bold text-vend-black">Add location to map</h2>
        <div className="space-y-3">
          <Field label="Location name" required>
            <TextInput
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New Garage"
            />
          </Field>
          <Field label="City, state">
            <TextInput value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Miami, FL" />
          </Field>
          {error && <p className="text-xs font-semibold text-alert-600">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              setError("");
            }}
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
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageGroupsModal({ open, onClose, groups, liveGarages, onCreateGroup, onUpdateGroup, onDeleteGroup }) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [groupName, setGroupName] = useState("");
  const [editingId, setEditingId] = useState(null);

  if (!open) return null;

  // While editing a group, its own current members stay selectable (so you
  // can add/remove from them); garages already claimed by a DIFFERENT group
  // are excluded either way.
  const groupedElsewhere = new Set(groups.filter((g) => g.id !== editingId).flatMap((g) => g.memberNames));
  const available = liveGarages.filter(
    (g) => !groupedElsewhere.has(g.name) && g.name.toLowerCase().includes(filter.toLowerCase())
  );

  function toggle(name) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function resetForm() {
    setEditingId(null);
    setGroupName("");
    setSelected(new Set());
    setFilter("");
  }

  function startEdit(g) {
    setEditingId(g.id);
    setGroupName(g.name);
    setSelected(new Set(g.memberNames));
    setFilter("");
  }

  function submit() {
    if (!groupName.trim() || selected.size < 2) return;
    if (editingId) {
      onUpdateGroup(editingId, { name: groupName.trim(), memberNames: [...selected] });
    } else {
      onCreateGroup({ name: groupName.trim(), memberNames: [...selected] });
    }
    resetForm();
  }

  function handleDelete(id) {
    onDeleteGroup(id);
    if (editingId === id) resetForm();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-vend-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-concrete-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-vend-black">Group garages</h2>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-slate-300 hover:text-vend-black"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {groups.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Existing groups</p>
              <div className="space-y-2">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                      editingId === g.id ? "border-vend-black bg-concrete-100/50" : "border-concrete-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-vend-black">{g.name}</p>
                      <p className="text-xs text-slate-400">{g.memberNames.length} lots</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(g)}
                        className="text-xs font-semibold text-slate-500 hover:text-vend-black"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id)}
                        className="text-xs font-semibold text-alert-600 hover:text-alert-700"
                      >
                        Ungroup
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {editingId ? "Editing group" : "Create a new group"}
              </p>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-500 hover:text-vend-black">
                  Cancel — start new group
                </button>
              )}
            </div>
            <div className="space-y-3">
              <Field label="Group name">
                <TextInput
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. One Arts Plaza"
                />
              </Field>
              <Field label="Filter garages">
                <TextInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Start typing a name…" />
              </Field>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-concrete-200 p-2">
                {available.length === 0 && <p className="px-2 py-3 text-sm text-slate-400">No matching garages.</p>}
                {available.map((g) => (
                  <div key={g.name} className="rounded-lg px-2 py-1.5 hover:bg-concrete-100/50">
                    <Checkbox checked={selected.has(g.name)} onChange={() => toggle(g.name)} label={g.name} description={`${g.city}, ${g.state}`} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">{selected.size} selected — pick at least 2 to group.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-concrete-200 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-concrete-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!groupName.trim() || selected.size < 2}
            className="rounded-full bg-vend-black px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {editingId ? "Save changes" : "Create group"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LocationsMap({ isAdmin = true }) {
  const { data } = useScheduleStore();
  const mapStore = useMapStore();
  const { liveGarages, mapPins, groups } = mapStore;
  const denyWrite = () => window.alert("You have view-only access — ask an admin to make this change.");
  const addPinRaw = isAdmin ? mapStore.addPin : denyWrite;
  const toggleLive = isAdmin ? mapStore.toggleLive : denyWrite;
  const removePin = isAdmin ? mapStore.removePin : denyWrite;
  const createGroup = isAdmin ? mapStore.createGroup : denyWrite;
  const updateGroup = isAdmin ? mapStore.updateGroup : denyWrite;
  const deleteGroup = isAdmin ? mapStore.deleteGroup : denyWrite;
  const [showAdd, setShowAdd] = useState(false);
  const [showGroups, setShowGroups] = useState(false);

  function addPin(fields) {
    addPinRaw(fields);
    setShowAdd(false);
  }

  // Garages that belong to a group render as one combined marker (at the
  // centroid of their members) instead of one pin per lot; everything else
  // still renders individually.
  const liveMarkers = useMemo(() => {
    const grouped = new Set(groups.flatMap((g) => g.memberNames));
    const ungrouped = liveGarages
      .filter((g) => !grouped.has(g.name))
      .map((g) => ({ id: g.name, name: g.name, members: [g], lat: g.lat, lng: g.lng }));
    const groupMarkers = groups
      .map((g) => {
        const members = liveGarages.filter((garage) => g.memberNames.includes(garage.name));
        if (!members.length) return null;
        return {
          id: g.id,
          name: g.name,
          members,
          lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
          lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
        };
      })
      .filter(Boolean);
    return [...ungrouped, ...groupMarkers];
  }, [groups, liveGarages]);

  // Active (not-yet-completed) Installation Schedule locations that don't
  // match any live garage are the ones still in the pipeline — "not live
  // yet." Completed locations are skipped since finishing onboarding means
  // they should already show up in the live garage export.
  const { upcomingPins, unmapped } = useMemo(() => {
    const activeLocations = data.locations.filter((l) => !l.archived);
    const upcoming = [];
    const cantPlace = [];
    activeLocations.forEach((loc) => {
      const isLive = liveGarages.some((g) => namesMatch(loc.name, g.name));
      if (isLive) return;
      const geo = geocodePlace(loc.place);
      if (!geo) {
        cantPlace.push(loc);
        return;
      }
      upcoming.push({
        id: loc.id,
        name: loc.name,
        place: loc.place,
        lat: geo.lat,
        lng: geo.lng,
        approx: geo.precision === "region",
      });
    });
    return { upcomingPins: upcoming, unmapped: cantPlace };
  }, [data.locations, liveGarages]);

  return (
    <div className="flex h-full w-full flex-col gap-4 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-vend-black">Locations map</h1>
          <p className="mt-1 text-sm text-slate-400">
            Scroll or pinch to zoom, drag to pan. Zoom in on a cluster to split it into individual garages.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-beacon" /> Live ({liveGarages.length + mapPins.filter((p) => p.live).length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-caution-600" /> Not live yet (
            {upcomingPins.length + mapPins.filter((p) => !p.live).length})
          </span>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setShowGroups(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-concrete-300 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
              >
                <Layers size={13} /> Group garages
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-vend-black px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              >
                <Plus size={13} /> Add location
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-1 overflow-hidden rounded-2xl border border-concrete-200">
          <MapContainer center={[39.5, -98.35]} zoom={4} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
              {liveMarkers.map((m) => (
                <CircleMarker
                  key={`live-${m.id}`}
                  center={[m.lat, m.lng]}
                  radius={m.members.length > 1 ? 9 : 7}
                  pathOptions={{ color: "#111114", weight: 1, fillColor: "#3E8BFF", fillOpacity: 0.9 }}
                >
                  <Tooltip direction="top" offset={[0, -6]} permanent>
                    {m.members.length > 1 ? `${m.name} (${m.members.length} lots)` : m.name}
                  </Tooltip>
                  <Popup>
                    <div className="text-sm font-semibold">{m.name}</div>
                    {m.members.length > 1 ? (
                      <ul className="mt-1 space-y-1 text-xs text-slate-500">
                        {m.members.map((g) => (
                          <li key={g.name}>
                            {g.name} — {g.street}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-500">
                        {m.members[0].street}, {m.members[0].city}, {m.members[0].state}
                      </div>
                    )}
                  </Popup>
                </CircleMarker>
              ))}
            </MarkerClusterGroup>
            {upcomingPins.map((p) => (
              <CircleMarker
                key={`upcoming-${p.id}`}
                center={[p.lat, p.lng]}
                radius={8}
                pathOptions={{ color: "#111114", weight: 1, fillColor: "#FFC24B", fillOpacity: 0.95 }}
              >
                <Tooltip direction="top" offset={[0, -6]} permanent>
                  {p.name} — not live yet{p.approx ? " (approx.)" : ""}
                </Tooltip>
              </CircleMarker>
            ))}
            {mapPins.map((p) => (
              <CircleMarker
                key={`pin-${p.id}`}
                center={[p.lat, p.lng]}
                radius={8}
                pathOptions={{
                  color: "#111114",
                  weight: 1,
                  fillColor: p.live ? "#3E8BFF" : "#FFC24B",
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} permanent>
                  {p.name}
                  {p.live ? "" : " (not live yet)"}
                </Tooltip>
                <Popup>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.place || "—"}</div>
                    </div>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleLive(p.id)}
                          className="w-full rounded-full bg-vend-black px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                        >
                          {p.live ? "Mark not live yet" : "Mark live"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removePin(p.id)}
                          className="flex w-full items-center justify-center gap-1 py-1 text-xs font-semibold text-alert-600 hover:text-alert-700"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {unmapped.length > 0 && (
          <div className="w-64 shrink-0 overflow-y-auto rounded-2xl border border-concrete-200 bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Couldn't place ({unmapped.length})
            </p>
            <ul className="space-y-2 text-sm">
              {unmapped.map((l) => (
                <li key={l.id} className="text-slate-500">
                  <span className="font-semibold text-vend-black">{l.name}</span>
                  {l.place ? ` — "${l.place}"` : " — no city set"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <AddPinForm open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addPin} />
      <ManageGroupsModal
        open={showGroups}
        onClose={() => setShowGroups(false)}
        groups={groups}
        liveGarages={liveGarages}
        onCreateGroup={createGroup}
        onUpdateGroup={updateGroup}
        onDeleteGroup={deleteGroup}
      />
    </div>
  );
}
