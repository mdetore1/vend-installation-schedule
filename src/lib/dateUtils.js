// Day-math + owner-color helpers for the Project Tracker timeline.
// Dates are stored as "YYYY-MM-DD" strings; these helpers convert to/from
// local-midnight Date objects so day-diff math is DST-safe.

export function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function diffDays(a, b) {
  const MS = 86400000;
  return Math.round((startOfDay(b) - startOfDay(a)) / MS);
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

export function todayStart() {
  return startOfDay(new Date());
}

export function formatMonthYear(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatMonthShort(date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

export function formatShort(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// "Aug 14" for a single day, "Aug 14 – 18" for a range — takes ISO date
// strings directly since every caller already has them in that form.
export function formatDateRange(startISO, endISO) {
  if (!startISO) return "";
  if (!endISO || endISO === startISO) return formatShort(parseDate(startISO));
  return `${formatShort(parseDate(startISO))} – ${formatShort(parseDate(endISO))}`;
}

// Month tick marks for the timeline header, as day-offsets from rangeStart.
export function buildMonthTicks(rangeStart, rangeEnd) {
  const ticks = [];
  let cursor = startOfMonth(rangeStart);
  while (cursor <= rangeEnd) {
    const next = addMonths(cursor, 1);
    ticks.push({
      label: formatMonthShort(cursor),
      year: cursor.getFullYear(),
      dayOffset: diffDays(rangeStart, cursor),
      widthDays: diffDays(cursor, next),
    });
    cursor = next;
  }
  return ticks;
}

export function startOfQuarter(date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

export function addQuarters(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n * 3, 1);
}

// Quarter tick marks for the timeline header, as day-offsets from rangeStart.
export function buildQuarterTicks(rangeStart, rangeEnd) {
  const ticks = [];
  let cursor = startOfQuarter(rangeStart);
  while (cursor <= rangeEnd) {
    const next = addQuarters(cursor, 1);
    ticks.push({
      label: `Q${Math.floor(cursor.getMonth() / 3) + 1} ${cursor.getFullYear()}`,
      dayOffset: diffDays(rangeStart, cursor),
      widthDays: diffDays(cursor, next),
    });
    cursor = next;
  }
  return ticks;
}

// Shaded weekend (Sat+Sun) bands for the timeline body, as day-offsets from
// rangeStart, so weeks read visually the same way a real calendar would.
export function buildWeekendBands(rangeStart, rangeEnd) {
  const bands = [];
  const totalDays = diffDays(rangeStart, rangeEnd);
  let i = 0;
  while (i <= totalDays) {
    const day = addDays(rangeStart, i).getDay();
    if (day === 6) {
      bands.push({ dayOffset: i, widthDays: i + 1 <= totalDays ? 2 : 1 });
      i += 2;
    } else if (day === 0) {
      bands.push({ dayOffset: i, widthDays: 1 });
      i += 1;
    } else {
      i += 1;
    }
  }
  return bands;
}

// 8 brand-safe, visually distinct owner colors (functional accents +
// a couple of extra hues so an 8-person team stays distinguishable).
export const OWNER_PALETTE = [
  { bg: "#3E8BFF", text: "#FDFDFD" }, // beacon blue
  { bg: "#14D5A3", text: "#111114" }, // go green
  { bg: "#FFC24B", text: "#111114" }, // caution amber
  { bg: "#FF4D4F", text: "#FDFDFD" }, // alert red
  { bg: "#009F95", text: "#FDFDFD" }, // deep mint
  { bg: "#4A4A50", text: "#FDFDFD" }, // slate
  { bg: "#7C6FEA", text: "#FDFDFD" }, // violet
  { bg: "#FF7A45", text: "#FDFDFD" }, // coral
];

export function nextColor(team) {
  return OWNER_PALETTE[team.length % OWNER_PALETTE.length];
}

// Perceptual luminance → pick readable text color for any custom bg hex.
export function contrastText(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "#111114" : "#FDFDFD";
}

// Translucent tint of a hex color — a lighter, "see-through" fill instead of
// the full-strength color, e.g. for a badge background paired with the same
// color as its (full-strength) text.
export function hexToRgba(hex, alpha) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Sentinel ownerId for a phase that hasn't been assigned to anyone yet.
export const UNASSIGNED = "unassigned";

// Inclusive day-range overlap check — used to flag a phase whose owner is
// scheduled to be out during (part of) that phase's dates.
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return parseDate(aStart) <= parseDate(bEnd) && parseDate(bStart) <= parseDate(aEnd);
}

// Strictly-after next Monday (if `date` is itself a Monday, jumps a full
// week forward rather than returning the same day).
export function nextMondayAfter(date) {
  const day = date.getDay(); // 0=Sun … 6=Sat
  const daysUntilMonday = (8 - day) % 7 || 7;
  return addDays(date, daysUntilMonday);
}

// Canonical key for the standard onboarding pipeline phases, matched
// case/whitespace-insensitively — used to chain-schedule the phases that
// conventionally follow one another (installs/go-lives start Mondays and
// run through that Friday).
export function canonPhaseLabel(label) {
  const l = (label || "").trim().toLowerCase();
  if (l === "onboarding") return "onboarding";
  // Substring match — real phase bars get renamed to things like "Install
  // South Ramp Entrance" for a specific site's install, and those should
  // still count as the location's Install phase everywhere this is used
  // (Dashboard date pills, cascade scheduling, sorting).
  if (l.includes("install")) return "install";
  if (l === "go live" || l === "go-live" || l === "golive") return "golive";
  return null;
}

// When a canonical phase's end date changes, auto-schedule the next phase(s)
// in the pipeline: Onboarding → Install (next Monday → that Friday) →
// Go Live (next Monday → that Friday). Auto-set phases are marked
// unconfirmed since they're a starting suggestion, not a locked-in date.
// No-ops if there's no matching downstream phase to update.
export function cascadeDates(phases, changedPhaseId) {
  const changed = phases.find((p) => p.id === changedPhaseId);
  const changedCanon = changed ? canonPhaseLabel(changed.label) : null;
  if (!changedCanon || changedCanon === "golive") return phases;

  let result = phases;
  const findByCanon = (canon) => result.find((p) => canonPhaseLabel(p.label) === canon);

  function applyDates(canon, start, end) {
    const target = findByCanon(canon);
    if (!target) return null;
    result = result.map((p) =>
      p.id === target.id ? { ...p, start: toISO(start), end: toISO(end), confirmed: false } : p
    );
    return end;
  }

  if (changedCanon === "onboarding") {
    const installStart = nextMondayAfter(parseDate(changed.end));
    const installEnd = addDays(installStart, 4);
    const appliedEnd = applyDates("install", installStart, installEnd);
    if (appliedEnd) {
      const goLiveStart = nextMondayAfter(appliedEnd);
      applyDates("golive", goLiveStart, addDays(goLiveStart, 4));
    }
  } else if (changedCanon === "install") {
    const goLiveStart = nextMondayAfter(parseDate(changed.end));
    applyDates("golive", goLiveStart, addDays(goLiveStart, 4));
  }

  return result;
}

// Earliest start date among a location's Install/Go-Live phases — used to
// auto-order the main calendar soonest-first. Falls back to the earliest
// phase of any kind if it has no Install/Go-Live phase yet, so brand-new
// locations still sort sensibly instead of vanishing to one end.
export function earliestScheduleDate(phases) {
  const relevant = phases.filter((p) => {
    const canon = canonPhaseLabel(p.label);
    return canon === "install" || canon === "golive";
  });
  const pool = relevant.length ? relevant : phases;
  if (!pool.length) return null;
  return pool.reduce((min, p) => {
    const d = parseDate(p.start);
    return !min || d < min ? d : min;
  }, null);
}

// Go Live phase's start date — used to auto-order the main calendar
// soonest-go-live-first. Falls back to earliestScheduleDate (Install, or any
// phase) when a location has no Go Live phase yet, so brand-new locations
// still sort sensibly instead of vanishing to one end.
export function goLiveStart(phases) {
  const golive = phases.find((p) => canonPhaseLabel(p.label) === "golive");
  return golive ? parseDate(golive.start) : earliestScheduleDate(phases);
}

// Latest end date among a location's phases — used to auto-order the
// Completed section most-recently-finished-first.
export function latestScheduleDate(phases) {
  if (!phases.length) return null;
  return phases.reduce((max, p) => {
    const d = parseDate(p.end);
    return !max || d > max ? d : max;
  }, null);
}

// "install" while today falls inside that location's Install phase dates,
// "golive" while today falls inside its Go Live phase dates, else null —
// drives the Dashboard's calendar-driven highlight (on for the duration of
// whichever phase is currently active, off again once Go Live has passed).
export function calendarPhaseHighlight(phases) {
  const today = todayStart().getTime();
  const inRange = (phase) => {
    if (!phase) return false;
    return today >= parseDate(phase.start).getTime() && today <= parseDate(phase.end).getTime();
  };
  const install = phases.find((p) => canonPhaseLabel(p.label) === "install");
  const golive = phases.find((p) => canonPhaseLabel(p.label) === "golive");
  if (inRange(install)) return "install";
  if (inRange(golive)) return "golive";
  return null;
}

export function initialsOf(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
