import { useEffect, useState } from "react";
import { X, ExternalLink, CalendarCheck, MapPin } from "lucide-react";
import { Field, TextInput, Select, Toggle, Checkbox, Repeatable } from "../fields";
import { addDays, cascadeDates, UNASSIGNED } from "../../lib/dateUtils";
import { emptyPhase, defaultPhases } from "../../lib/locationDefaults";
import { hubspotDealUrl } from "../../lib/hubspot";

const TABS = [
  { key: "info", label: "Info" },
  { key: "edit", label: "Edit" },
];

function formatDate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(n) {
  if (n == null || n === "") return null;
  return `$${Math.round(Number(n)).toLocaleString("en-US")}`;
}

function formatCount(n) {
  if (n == null || n === "") return null;
  return Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-US") : n;
}

function InfoItem({ label, value }) {
  const empty = value == null || value === "";
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm ${empty ? "text-slate-300" : "font-semibold text-vend-black"}`}>
        {empty ? "—" : value}
      </dd>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-concrete-200">
      <h3 className="border-b border-concrete-200 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-4 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

// Headline numbers shown as tiles above the detail sections.
function StatTile({ label, value }) {
  const empty = value == null || value === "";
  return (
    <div className="rounded-2xl bg-concrete-100 px-3.5 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold leading-none ${empty ? "text-slate-300" : "text-vend-black"}`}>
        {empty ? "—" : value}
      </p>
    </div>
  );
}

// Stage pill + HubSpot link under the location name in the dialog header.
function LocationInfoHeader({ location }) {
  const stage = location.hubspotStage;
  if (!stage && !location.hubspotDealId) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
      {stage && (
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            stage === "Closed Won" ? "bg-mint-200/60 text-mint-700" : "bg-concrete-200 text-slate-600"
          }`}
        >
          {stage}
        </span>
      )}
      {location.hubspotDealId && (
        <a
          href={hubspotDealUrl(location.hubspotDealId)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF7A59] hover:underline"
        >
          Open in HubSpot <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

// Read-only reference view of a location: the HubSpot deal details carried
// over from the Sales queue (kept current by the sync) plus the location's
// own settings. Editing lives on the Edit tab.
function LocationInfo({ location, team }) {
  const salesPerson = team.find((t) => t.id === location.salesPersonId)?.name;
  // Street address from the HubSpot deal; falls back to city/state.
  const address = location.address || location.place;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-concrete-200 p-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-concrete-100 text-slate-500">
          <MapPin size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">Address</p>
          <p className={`mt-0.5 break-words text-sm ${address ? "font-semibold text-vend-black" : "text-slate-300"}`}>
            {address || "No address in HubSpot yet"}
          </p>
        </div>
        {address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-concrete-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-concrete-200 hover:text-vend-black"
          >
            Map <ExternalLink size={11} />
          </a>
        )}
      </div>

      {!location.hubspotDealId && (
        <p className="rounded-xl bg-concrete-100 px-3 py-2 text-xs text-slate-500">
          This location isn{"’"}t linked to a HubSpot deal, so there{"’"}s no deal info to show.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Deal ARR" value={formatCurrency(location.dealAmount)} />
        <StatTile label="Parking spaces" value={formatCount(location.numberOfParkingSpaces)} />
        <StatTile label="Kiosks" value={location.kiosks} />
        <StatTile label="Gates" value={formatCount(location.gates)} />
      </div>

      <InfoSection title="Deal">
        <InfoItem label="Contract signed" value={formatDate(location.contractSignedDate)} />
        <InfoItem label="Go-live requested" value={formatDate(location.potentialGoLiveDate)} />
        <InfoItem label="Sales rep" value={location.salesRep} />
        <InfoItem label="Sales person" value={salesPerson} />
      </InfoSection>

      <InfoSection title="Garage">
        <InfoItem label="Garage type" value={location.garageType} />
        <InfoItem label="Property type" value={location.propertyType} />
        <InfoItem label="Incumbent operator" value={location.incumbentOperator} />
        <InfoItem label="Access" value={location.accessType} />
        <InfoItem label="Onsite staff (Spark)" value={location.hasOnsiteStaff ? "Yes" : "No"} />
      </InfoSection>

      <InfoSection title="Hardware">
        <InfoItem label="Entry lanes" value={location.lanes} />
        <InfoItem label="Exit lanes" value={formatCount(location.exitLanes)} />
        <InfoItem label="Gates keep / new" value={location.gatesKeepNew} />
        <InfoItem label="LPR cameras" value={location.lpr} />
        <InfoItem label="Monthly parking billing" value={location.monthlyParkingBilling} />
      </InfoSection>

      <InfoSection title="Team & ownership">
        <InfoItem label="Contractor" value={location.contractor} />
        <InfoItem label="Property management" value={location.propertyManagement} />
        <InfoItem label="Ownership" value={location.ownership} />
      </InfoSection>
    </div>
  );
}

export default function AddLocationForm({
  open,
  onClose,
  team,
  onSubmit,
  title = "Add location",
  submitLabel = "Add location",
  initialName = "",
  initialPlace = "",
  initialContractor = "",
  initialHasOnsiteStaff = false,
  initialSalesPersonId = UNASSIGNED,
  initialPhases,
  // When set (editing an existing location), the dialog opens on a read-only
  // Info tab for this location, with the form below on an Edit tab.
  infoLocation,
  // False for view-only users: they get the Info tab alone, with no way into
  // the Edit form (saving would only be refused anyway).
  canEdit = true,
}) {
  const [name, setName] = useState(initialName);
  const [place, setPlace] = useState(initialPlace);
  const [contractor, setContractor] = useState(initialContractor || "Task Force");
  const [hasOnsiteStaff, setHasOnsiteStaff] = useState(initialHasOnsiteStaff);
  const [salesPersonId, setSalesPersonId] = useState(initialSalesPersonId || UNASSIGNED);
  const salesTeam = team.filter((t) => t.department === "Sales");
  const [phases, setPhases] = useState(() => initialPhases ?? defaultPhases(team));
  // Auto-cascading (push Install/Go-Live to the next Monday etc.) is a
  // useful default when phases don't have real dates yet, but it actively
  // fights an intentional overlap — e.g. Onboarding running long past
  // Install's start — on a location that's already scheduled. So it only
  // applies while adding a brand-new location, never while editing one.
  const isEditing = !!initialPhases;
  const [tab, setTab] = useState(infoLocation ? "info" : "edit");
  const showingInfo = !!infoLocation && (tab === "info" || !canEdit);

  // The read-only Info tab closes on Esc or a click outside the box. The Edit
  // tab and the Add form don't, so a stray click can't throw away edits.
  useEffect(() => {
    if (!open || !showingInfo) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, showingInfo, onClose]);

  if (!open) return null;

  function updatePhase(i, patch) {
    setPhases((ph) => {
      const patched = ph.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
      return "end" in patch && !isEditing ? cascadeDates(patched, ph[i].id) : patched;
    });
  }

  function submit() {
    if (!name.trim() || phases.length === 0) return;
    onSubmit({
      name: name.trim(),
      place: place.trim(),
      contractor: contractor.trim() || "Task Force",
      hasOnsiteStaff,
      salesPersonId,
      phases,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-vend-black/40 p-4"
      onMouseDown={(e) => {
        if (showingInfo && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ${
          infoLocation ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="border-b border-concrete-200 px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold text-vend-black">
              {infoLocation ? infoLocation.name : title}
            </h2>
            {infoLocation && <LocationInfoHeader location={infoLocation} />}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-concrete-100 hover:text-vend-black"
          >
            <X size={18} />
          </button>
        </div>

        {infoLocation && canEdit && (
          <div className="mt-4 flex gap-1.5" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  tab === t.key ? "bg-vend-black text-white" : "bg-concrete-200 text-slate-500 hover:bg-concrete-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
        {showingInfo ? (
          <LocationInfo location={infoLocation} team={team} />
        ) : (
        <div className="space-y-5">
          <Field label="Location name" required>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2626 Cole"
            />
          </Field>

          <Field label="City, state">
            <TextInput
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g. Dallas, TX"
            />
          </Field>

          <Field label="Contractor">
            <TextInput
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              placeholder="e.g. Task Force"
            />
          </Field>

          <Checkbox
            checked={hasOnsiteStaff}
            onChange={setHasOnsiteStaff}
            label="Has onsite staff (Spark)"
            description="Shows a Spark bubble next to the city on the Dashboard"
          />

          <Field label="Sales person">
            <Select
              value={salesPersonId}
              onChange={(e) => setSalesPersonId(e.target.value)}
              options={[
                { value: UNASSIGNED, label: "None" },
                ...salesTeam.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </Field>

          <Field label="Phases">
            {phases.length > 0 && (() => {
              const allConfirmed = phases.every((p) => p.confirmed);
              return (
                <button
                  type="button"
                  onClick={() => setPhases((ph) => ph.map((p) => ({ ...p, confirmed: !allConfirmed })))}
                  className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    allConfirmed
                      ? "bg-concrete-200 text-slate-500 hover:bg-concrete-300"
                      : "bg-mint-200/60 text-mint-700 hover:bg-mint-200"
                  }`}
                >
                  <CalendarCheck size={14} />
                  {allConfirmed ? "Set all back to proposed" : "Confirm all dates"}
                </button>
              );
            })()}
            <Repeatable
              items={phases}
              minRows={1}
              addLabel="Add phase"
              onAdd={() =>
                setPhases((ph) => [
                  ...ph,
                  emptyPhase(team, new Date(), addDays(new Date(), 7)),
                ])
              }
              onRemove={(i) => setPhases((ph) => ph.filter((_, idx) => idx !== i))}
              render={(phase, i) => (
                <div className="space-y-3">
                  <TextInput
                    value={phase.label}
                    onChange={(e) => updatePhase(i, { label: e.target.value })}
                    placeholder="Phase name"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput
                      type="date"
                      value={phase.start}
                      onChange={(e) => updatePhase(i, { start: e.target.value })}
                    />
                    <TextInput
                      type="date"
                      value={phase.end}
                      onChange={(e) => updatePhase(i, { end: e.target.value })}
                    />
                  </div>
                  <Select
                    value={phase.ownerId || UNASSIGNED}
                    onChange={(e) => updatePhase(i, { ownerId: e.target.value })}
                    options={[
                      { value: UNASSIGNED, label: "Unassigned" },
                      ...team.map((t) => ({ value: t.id, label: t.name })),
                    ]}
                  />
                  <Toggle
                    checked={phase.confirmed}
                    onChange={(v) => updatePhase(i, { confirmed: v })}
                    label="Confirmed"
                    description={phase.confirmed ? "Dates are locked in" : "Dates are still proposed"}
                  />
                </div>
              )}
            />
          </Field>
        </div>
        )}
        </div>

        <div className="flex justify-end gap-3 border-t border-concrete-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-concrete-100"
          >
            {showingInfo ? "Close" : "Cancel"}
          </button>
          {showingInfo ? (
            canEdit && (
              <button
                type="button"
                onClick={() => setTab("edit")}
                className="rounded-full bg-vend-black px-5 py-2 text-sm font-semibold text-white transition"
              >
                Edit location
              </button>
            )
          ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className="rounded-full bg-vend-black px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {submitLabel}
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
