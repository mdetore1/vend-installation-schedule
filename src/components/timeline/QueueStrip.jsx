import { useState } from "react";
import { ChevronDown, MapPin, Plus, Trash2 } from "lucide-react";
import { TextInput, Select } from "../fields";
import { formatShort, parseDate } from "../../lib/dateUtils";
import { ACCESS_TYPES, CONTRACT_STATES } from "../../lib/locationDefaults";
import AddQueueItemForm from "./AddQueueItemForm";
import SalesRepSelect from "./SalesRepSelect";

const miniInputCls = "!py-1.5 !text-xs";

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
    <span className="shrink-0 truncate rounded-full bg-concrete-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      {children}
    </span>
  );
}

function QueueRow({ item, salesReps, onAddSalesRep, onUpdate, onRemove, onPromote }) {
  const [expanded, setExpanded] = useState(false);
  const isClosedWon = item.contractState === "Closed Won";

  return (
    <div className="overflow-hidden rounded-xl border border-concrete-200 bg-white transition hover:border-concrete-300">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${isClosedWon ? "bg-go" : "bg-caution"}`}
          title={item.contractState || "In Progress"}
        />

        <input
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-32 shrink-0 truncate rounded border border-transparent bg-transparent text-sm font-bold text-vend-black outline-none transition focus:border-concrete-300 focus:bg-concrete-100/50 sm:w-40"
        />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {item.place && (
            <span className="flex shrink-0 items-center gap-1 truncate text-xs text-slate-400">
              <MapPin size={10} /> {item.place}
            </span>
          )}
          {item.accessType && <Chip>{item.accessType}</Chip>}
          {!!item.lanes && <Chip>{item.lanes} lanes</Chip>}
          {item.salesRep && <Chip>{item.salesRep}</Chip>}
          {item.propertyManagement && <Chip>PM: {item.propertyManagement}</Chip>}
          {item.ownership && <Chip>Owner: {item.ownership}</Chip>}
          {item.potentialGoLiveDate && <Chip>Go-live: {formatShort(parseDate(item.potentialGoLiveDate))}</Chip>}
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
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

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-concrete-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-caution-600 px-5 py-3 text-left text-vend-black transition hover:bg-caution-600/90"
      >
        <span className="text-sm font-semibold">
          Sales queue <span className="opacity-70">({queue.length})</span>
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 overflow-y-auto bg-concrete-100/40 p-3" style={{ maxHeight: "50vh" }}>
            {queue.length === 0 && (
              <p className="px-2 py-4 text-sm text-slate-400">
                Nothing in the queue — add a location sales is working on.
              </p>
            )}
            {queue.map((item) => (
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
