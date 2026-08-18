// Shared "starter phases" logic for a new location — used both by the Add
// Location form and by promoting a sales-queue item straight onto the
// calendar, so both paths get the same Monday-Friday default scheduling.
import { newId } from "./storage";
import { toISO, addDays, cascadeDates, UNASSIGNED } from "./dateUtils";

export const ACCESS_TYPES = ["Free In", "Gateless", "Kiosk In"];
export const CONTRACT_STATES = ["In Progress", "Closed Won"];

export const TEAM_DEPARTMENTS = ["Operations", "Sales", "Contractors/Other"];
export const DEFAULT_DEPARTMENT = "Operations";

export function emptyPhase(team, start, end, label = "", ownerId) {
  return {
    id: newId(),
    label,
    ownerId: ownerId ?? team[0]?.id ?? UNASSIGNED,
    start: toISO(start),
    end: toISO(end),
    confirmed: false,
    done: false,
  };
}

export function findMemberByName(team, needle) {
  return team.find((t) => t.name.toLowerCase().includes(needle.toLowerCase()));
}

// Onboarding drives the schedule; Install/Go Live auto-follow via
// cascadeDates (next Monday → that Friday, each based on the phase before
// it) so the defaults shown on open are already in that pattern.
export function defaultPhases(team) {
  const now = new Date();
  const onboarding = emptyPhase(team, now, addDays(now, 45), "Onboarding");
  const install = emptyPhase(team, now, now, "Install", findMemberByName(team, "cerel")?.id);
  const goLive = emptyPhase(team, now, now, "Go Live");
  return cascadeDates([onboarding, install, goLive], onboarding.id);
}
