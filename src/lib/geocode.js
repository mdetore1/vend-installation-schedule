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


// ── State-aware lookup ────────────────────────────────────────────────────
// Queue deals come from HubSpot as "City, State" ("San Jose, California"),
// which the name-only city list above can't place (and would sometimes place
// in the wrong state — Arlington, Pasadena). These tables match city AND
// state, with the state's own centroid as the fallback when the city isn't
// listed, so almost every deal still lands on the map (flagged approximate).
const STATE_ROWS = `AL|alabama|32.8067|-86.7911
AK|alaska|61.3707|-152.4044
AZ|arizona|33.7298|-111.4312
AR|arkansas|34.9697|-92.3731
CA|california|36.1162|-119.6816
CO|colorado|39.0598|-105.3111
CT|connecticut|41.5978|-72.7554
DE|delaware|39.3185|-75.5071
DC|district of columbia|38.9072|-77.0369
FL|florida|27.7663|-81.6868
GA|georgia|33.0406|-83.6431
HI|hawaii|21.0943|-157.4983
ID|idaho|44.2405|-114.4788
IL|illinois|40.3495|-88.9861
IN|indiana|39.8494|-86.2583
IA|iowa|42.0115|-93.2105
KS|kansas|38.5266|-96.7265
KY|kentucky|37.6681|-84.6701
LA|louisiana|31.1695|-91.8678
ME|maine|44.6939|-69.3819
MD|maryland|39.0639|-76.8021
MA|massachusetts|42.2302|-71.5301
MI|michigan|43.3266|-84.5361
MN|minnesota|45.6945|-93.9002
MS|mississippi|32.7416|-89.6787
MO|missouri|38.4561|-92.2884
MT|montana|46.9219|-110.4544
NE|nebraska|41.1254|-98.2681
NV|nevada|38.3135|-117.0554
NH|new hampshire|43.4525|-71.5639
NJ|new jersey|40.2989|-74.5210
NM|new mexico|34.8405|-106.2485
NY|new york|42.1657|-74.9481
NC|north carolina|35.6301|-79.8064
ND|north dakota|47.5289|-99.7840
OH|ohio|40.3888|-82.7649
OK|oklahoma|35.5653|-96.9289
OR|oregon|44.5720|-122.0709
PA|pennsylvania|40.5908|-77.2098
RI|rhode island|41.6809|-71.5118
SC|south carolina|33.8569|-80.9450
SD|south dakota|44.2998|-99.4388
TN|tennessee|35.7478|-86.6923
TX|texas|31.0545|-97.5635
UT|utah|40.1500|-111.8624
VT|vermont|44.0459|-72.7107
VA|virginia|37.7693|-78.1700
WA|washington|47.4009|-121.4905
WV|west virginia|38.4912|-80.9545
WI|wisconsin|44.2685|-89.6165
WY|wyoming|42.7560|-107.3025`;
const CITY_ROWS = `AL|birmingham|33.5186|-86.8104
AL|huntsville|34.7304|-86.5861
AL|montgomery|32.3792|-86.3077
AL|mobile|30.6954|-88.0399
AL|florence|34.7998|-87.6773
AZ|phoenix|33.4484|-112.0740
AZ|tucson|32.2226|-110.9747
AZ|scottsdale|33.4942|-111.9261
AZ|tempe|33.4255|-111.9400
AZ|mesa|33.4152|-111.8315
AZ|chandler|33.3062|-111.8413
AZ|gilbert|33.3528|-111.7890
AZ|glendale|33.5387|-112.1860
AR|little rock|34.7465|-92.2896
CA|los angeles|34.0522|-118.2437
CA|san diego|32.7157|-117.1611
CA|san jose|37.3382|-121.8863
CA|san francisco|37.7749|-122.4194
CA|oakland|37.8044|-122.2712
CA|sacramento|38.5816|-121.4944
CA|fresno|36.7378|-119.7871
CA|long beach|33.7701|-118.1937
CA|santa monica|34.0195|-118.4912
CA|pasadena|34.1478|-118.1445
CA|irvine|33.6846|-117.8265
CA|anaheim|33.8366|-117.9143
CA|santa ana|33.7455|-117.8677
CA|burbank|34.1808|-118.3090
CA|glendale|34.1425|-118.2551
CA|beverly hills|34.0736|-118.4004
CA|culver city|34.0211|-118.3965
CA|walnut creek|37.9101|-122.0652
CA|palo alto|37.4419|-122.1430
CA|mountain view|37.3861|-122.0839
CA|sunnyvale|37.3688|-122.0363
CA|santa clara|37.3541|-121.9552
CA|redwood city|37.4852|-122.2364
CA|san mateo|37.5630|-122.3255
CA|berkeley|37.8715|-122.2730
CA|emeryville|37.8313|-122.2852
CA|santa barbara|34.4208|-119.6982
CA|riverside|33.9533|-117.3962
CA|san bernardino|34.1083|-117.2898
CA|bakersfield|35.3733|-119.0187
CA|stockton|37.9577|-121.2908
CA|newport beach|33.6189|-117.9298
CA|el segundo|33.9192|-118.4165
CA|torrance|33.8358|-118.3406
CA|carlsbad|33.1581|-117.3506
CA|pleasanton|37.6624|-121.8747
CA|fremont|37.5485|-121.9886
CA|cupertino|37.3230|-122.0322
CO|denver|39.7392|-104.9903
CO|boulder|40.0150|-105.2705
CO|colorado springs|38.8339|-104.8214
CO|aurora|39.7294|-104.8319
CO|fort collins|40.5853|-105.0844
CT|hartford|41.7658|-72.6734
CT|new haven|41.3083|-72.9279
CT|stamford|41.0534|-73.5387
DC|washington|38.9072|-77.0369
DE|wilmington|39.7391|-75.5398
FL|miami|25.7617|-80.1918
FL|orlando|28.5383|-81.3792
FL|tampa|27.9506|-82.4572
FL|jacksonville|30.3322|-81.6557
FL|fort lauderdale|26.1224|-80.1373
FL|west palm beach|26.7153|-80.0534
FL|boca raton|26.3683|-80.1289
FL|st petersburg|27.7676|-82.6403
FL|tallahassee|30.4383|-84.2807
FL|naples|26.1420|-81.7948
FL|sarasota|27.3364|-82.5307
FL|coral gables|25.7215|-80.2684
FL|hollywood|26.0112|-80.1495
FL|gainesville|29.6516|-82.3248
GA|atlanta|33.7490|-84.3880
GA|savannah|32.0809|-81.0912
GA|alpharetta|34.0754|-84.2941
GA|marietta|33.9526|-84.5499
GA|decatur|33.7748|-84.2963
GA|augusta|33.4735|-82.0105
GA|columbus|32.4610|-84.9877
HI|honolulu|21.3069|-157.8583
IL|chicago|41.8781|-87.6298
IL|naperville|41.7508|-88.1535
IL|evanston|42.0451|-87.6877
IL|oak brook|41.8398|-87.9281
IL|schaumburg|42.0334|-88.0834
IL|peoria|40.6936|-89.5890
IL|peoria heights|40.7365|-89.5765
IL|springfield|39.7817|-89.6501
IL|rosemont|41.9867|-87.8723
IN|indianapolis|39.7684|-86.1581
IN|fort wayne|41.0793|-85.1394
IN|carmel|39.9784|-86.1180
IN|bloomington|39.1653|-86.5264
IA|des moines|41.5868|-93.6250
KS|overland park|38.9822|-94.6708
KS|wichita|37.6872|-97.3301
KS|kansas city|39.1142|-94.6275
KY|louisville|38.2527|-85.7585
KY|lexington|38.0406|-84.5037
LA|new orleans|29.9511|-90.0715
LA|baton rouge|30.4515|-91.1871
MD|baltimore|39.2904|-76.6122
MD|bethesda|38.9847|-77.0947
MD|silver spring|38.9907|-77.0261
MD|silver springs|38.9907|-77.0261
MD|rockville|39.0840|-77.1528
MD|north bethesda|39.0396|-77.1198
MD|columbia|39.2037|-76.8610
MD|annapolis|38.9784|-76.4922
MD|gaithersburg|39.1434|-77.2014
MD|chevy chase|38.9968|-77.0711
MD|towson|39.4015|-76.6019
MD|college park|38.9807|-76.9369
MD|hyattsville|38.9559|-76.9455
MD|largo|38.8976|-76.8283
MD|frederick|39.4143|-77.4105
MA|boston|42.3601|-71.0589
MA|cambridge|42.3736|-71.1097
MA|wellesley|42.2968|-71.2924
MA|charlestown|42.3782|-71.0602
MA|worcester|42.2626|-71.8023
MA|springfield|42.1015|-72.5898
MA|somerville|42.3876|-71.0995
MA|brookline|42.3318|-71.1212
MA|quincy|42.2529|-71.0023
MA|waltham|42.3765|-71.2356
MA|burlington|42.5048|-71.1956
MA|newton|42.3370|-71.2092
MI|detroit|42.3314|-83.0458
MI|ann arbor|42.2808|-83.7430
MI|grand rapids|42.9634|-85.6681
MI|troy|42.6064|-83.1498
MI|southfield|42.4734|-83.2219
MI|lansing|42.7325|-84.5555
MN|minneapolis|44.9778|-93.2650
MN|st paul|44.9537|-93.0900
MN|bloomington|44.8408|-93.2983
MS|jackson|32.2988|-90.1848
MO|st louis|38.6270|-90.1994
MO|kansas city|39.0997|-94.5786
MO|clayton|38.6426|-90.3240
NE|omaha|41.2565|-95.9345
NE|lincoln|40.8136|-96.7026
NV|las vegas|36.1699|-115.1398
NV|reno|39.5296|-119.8138
NV|henderson|36.0395|-114.9817
NH|manchester|42.9956|-71.4548
NH|portsmouth|43.0718|-70.7626
NJ|newark|40.7357|-74.1724
NJ|jersey city|40.7178|-74.0431
NJ|hoboken|40.7440|-74.0324
NJ|princeton|40.3573|-74.6672
NJ|morristown|40.7968|-74.4815
NJ|paramus|40.9445|-74.0754
NJ|edison|40.5187|-74.4121
NJ|cherry hill|39.9348|-75.0307
NM|albuquerque|35.0844|-106.6504
NM|santa fe|35.6870|-105.9378
NY|new york|40.7128|-74.0060
NY|brooklyn|40.6782|-73.9442
NY|queens|40.7282|-73.7949
NY|long island city|40.7447|-73.9485
NY|buffalo|42.8864|-78.8784
NY|albany|42.6526|-73.7562
NY|rochester|43.1566|-77.6088
NY|white plains|41.0340|-73.7629
NY|syracuse|43.0481|-76.1474
NY|yonkers|40.9312|-73.8988
NC|charlotte|35.2271|-80.8431
NC|raleigh|35.7796|-78.6382
NC|durham|35.9940|-78.8986
NC|greensboro|36.0726|-79.7920
NC|winston salem|36.0999|-80.2442
NC|asheville|35.5951|-82.5515
NC|chapel hill|35.9132|-79.0558
NC|cary|35.7915|-78.7811
NC|wilmington|34.2257|-77.9447
OH|columbus|39.9612|-82.9988
OH|cleveland|41.4993|-81.6944
OH|cincinnati|39.1031|-84.5120
OH|dayton|39.7589|-84.1916
OH|toledo|41.6528|-83.5379
OH|akron|41.0814|-81.5190
OK|oklahoma city|35.4676|-97.5164
OK|tulsa|36.1540|-95.9928
OR|portland|45.5152|-122.6784
OR|eugene|44.0521|-123.0868
OR|salem|44.9429|-123.0351
PA|philadelphia|39.9526|-75.1652
PA|pittsburgh|40.4406|-79.9959
PA|king of prussia|40.0893|-75.3836
PA|harrisburg|40.2732|-76.8867
PA|allentown|40.6084|-75.4902
PA|conshohocken|40.0793|-75.3016
RI|providence|41.8240|-71.4128
SC|charleston|32.7765|-79.9311
SC|columbia|34.0007|-81.0348
SC|greenville|34.8526|-82.3940
TN|nashville|36.1627|-86.7816
TN|memphis|35.1495|-90.0490
TN|knoxville|35.9606|-83.9207
TN|chattanooga|35.0456|-85.3097
TN|franklin|35.9251|-86.8689
TX|dallas|32.7767|-96.7970
TX|houston|29.7604|-95.3698
TX|austin|30.2672|-97.7431
TX|san antonio|29.4241|-98.4936
TX|fort worth|32.7555|-97.3308
TX|plano|33.0198|-96.6989
TX|irving|32.8140|-96.9489
TX|frisco|33.1507|-96.8236
TX|arlington|32.7357|-97.1081
TX|el paso|31.7619|-106.4850
TX|bryan|30.6744|-96.3698
TX|college station|30.6280|-96.3344
TX|the woodlands|30.1658|-95.4613
TX|sugar land|29.6197|-95.6349
TX|richardson|32.9483|-96.7299
TX|addison|32.9618|-96.8292
TX|round rock|30.5083|-97.6789
TX|galveston|29.3013|-94.7977
TX|corpus christi|27.8006|-97.3964
TX|lubbock|33.5779|-101.8552
UT|salt lake city|40.7608|-111.8910
UT|provo|40.2338|-111.6585
UT|lehi|40.3916|-111.8508
VT|burlington|44.4759|-73.2121
VA|arlington|38.8816|-77.0910
VA|alexandria|38.8048|-77.0469
VA|tysons|38.9187|-77.2311
VA|mclean|38.9339|-77.1773
VA|richmond|37.5407|-77.4360
VA|virginia beach|36.8529|-75.9780
VA|norfolk|36.8508|-76.2859
VA|reston|38.9586|-77.3570
VA|fairfax|38.8462|-77.3064
VA|vienna|38.9012|-77.2653
VA|falls church|38.8823|-77.1711
VA|herndon|38.9696|-77.3861
VA|charlottesville|38.0293|-78.4767
VA|roanoke|37.2710|-79.9414
VA|ashburn|39.0438|-77.4874
WA|seattle|47.6062|-122.3321
WA|bellevue|47.6101|-122.2015
WA|tacoma|47.2529|-122.4443
WA|spokane|47.6588|-117.4260
WA|redmond|47.6730|-122.1215
WA|kirkland|47.6815|-122.2087
WA|vancouver|45.6387|-122.6615
WI|milwaukee|43.0389|-87.9065
WI|madison|43.0731|-89.4012
WV|charleston|38.3498|-81.6326`;

const STATE_BY_KEY = {};
for (const row of STATE_ROWS.split("\n")) {
  const [abbr, name, lat, lng] = row.split("|");
  const state = { abbr, name, lat: Number(lat), lng: Number(lng) };
  STATE_BY_KEY[abbr.toLowerCase()] = state;
  STATE_BY_KEY[name] = state;
}
const CITY_BY_KEY = {};
for (const row of CITY_ROWS.split("\n")) {
  const [abbr, city, lat, lng] = row.split("|");
  CITY_BY_KEY[`${city}|${abbr}`] = { lat: Number(lat), lng: Number(lng) };
}

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// A place's text plus its state spelled both ways, so searching "TX" finds
// "Houston, Texas" and searching "Texas" finds "Houston, TX".
export function placeSearchText(place) {
  const norm = normalize(place);
  if (!norm) return "";
  const parts = norm.split(",").map((p) => p.trim()).filter(Boolean);
  const state = STATE_BY_KEY[parts[parts.length - 1]];
  return state ? `${norm} ${state.abbr.toLowerCase()} ${state.name}` : norm;
}

export function geocodePlace(place) {
  const norm = normalize(place);
  if (!norm) return null;

  const parts = norm
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // "City, State": match on both first (exact and unambiguous). When the
  // last part is a state, it's excluded from the city-name checks below so
  // "Olympia, Washington" can't match the city "washington".
  const state = parts.length >= 2 ? STATE_BY_KEY[parts[parts.length - 1]] : null;
  const cityParts = state ? parts.slice(0, -1) : parts;
  if (state) {
    const hit = CITY_BY_KEY[`${cityParts.join(" ")}|${state.abbr}`] || CITY_BY_KEY[`${cityParts[0]}|${state.abbr}`];
    if (hit) return { lat: hit.lat, lng: hit.lng, precision: "city" };
  }

  // A known state with an unlisted city: plot at the state's center rather
  // than trusting a name-only match (which can't tell Portland, ME from
  // Portland, OR) or a substring match (which would drop "Ithaca, New York"
  // on NYC). Every city in the name-only list below is also in the
  // state-keyed table above, so nothing that used to place is lost.
  if (state) return { lat: state.lat, lng: state.lng, precision: "region" };

  for (const part of cityParts) {
    if (CITIES[part]) return { lat: CITIES[part][0], lng: CITIES[part][1], precision: "city" };
  }

  for (const key of Object.keys(CITIES)) {
    if (norm.includes(key)) return { lat: CITIES[key][0], lng: CITIES[key][1], precision: "city" };
  }
  for (const part of [...parts, norm]) {
    if (REGIONS[part]) return { lat: REGIONS[part][0], lng: REGIONS[part][1], precision: "region" };
    if (STATE_BY_KEY[part]) return { lat: STATE_BY_KEY[part].lat, lng: STATE_BY_KEY[part].lng, precision: "region" };
  }
  return null;
}
