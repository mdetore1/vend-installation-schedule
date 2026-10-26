// Compact dollar label for the calendar: $48,000 -> "$48K", $1.2M -> "$1.2M".
export function formatArr(n) {
  const num = Number(n);
  if (!num) return "";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(num >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `$${Math.round(num).toLocaleString("en-US")}`;
}

// Total ARR for a set of locations. Garages split off one deal share its
// deal id (and amount), so each deal is counted once, not once per garage.
export function totalArr(locations) {
  const seen = new Set();
  let total = 0;
  for (const l of locations) {
    if (!l.dealAmount) continue;
    const key = l.hubspotDealId || l.id;
    if (seen.has(key)) continue;
    seen.add(key);
    total += Number(l.dealAmount);
  }
  return total;
}
