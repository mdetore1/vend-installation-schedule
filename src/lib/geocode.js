// Best-effort place-name → lat/lng lookup for the locations map. Location
// data only stores a free-text city string (not real coordinates), so this
// maps known values — plus a decent set of common US cities/states — to a
// point on the globe. Returns null rather than guessing when nothing
// reasonable matches, so callers can surface "couldn't place this one"
// instead of silently plotting it somewhere wrong.

const CITIES = {
  dallas: [32.7767, -96.797],
  boston: [42.3601, -71.0589],
  "peoria heights": [40.7365, -89.5765],
  peoria: [40.6936, -89.589],
  pasadena: [34.1478, -118.1445],
  scottsdale: [33.4942, -111.9261],
  denver: [39.7392, -104.9903],
  pittsburgh: [40.4406, -79.9959],
  "los angeles": [34.0522, -118.2437],
  "san francisco": [37.7749, -122.4194],
  arlington: [38.8816, -77.091],
  bethesda: [38.9847, -77.0947],
  tysons: [38.9187, -77.2311],
  austin: [30.2672, -97.7431],
  houston: [29.7604, -95.3698],
  bryan: [30.6744, -96.3698],
  washington: [38.9072, -77.0369],
  dc: [38.9072, -77.0369],
  "silver spring": [38.9907, -77.0261],
  "silver springs": [38.9907, -77.0261],
  "north bethesda": [39.0396, -77.1198],
  cambridge: [42.3736, -71.1097],
  wellesley: [42.2968, -71.2924],
  bellevue: [47.6101, -122.2015],
  charlestown: [42.3782, -71.0602],
  rockville: [39.084, -77.1528],
  "walnut creek": [37.9101, -122.0652],
  mclean: [38.9339, -77.1773],
  florence: [34.7998, -87.6773],
  // A modest set of other major US cities, so future queue/location entries
  // outside this session's seed data still have a decent shot at plotting.
  "new york": [40.7128, -74.006],
  chicago: [41.8781, -87.6298],
  miami: [25.7617, -80.1918],
  seattle: [47.6062, -122.3321],
  phoenix: [33.4484, -112.074],
  "san diego": [32.7157, -117.1611],
  atlanta: [33.749, -84.388],
  philadelphia: [39.9526, -75.1652],
  charlotte: [35.2271, -80.8431],
  nashville: [36.1627, -86.7816],
  minneapolis: [44.9778, -93.265],
  detroit: [42.3314, -83.0458],
  portland: [45.5152, -122.6784],
  "las vegas": [36.1699, -115.1398],
  orlando: [28.5383, -81.3792],
  tampa: [27.9506, -82.4572],
  "salt lake city": [40.7608, -111.891],
  "kansas city": [39.0997, -94.5786],
  columbus: [39.9612, -82.9988],
  indianapolis: [39.7684, -86.1581],
  cincinnati: [39.1031, -84.512],
  cleveland: [41.4993, -81.6944],
  baltimore: [39.2904, -76.6122],
  raleigh: [35.7796, -78.6382],
  richmond: [37.5407, -77.436],
};

// State/region-level fallbacks for vague place strings (no city given) —
// plotted at an approximate centroid, flagged as "region" precision rather
// than pretending to know the exact address.
const REGIONS = {
  "d.c.": [38.9072, -77.0369],
  "washington dc": [38.9072, -77.0369],
  mdv: [38.9072, -77.0369], // DC-Maryland-Virginia — no specific city given
  dmv: [38.9072, -77.0369],
  alabama: [32.8067, -86.7911],
  mass: [42.4072, -71.3824],
  massachusetts: [42.4072, -71.3824],
  tx: [31.9686, -99.9018],
  texas: [31.9686, -99.9018],
  ca: [36.7783, -119.4179],
  california: [36.7783, -119.4179],
  va: [37.4316, -78.6569],
  virginia: [37.4316, -78.6569],
  md: [39.0458, -76.6413],
  maryland: [39.0458, -76.6413],
  az: [34.0489, -111.0937],
  arizona: [34.0489, -111.0937],
  il: [40.6331, -89.3985],
  illinois: [40.6331, -89.3985],
  co: [39.5501, -105.7821],
  colorado: [39.5501, -105.7821],
  pa: [41.2033, -77.1945],
  pennsylvania: [41.2033, -77.1945],
  // A whole country — plotted at its most common business hub (Toronto),
  // not a true geographic center, since we have no city to go on.
  canada: [43.6532, -79.3832],
};

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function geocodePlace(place) {
  const norm = normalize(place);
  if (!norm) return null;

  const parts = norm
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (CITIES[part]) return { lat: CITIES[part][0], lng: CITIES[part][1], precision: "city" };
  }
  for (const key of Object.keys(CITIES)) {
    if (norm.includes(key)) return { lat: CITIES[key][0], lng: CITIES[key][1], precision: "city" };
  }
  for (const part of [...parts, norm]) {
    if (REGIONS[part]) return { lat: REGIONS[part][0], lng: REGIONS[part][1], precision: "region" };
  }
  return null;
}
