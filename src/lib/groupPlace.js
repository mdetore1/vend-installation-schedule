// The city/state to show for a group of garages: the place most of its
// members share, when that's more than half of them. A group's garages are
// usually in the same city (or all but one), so showing it on the group is
// useful — but when they're genuinely spread out, showing one city would be
// wrong, so it shows nothing instead. Spacing/case differences ("Houston,
// TX" vs "houston,  tx") count as the same place.
export function groupPlace(locations) {
  const counts = new Map();
  for (const l of locations) {
    const label = (l.place || "").trim();
    if (!label) continue;
    const key = label.toLowerCase().replace(/\s+/g, " ");
    const entry = counts.get(key) || { label, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  let best = null;
  for (const entry of counts.values()) if (!best || entry.count > best.count) best = entry;
  return best && best.count * 2 > locations.length ? best.label : "";
}
