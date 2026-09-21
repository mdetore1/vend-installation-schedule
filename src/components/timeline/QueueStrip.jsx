import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ExternalLink, MapPin, Plus, Trash2 } from "lucide-react";
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
          <div className="w-36 shrink-0">
            {item.place && (
              <span className="flex items-center gap-1 truncate text-xs text-slate-400">
                <MapPin size={10} /> {item.place}
              </span>
            )}
          </div>
          <div className="w-20 shrink-0">{item.accessType && <Chip>{item.accessType}</Chip>}</div>
          <div className="w-16 shrink-0">{!!item.lanes && <Chip>{item.lanes} lanes</Chip>}</div>
          <div className="w-28 shrink-0">
            {item.salesRep && (
              <span className="block truncate rounded-full bg-beacon-100 px-2.5 py-1 text-center text-[11px] font-semibold text-beacon-700">
                {item.salesRep}
              </span>
            )}
          </div>
          <div className="w-28 shrink-0">{item.propertyManagement && <Chip>PM: {item.propertyManagement}</Chip>}</div>
          <div className="w-28 shrink-0">{item.ownership && <Chip>Owner: {item.ownership}</Chip>}</div>
          <div className="w-28 shrink-0">
            {item.potentialGoLiveDate && <Chip>Go-live: {formatShort(parseDate(item.potentialGoLiveDate))}</Chip>}
          </div>
          <div className="w-20 shrink-0">{!!item.dealAmount && <Chip>{formatCurrency(item.dealAmount)}</Chip>}</div>
          <div className="w-16 shrink-0">
            {item.hasOnsiteStaff && (
              <span className="block rounded-full bg-mint-200 px-2.5 py-1 text-center text-[11px] font-bold text-mint-700">
                Spark
              </span>
            )}
          </div>
          <div className="w-28 shrink-0">
            {item.hubspotStage && (
              <span
                className="block truncate rounded-full bg-[#FF7A59]/15 px-2.5 py-1 text-center text-[11px] font-bold text-[#FF7A59]"
                title="Synced from HubSpot"
              >
                {item.hubspotStage}
              </span>
            )}
          </div>
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

  const stages = useMemo(
    () => sortByStageOrder([...new Set(queue.map((q) => q.hubspotStage).filter(Boolean))]),
    [queue]
  );
  const filteredQueue = stageFilters.length ? queue.filter((q) => stageFilters.includes(q.hubspotStage)) : queue;

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
            ({filteredQueue.length}
            {stageFilters.length ? ` of ${queue.length}` : ""})
          </span>
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          {stages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-concrete-200 bg-white px-3 py-2">
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
          )}
          <div className="space-y-2 overflow-y-auto bg-concrete-100/40 p-3" style={{ maxHeight: "50vh" }}>
            {filteredQueue.length === 0 && (
              <p className="px-2 py-4 text-sm text-slate-400">
                {queue.length === 0
                  ? "Nothing in the queue — add a location sales is working on."
                  : "No queue items at these stages."}
              </p>
            )}
            {filteredQueue.map((item) => (
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
