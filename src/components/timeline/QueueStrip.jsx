import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Check, ChevronDown, ChevronRight, ExternalLink, Layers, MapPin, Plus, Trash2 } from "lucide-react";
import { TextInput, Select, Checkbox } from "../fields";
import { formatShort, parseDate } from "../../lib/dateUtils";
import { ACCESS_TYPES, CONTRACT_STATES } from "../../lib/locationDefaults";
import AddQueueItemForm from "./AddQueueItemForm";
import SalesRepSelect from "./SalesRepSelect";

const miniInputCls = "!py-1.5 !text-xs";
const HUBSPOT_PORTAL_ID = "7924065";
const hubspotDealUrl = (dealId) => `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-3/${dealId}`;

// Sales Pipeline's own stage order — the filter chips should read left to
// right the same way a deal actually progresses, not in whatever order
// stages happen to show up in the queue's data.
const STAGE_ORDER = ["Discovery", "Qualification", "Scoping", "Proof of Value", "Final Proposal", "Negotiation", "Closed Won"];
function sortByStageOrder(stages) {
  return [...stages].sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a);
    const bi = STAGE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// Sort options for the Sales Queue list. "Stage" (pipeline order, then
// name) is the default — matches how the queue reads without any explicit
// sort applied. Actual comparison lives in compareEntries below, since a
// grouped client card (see groupQueueItems) needs an aggregate value per
// mode, not just a single item's.
const SORT_OPTIONS = [
  { value: "stage", label: "Stage (pipeline order)" },
  { value: "amount-desc", label: "Deal amount (high to low)" },
  { value: "salesRep", label: "Sales rep (A–Z)" },
  { value: "name", label: "Name (A–Z)" },
  { value: "goLive", label: "Go-live date (soonest)" },
];

function stageRank(stage) {
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? STAGE_ORDER.length : i;
}

// Groups items that share a manually-set salesGroup label (e.g. "Station
// Square") — deliberately NOT the Dashboard/Map's map_groups table, since
// that grouping carries over onto whichever locations it names. This one
// is purely a Sales Queue view: promoting a grouped item drops the label
// entirely, so each garage still lands on the calendar as its own
// independent location. Only groups when 2+ items share a label, so
// setting a one-off label on a single item doesn't form a group of one.
function groupQueueItems(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = item.salesGroup?.trim() || null;
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(item);
  }
  const grouped = new Set();
  const groups = [];
  for (const [key, members] of byKey) {
    if (members.length < 2) continue;
    groups.push({ key, members });
    members.forEach((m) => grouped.add(m.id));
  }
  const standalone = items.filter((item) => !grouped.has(item.id));
  return { groups, standalone };
}

function entryName(entry) {
  return entry.type === "group" ? entry.key : entry.item.name;
}

// A group's value for a given sort mode is an aggregate over its members —
// summed deal amount, most-advanced stage, soonest go-live, etc. — so a
// group sorts alongside standalone items sensibly instead of needing its
// own separate section.
function entrySortValue(entry, mode) {
  if (mode === "amount-desc") {
    return entry.type === "group"
      ? entry.members.reduce((s, m) => s + (m.dealAmount || 0), 0)
      : entry.item.dealAmount || 0;
  }
  if (mode === "stage") {
    return entry.type === "group"
      ? Math.min(...entry.members.map((m) => stageRank(m.hubspotStage)))
      : stageRank(entry.item.hubspotStage);
  }
  if (mode === "salesRep") {
    return entry.type === "group" ? entry.members.find((m) => m.salesRep)?.salesRep || null : entry.item.salesRep || null;
  }
  if (mode === "goLive") {
    return entry.type === "group"
      ? entry.members.map((m) => m.potentialGoLiveDate).filter(Boolean).sort()[0] || null
      : entry.item.potentialGoLiveDate || null;
  }
  return entryName(entry);
}

function compareEntries(a, b, mode) {
  const av = entrySortValue(a, mode);
  const bv = entrySortValue(b, mode);
  if (mode === "amount-desc" || mode === "stage") return av - bv || entryName(a).localeCompare(entryName(b));
  if (av == null && bv == null) return entryName(a).localeCompare(entryName(b));
  if (av == null) return 1;
  if (bv == null) return -1;
  return String(av).localeCompare(String(bv)) || entryName(a).localeCompare(entryName(b));
}

function FieldMini({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="shrink-0 truncate rounded-full bg-concrete-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
      {children}
    </span>
  );
}

function formatCurrency(n) {
  const num = Number(n);
  if (!num) return "";
  return `$${num.toLocaleString()}`;
}

function QueueRow({ item, salesReps, onAddSalesRep, onUpdate, onRemove, onPromote }) {
  const [expanded, setExpanded] = useState(false);
  const isClosedWon = item.contractState === "Closed Won";

  return (
    <div className="overflow-hidden rounded-2xl border border-concrete-200 bg-white shadow-sm transition hover:border-concrete-300">
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 cursor-pointer"
        onClick={(e) => {
          if (e.target.closest("input, button, a")) return;
          setExpanded((v) => !v);
        }}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${isClosedWon ? "bg-go" : "bg-caution"}`}
          title={item.contractState || "In Progress"}
        />

        <input
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-64 shrink-0 truncate rounded border border-transparent bg-transparent font-display text-[15px] font-bold text-vend-black outline-none transition focus:border-concrete-300 focus:bg-concrete-100/50 sm:w-96"
        />

        {item.hubspotDealId && (
          <a
            href={hubspotDealUrl(item.hubspotDealId)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open this deal in HubSpot"
            className="flex shrink-0 items-center gap-1 rounded-full bg-[#FF7A59]/15 px-2 py-1 text-[11px] font-bold text-[#FF7A59] transition hover:bg-[#FF7A59]/25"
          >
            <ExternalLink size={11} /> HubSpot
          </a>
        )}

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {item.place && (
            <span className="flex shrink-0 items-center gap-1 truncate text-xs text-slate-400">
              <MapPin size={10} /> {item.place}
            </span>
          )}
          {item.salesRep && (
            <span className="shrink-0 truncate rounded-full bg-beacon-100 px-2.5 py-1 text-[11px] font-semibold text-beacon-700">
              {item.salesRep}
            </span>
          )}
          {!!item.dealAmount && <Chip>{formatCurrency(item.dealAmount)}</Chip>}
          {item.accessType && <Chip>{item.accessType}</Chip>}
          {!!item.lanes && <Chip>{item.lanes} lanes</Chip>}
          {item.hasOnsiteStaff && (
            <span className="shrink-0 rounded-full bg-mint-200 px-2.5 py-1 text-[11px] font-bold text-mint-700">Spark</span>
          )}
          {item.hubspotStage && (
            <span
              className="shrink-0 truncate rounded-full bg-[#FF7A59]/15 px-2.5 py-1 text-[11px] font-bold text-[#FF7A59]"
              title="Synced from HubSpot"
            >
              {item.hubspotStage}
            </span>
          )}
          {item.propertyManagement && <Chip>PM: {item.propertyManagement}</Chip>}
          {item.ownership && <Chip>Owner: {item.ownership}</Chip>}
          {item.potentialGoLiveDate && <Chip>Go-live: {formatShort(parseDate(item.potentialGoLiveDate))}</Chip>}
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            isClosedWon ? "bg-go-100 text-go-700" : "bg-caution-100 text-caution-700"
          }`}
        >
          {item.contractState || "In Progress"}
        </span>

        <button
          type="button"
          onClick={onPromote}
          disabled={!isClosedWon}
          title={isClosedWon ? "" : "Mark Closed Won to add this to the calendar"}
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-vend-black px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:opacity-30 sm:flex"
        >
          <Plus size={13} /> Add to calendar
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-full p-1.5 text-slate-300 transition hover:bg-concrete-100 hover:text-vend-black"
          aria-label={expanded ? "Hide editor" : "Edit details"}
          title="Edit details"
        >
          <ChevronDown size={15} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-full p-1.5 text-slate-300 transition hover:bg-alert-100 hover:text-alert-600"
          aria-label="Remove from queue"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Promote button falls here on narrow screens where it's hidden above */}
      <button
        type="button"
        onClick={onPromote}
        disabled={!isClosedWon}
        title={isClosedWon ? "" : "Mark Closed Won to add this to the calendar"}
        className="flex w-full items-center justify-center gap-1.5 border-t border-concrete-200 py-2 text-xs font-semibold text-vend-black transition disabled:cursor-not-allowed disabled:text-slate-300 sm:hidden"
      >
        <Plus size={13} /> Add to calendar
      </button>

      <div className={`grid transition-[grid-template-rows] duration-200 ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-3 border-t border-concrete-200 bg-concrete-100/30 p-3.5 sm:grid-cols-4">
            <FieldMini label="City, state">
              <TextInput
                value={item.place || ""}
                onChange={(e) => onUpdate({ place: e.target.value })}
                placeholder="City, state"
                className={miniInputCls}
              />
            </FieldMini>
            <FieldMini label="Contract state">
              <Select
                value={item.contractState || "In Progress"}
                onChange={(e) => onUpdate({ contractState: e.target.value })}
                options={CONTRACT_STATES}
                className={miniInputCls}
              />
            </FieldMini>
            <FieldMini label="Lanes">
              <TextInput
                type="number"
                min="0"
                value={item.lanes || ""}
                onChange={(e) => onUpdate({ lanes: e.target.value })}
                className={miniInputCls}
              />
            </FieldMini>
            <FieldMini label="Access">
              <Select
                value={item.accessType || ""}
                onChange={(e) => onUpdate({ accessType: e.target.value })}
                options={ACCESS_TYPES}
                className={miniInputCls}
              />
            </FieldMini>
            <FieldMini label="Go-live requested">
              <TextInput
                type="date"
                value={item.potentialGoLiveDate || ""}
                onChange={(e) => onUpdate({ potentialGoLiveDate: e.target.value })}
                className={miniInputCls}
              />
            </FieldMini>
            <FieldMini label="Sales rep">
              <SalesRepSelect
                value={item.salesRep}
                salesReps={salesReps}
                onAddRep={onAddSalesRep}
                onChange={(v) => onUpdate({ salesRep: v })}
                className={miniInputCls}
              />
            </FieldMini>
            <FieldMini label="Group (e.g. Station Square)">
              <TextInput
                list="sales-group-options"
                value={item.salesGroup || ""}
                onChange={(e) => onUpdate({ salesGroup: e.target.value })}
                placeholder="Same name on 2+ items groups them"
                className={miniInputCls}
              />
            </FieldMini>
            <FieldMini label="Property mgmt">
              <TextInput
                value={item.propertyManagement || ""}
                onChange={(e) => onUpdate({ propertyManagement: e.target.value })}
                className={miniInputCls}
              />
            </FieldMini>
            <FieldMini label="Ownership">
              <TextInput
                value={item.ownership || ""}
                onChange={(e) => onUpdate({ ownership: e.target.value })}
                className={miniInputCls}
              />
            </FieldMini>
            <FieldMini label="Onsite staff">
              <Checkbox
                checked={!!item.hasOnsiteStaff}
                onChange={(v) => onUpdate({ hasOnsiteStaff: v })}
                label="Spark"
              />
            </FieldMini>
          </div>

          {(item.hubspotDealId || item.garageType || item.numberOfParkingSpaces || item.propertyType || item.incumbentOperator || item.dealAmount || item.contractSignedDate) && (
            <div className="border-t border-concrete-200 p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                From HubSpot
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FieldMini label="Garage type">
                  <TextInput
                    value={item.garageType || ""}
                    onChange={(e) => onUpdate({ garageType: e.target.value })}
                    className={miniInputCls}
                  />
                </FieldMini>
                <FieldMini label="Parking spaces">
                  <TextInput
                    type="number"
                    min="0"
                    value={item.numberOfParkingSpaces || ""}
                    onChange={(e) => onUpdate({ numberOfParkingSpaces: e.target.value ? Number(e.target.value) : null })}
                    className={miniInputCls}
                  />
                </FieldMini>
                <FieldMini label="Property type">
                  <TextInput
                    value={item.propertyType || ""}
                    onChange={(e) => onUpdate({ propertyType: e.target.value })}
                    className={miniInputCls}
                  />
                </FieldMini>
                <FieldMini label="Incumbent operator">
                  <TextInput
                    value={item.incumbentOperator || ""}
                    onChange={(e) => onUpdate({ incumbentOperator: e.target.value })}
                    className={miniInputCls}
                  />
                </FieldMini>
                <FieldMini label="Deal amount">
                  <TextInput
                    type="number"
                    min="0"
                    prefix="$"
                    value={item.dealAmount || ""}
                    onChange={(e) => onUpdate({ dealAmount: e.target.value ? Number(e.target.value) : null })}
                    className={miniInputCls}
                  />
                </FieldMini>
                <FieldMini label="Contract signed">
                  <TextInput
                    type="date"
                    value={item.contractSignedDate || ""}
                    onChange={(e) => onUpdate({ contractSignedDate: e.target.value })}
                    className={miniInputCls}
                  />
                </FieldMini>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Collapsible client card for a set of queue items sharing a salesGroup
// label — same visual idea as the Dashboard's ClientGroupCard (a rollup
// with a total), but each member still renders as its own full QueueRow
// when expanded, so promoting one is exactly the same "Add to calendar"
// action as any standalone item.
function QueueGroupCard({ group, salesReps, onAddSalesRep, onUpdate, onRemove, onPromote }) {
  const [open, setOpen] = useState(false);
  const totalAmount = group.members.reduce((s, m) => s + (m.dealAmount || 0), 0);
  const anyClosedWon = group.members.some((m) => m.contractState === "Closed Won");

  return (
    <div className="overflow-hidden rounded-2xl border border-concrete-200 bg-white shadow-sm transition hover:border-concrete-300">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${anyClosedWon ? "bg-go" : "bg-caution"}`} />
        <Layers size={14} className="shrink-0 text-beacon-700" />
        <span className="font-display text-[15px] font-bold text-vend-black">{group.key}</span>
        <span className="shrink-0 rounded-full bg-beacon-100 px-2.5 py-1 text-[11px] font-semibold text-beacon-700">
          {group.members.length} garages
        </span>
        {!!totalAmount && <Chip>{formatCurrency(totalAmount)} total</Chip>}
        <ChevronRight size={15} className={`ml-auto shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      <div className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-2 border-t border-concrete-200 bg-concrete-100/40 p-2">
            {group.members.map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                salesReps={salesReps}
                onAddSalesRep={onAddSalesRep}
                onUpdate={(patch) => onUpdate(item.id, patch)}
                onRemove={() => onRemove(item.id)}
                onPromote={() => onPromote(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QueueStrip({
  queue,
  salesReps,
  onAddSalesRep,
  open,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
  onPromote,
}) {
  const [showAdd, setShowAdd] = useState(false);
  // Persisted per-browser so a saved view (e.g. "Negotiation + Final
  // Proposal" for a sales review) survives a reload instead of resetting.
  const [stageFilters, setStageFilters] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("salesQueueStageFilters") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("salesQueueStageFilters", JSON.stringify(stageFilters));
    } catch {
      // ignore — per-viewer convenience only
    }
  }, [stageFilters]);

  function toggleStageFilter(stage) {
    setStageFilters((prev) => (prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]));
  }

  const [sortMode, setSortMode] = useState(() => {
    try {
      return localStorage.getItem("salesQueueSortMode") || "stage";
    } catch {
      return "stage";
    }
  });
  const [sortOpen, setSortOpen] = useState(false);
  const sortBtnRef = useRef(null);
  const sortPanelRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem("salesQueueSortMode", sortMode);
    } catch {
      // ignore — per-viewer convenience only
    }
  }, [sortMode]);

  useEffect(() => {
    if (!sortOpen) return;
    const onDocDown = (e) => {
      if (sortBtnRef.current?.contains(e.target) || sortPanelRef.current?.contains(e.target)) return;
      setSortOpen(false);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [sortOpen]);

  const stages = useMemo(
    () => sortByStageOrder([...new Set(queue.map((q) => q.hubspotStage).filter(Boolean))]),
    [queue]
  );
  const existingGroupNames = useMemo(
    () => [...new Set(queue.map((q) => q.salesGroup).filter(Boolean))].sort(),
    [queue]
  );
  const activeSort = SORT_OPTIONS.find((s) => s.value === sortMode) || SORT_OPTIONS[0];
  const filteredItems = stageFilters.length ? queue.filter((q) => stageFilters.includes(q.hubspotStage)) : queue;
  const { groups, standalone } = groupQueueItems(filteredItems);
  const entries = [
    ...groups.map((g) => ({ type: "group", ...g })),
    ...standalone.map((item) => ({ type: "item", item })),
  ].sort((a, b) => compareEntries(a, b, sortMode));
  const filteredCount = groups.reduce((s, g) => s + g.members.length, 0) + standalone.length;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-concrete-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-caution-600 px-5 py-3 text-left text-vend-black transition hover:bg-caution-600/90"
      >
        <span className="text-sm font-semibold">
          Sales queue{" "}
          <span className="opacity-70">
            ({filteredCount}
            {stageFilters.length ? ` of ${queue.length}` : ""})
          </span>
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-concrete-200 bg-white px-3 py-2">
            {stages.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStageFilters([])}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    !stageFilters.length ? "bg-vend-black text-white" : "bg-concrete-200 text-slate-500 hover:bg-concrete-300"
                  }`}
                >
                  {!stageFilters.length && <Check size={11} />} All stages
                </button>
                {stages.map((s) => {
                  const active = stageFilters.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStageFilter(s)}
                      className={`flex items-center gap-1 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        active ? "bg-vend-black text-white" : "bg-concrete-200 text-slate-500 hover:bg-concrete-300"
                      }`}
                    >
                      {active && <Check size={11} />} {s}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div />
            )}

            <div className="relative shrink-0">
              <button
                ref={sortBtnRef}
                type="button"
                onClick={() => setSortOpen((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  sortOpen ? "border-vend-black bg-concrete-100 text-vend-black" : "border-concrete-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <ArrowUpDown size={12} /> Sort: {activeSort.label}
                <ChevronDown size={11} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              {sortOpen && (
                <div
                  ref={sortPanelRef}
                  className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-xl border border-concrete-200 bg-white p-1.5 shadow-xl"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortMode(opt.value);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                        opt.value === sortMode ? "bg-concrete-100 text-vend-black" : "text-slate-600 hover:bg-concrete-100/60"
                      }`}
                    >
                      {opt.value === sortMode ? <Check size={13} className="shrink-0" /> : <span className="w-[13px] shrink-0" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <datalist id="sales-group-options">
            {existingGroupNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="space-y-2 overflow-y-auto bg-concrete-100/40 p-3" style={{ maxHeight: "50vh" }}>
            {entries.length === 0 && (
              <p className="px-2 py-4 text-sm text-slate-400">
                {queue.length === 0
                  ? "Nothing in the queue — add a location sales is working on."
                  : "No queue items at these stages."}
              </p>
            )}
            {entries.map((entry) =>
              entry.type === "group" ? (
                <QueueGroupCard
                  key={entry.key}
                  group={entry}
                  salesReps={salesReps}
                  onAddSalesRep={onAddSalesRep}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onPromote={onPromote}
                />
              ) : (
                <QueueRow
                  key={entry.item.id}
                  item={entry.item}
                  salesReps={salesReps}
                  onAddSalesRep={onAddSalesRep}
                  onUpdate={(patch) => onUpdate(entry.item.id, patch)}
                  onRemove={() => onRemove(entry.item.id)}
                  onPromote={() => onPromote(entry.item.id)}
                />
              )
            )}
          </div>
          <div className="border-t border-concrete-200 bg-white p-3">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-concrete-300 px-3.5 py-2 text-sm font-semibold text-slate-500 transition hover:border-vend-black hover:text-vend-black"
            >
              <Plus size={15} /> Add to queue
            </button>
          </div>
        </div>
      </div>

      <AddQueueItemForm
        open={showAdd}
        salesReps={salesReps}
        onAddSalesRep={onAddSalesRep}
        onClose={() => setShowAdd(false)}
        onSubmit={(item) => {
          onAdd(item);
          setShowAdd(false);
        }}
      />
    </div>
  );
}
