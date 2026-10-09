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

// Solid, saturated stage colors (badge = the stage pill, header = the stage
// accordion's bar, ink = readable text on that bar). Ink is fixed rather than
// theme-driven because these fills are the same bright color in light and
// dark mode.
export const STAGE_STYLES = {
  beacon: { badge: "bg-beacon text-white", dot: "bg-beacon", header: "bg-beacon", ink: "text-white" },
  caution: { badge: "bg-caution text-[#111114]", dot: "bg-caution", header: "bg-caution", ink: "text-[#111114]" },
  go: { badge: "bg-go text-[#111114]", dot: "bg-go", header: "bg-go", ink: "text-[#111114]" },
  mint: { badge: "bg-mint text-[#111114]", dot: "bg-mint", header: "bg-mint", ink: "text-[#111114]" },
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
