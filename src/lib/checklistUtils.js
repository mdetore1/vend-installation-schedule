// Blue → amber → green → mint: a deliberate "setup → in progress → live →
// wrapped up" progression using the brand guide's existing functional
// accent colors, reusing the bg-X-100/text-X-700 tint pairing already
// established elsewhere in this app (QueueStrip, TimelineGrid, GarageConfig).
export const STAGES = [
  { n: 1, label: "Pre-Onboarding", color: "beacon" },
  { n: 2, label: "Onboarding", color: "caution" },
  { n: 3, label: "Go Live", color: "go" },
  { n: 4, label: "Post Go-Live / Handoff", color: "mint" },
];

export const STAGE_STYLES = {
  beacon: { badge: "bg-beacon-100 text-beacon-700", dot: "bg-beacon-600", header: "bg-beacon-100/50" },
  caution: { badge: "bg-caution-100 text-caution-700", dot: "bg-caution-600", header: "bg-caution-100/50" },
  go: { badge: "bg-go-100 text-go-700", dot: "bg-go-600", header: "bg-go-100/50" },
  mint: { badge: "bg-mint-200 text-mint-700", dot: "bg-mint-600", header: "bg-mint-200/50" },
};

export function stageByNumber(n) {
  return STAGES.find((s) => s.n === n) || null;
}

// currentStage: the lowest stage with any incomplete item, or null once
// everything is done. A location with zero checked items still reports
// stage 1 here (that's correct — nothing has been completed yet).
export function summarizeChecklist(checklist) {
  const total = checklist.length;
  const done = checklist.filter((c) => c.done).length;
  const firstIncomplete = checklist.find((c) => !c.done);
  const currentStage = firstIncomplete ? firstIncomplete.stage : null;
  return { done, total, currentStage };
}

export function summarizeStage(checklist, stageN) {
  const items = checklist.filter((c) => c.stage === stageN);
  return { done: items.filter((c) => c.done).length, total: items.length };
}

// A manual stage override is a floor, not a permanent pin — it nudges the
// displayed stage forward of what the checklist alone would show (e.g.
// still waiting on one Pre-Onboarding task but the team's already moved on
// to Onboarding). Once automatic progress catches up to or passes it, this
// just returns the automatic value again, so display keeps advancing on its
// own from there instead of getting stuck at the manually-set stage.
// Fully complete (currentStage null) always wins over any override.
export function effectiveStage(checklist, override) {
  const { currentStage } = summarizeChecklist(checklist);
  if (currentStage === null) return null;
  if (!override) return currentStage;
  return Math.max(override, currentStage);
}
