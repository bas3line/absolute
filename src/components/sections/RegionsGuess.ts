import { locations, type LocationId } from "@/lib/catalog";

/*
 * The nearest location, guessed from the clock. Nothing leaves the browser:
 * no IP lookup, no geolocation prompt. The time zone puts "you" on the map and
 * great-circle distance picks the location, except where a location is known to
 * serve a place better than raw distance would (India and Southeast
 * Asia go to Singapore, Canada to Montreal, Africa and the Middle East to London).
 */

export type You = { lat: number; lon: number };
export type Guess = { zone: string; id: LocationId | null; at: You | null };

/** Every location as a point. */
export const POINTS = locations.map((l) => ({ id: l.id, lon: l.x * 360 - 180, lat: 90 - l.y * 180 }));

// Zones sent to a location by rule rather than by distance.
const RULES: Record<string, LocationId> = {
  "Europe/London": "lhr",
  "Europe/Dublin": "lhr",
  "Europe/Belfast": "lhr",
  "Europe/Guernsey": "lhr",
  "Europe/Jersey": "lhr",
  "Europe/Isle_of_Man": "lhr",
  "Europe/Paris": "cdg",
  "Europe/Monaco": "cdg",
  "Europe/Amsterdam": "nl",
  "Europe/Brussels": "nl",
  "Europe/Luxembourg": "nl",
  "Asia/Kolkata": "sin",
  "Asia/Calcutta": "sin",
  "Asia/Colombo": "sin",
  "Asia/Dhaka": "sin",
  "Asia/Kathmandu": "sin",
  "Asia/Thimphu": "sin",
  "Asia/Yangon": "sin",
  "Asia/Rangoon": "sin",
  "Asia/Bangkok": "sin",
  "Asia/Ho_Chi_Minh": "sin",
  "Asia/Saigon": "sin",
  "Asia/Phnom_Penh": "sin",
  "Asia/Vientiane": "sin",
  "Asia/Jakarta": "sin",
  "Asia/Pontianak": "sin",
  "Asia/Makassar": "sin",
  "Asia/Jayapura": "sin",
  "Asia/Kuala_Lumpur": "sin",
  "Asia/Kuching": "sin",
  "Asia/Singapore": "sin",
  "Asia/Brunei": "sin",
  "Asia/Manila": "sin",
  "Asia/Dili": "sin",
  "Indian/Maldives": "sin",
  "Indian/Christmas": "sin",
  "Indian/Cocos": "sin",
  "Asia/Shanghai": "hkg",
  "Asia/Chongqing": "hkg",
  "Asia/Harbin": "hkg",
  "Asia/Urumqi": "hkg",
  "Asia/Hong_Kong": "hkg",
  "Asia/Macau": "hkg",
  "Asia/Taipei": "hkg",
  "Asia/Seoul": "hkg",
  "Asia/Pyongyang": "hkg",
  "Asia/Tokyo": "hkg",
  "Asia/Dubai": "lhr",
  "Asia/Muscat": "lhr",
  "Asia/Qatar": "lhr",
  "Asia/Bahrain": "lhr",
  "Asia/Kuwait": "lhr",
  "Asia/Riyadh": "lhr",
  "Asia/Aden": "lhr",
  "Asia/Baghdad": "lhr",
  "Asia/Tehran": "lhr",
  "Asia/Jerusalem": "lhr",
  "Asia/Tel_Aviv": "lhr",
  "Asia/Beirut": "lhr",
  "Asia/Damascus": "lhr",
  "Asia/Amman": "lhr",
  "Asia/Gaza": "lhr",
  "Asia/Hebron": "lhr",
  "Asia/Nicosia": "lhr",
  "Asia/Famagusta": "lhr",
};
// Whole areas sent by rule: Canada's zones are listed below, the rest go by their tz prefix.
const AREA_RULES: Record<string, LocationId> = { Canada: "yul", Australia: "sin", Africa: "lhr" };
const CANADA = new Set(
  [
    "Toronto",
    "Montreal",
    "Halifax",
    "St_Johns",
    "Winnipeg",
    "Regina",
    "Swift_Current",
    "Edmonton",
    "Vancouver",
    "Moncton",
    "Glace_Bay",
    "Goose_Bay",
    "Iqaluit",
    "Pangnirtung",
    "Whitehorse",
    "Dawson",
    "Dawson_Creek",
    "Creston",
    "Fort_Nelson",
    "Yellowknife",
    "Inuvik",
    "Cambridge_Bay",
    "Rankin_Inlet",
    "Resolute",
    "Thunder_Bay",
    "Nipigon",
    "Rainy_River",
    "Atikokan",
    "Coral_Harbour",
    "Blanc-Sablon",
  ].map((c) => `America/${c}`),
);

// Where a zone's own city is, so "you" lands there rather than on the area's rough latitude.
const HERE: Record<string, [number, number]> = {
  "America/New_York": [40.7, -74.0],
  "America/Detroit": [42.3, -83.0],
  "America/Chicago": [41.9, -87.6],
  "America/Denver": [39.7, -105.0],
  "America/Phoenix": [33.4, -112.1],
  "America/Los_Angeles": [34.1, -118.2],
  "America/Anchorage": [61.2, -149.9],
  "America/Toronto": [43.7, -79.4],
  "America/Montreal": [45.5, -73.6],
  "America/Halifax": [44.6, -63.6],
  "America/St_Johns": [47.6, -52.7],
  "America/Winnipeg": [49.9, -97.1],
  "America/Regina": [50.4, -104.6],
  "America/Edmonton": [53.5, -113.5],
  "America/Vancouver": [49.3, -123.1],
  "America/Mexico_City": [19.4, -99.1],
  "America/Havana": [23.1, -82.4],
  "America/Panama": [9.0, -79.5],
  "America/Puerto_Rico": [18.5, -66.1],
  "America/Bogota": [4.7, -74.1],
  "America/Caracas": [10.5, -66.9],
  "America/Lima": [-12.0, -77.0],
  "America/Santiago": [-33.4, -70.6],
  "America/Sao_Paulo": [-23.5, -46.6],
  "America/Argentina/Buenos_Aires": [-34.6, -58.4],
  "America/Buenos_Aires": [-34.6, -58.4],
  "Pacific/Honolulu": [21.3, -157.9],
  "Atlantic/Reykjavik": [64.1, -21.9],
  "Atlantic/Azores": [37.7, -25.7],
  "Atlantic/Canary": [28.1, -15.4],
  "Europe/London": [51.5, -0.1],
  "Europe/Dublin": [53.3, -6.3],
  "Europe/Lisbon": [38.7, -9.1],
  "Europe/Madrid": [40.4, -3.7],
  "Europe/Paris": [48.9, 2.4],
  "Europe/Brussels": [50.8, 4.4],
  "Europe/Amsterdam": [52.4, 4.9],
  "Europe/Luxembourg": [49.6, 6.1],
  "Europe/Zurich": [47.4, 8.5],
  "Europe/Berlin": [52.5, 13.4],
  "Europe/Copenhagen": [55.7, 12.6],
  "Europe/Oslo": [59.9, 10.8],
  "Europe/Stockholm": [59.3, 18.1],
  "Europe/Helsinki": [60.2, 24.9],
  "Europe/Rome": [41.9, 12.5],
  "Europe/Vienna": [48.2, 16.4],
  "Europe/Prague": [50.1, 14.4],
  "Europe/Warsaw": [52.2, 21.0],
  "Europe/Budapest": [47.5, 19.0],
  "Europe/Belgrade": [44.8, 20.5],
  "Europe/Bucharest": [44.4, 26.1],
  "Europe/Sofia": [42.7, 23.3],
  "Europe/Athens": [38.0, 23.7],
  "Europe/Istanbul": [41.0, 29.0],
  "Europe/Kyiv": [50.5, 30.5],
  "Europe/Kiev": [50.5, 30.5],
  "Europe/Minsk": [53.9, 27.6],
  "Europe/Moscow": [55.8, 37.6],
  "Africa/Casablanca": [33.6, -7.6],
  "Africa/Lagos": [6.5, 3.4],
  "Africa/Cairo": [30.0, 31.2],
  "Africa/Nairobi": [-1.3, 36.8],
  "Africa/Johannesburg": [-26.2, 28.0],
  "Asia/Jerusalem": [31.8, 35.2],
  "Asia/Riyadh": [24.7, 46.7],
  "Asia/Tehran": [35.7, 51.4],
  "Asia/Dubai": [25.2, 55.3],
  "Asia/Karachi": [24.9, 67.0],
  "Asia/Tashkent": [41.3, 69.2],
  "Asia/Kolkata": [22.6, 88.4],
  "Asia/Calcutta": [22.6, 88.4],
  "Asia/Dhaka": [23.8, 90.4],
  "Asia/Bangkok": [13.8, 100.5],
  "Asia/Ho_Chi_Minh": [10.8, 106.7],
  "Asia/Jakarta": [-6.2, 106.8],
  "Asia/Kuala_Lumpur": [3.1, 101.7],
  "Asia/Singapore": [1.35, 103.8],
  "Asia/Manila": [14.6, 121.0],
  "Asia/Hong_Kong": [22.3, 114.2],
  "Asia/Shanghai": [31.2, 121.5],
  "Asia/Taipei": [25.0, 121.6],
  "Asia/Seoul": [37.6, 127.0],
  "Asia/Tokyo": [35.7, 139.7],
  "Australia/Perth": [-31.95, 115.9],
  "Australia/Brisbane": [-27.5, 153.0],
  "Australia/Sydney": [-33.9, 151.2],
  "Australia/Melbourne": [-37.8, 145.0],
  "Pacific/Auckland": [-36.8, 174.8],
};
// A rough latitude for each tz area; longitude comes from the UTC offset.
const AREA_LAT: Record<string, number> = {
  Europe: 50,
  America: 15,
  Canada: 50,
  Atlantic: 30,
  Africa: 5,
  Asia: 30,
  Indian: -20,
  Australia: -30,
  Pacific: -15,
  Antarctica: -75,
  Arctic: 78,
};

/** Great-circle distance in radians. */
export function arc(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** The location closest to a point, among those `ok` lets through. */
export function closest(lat: number, lon: number, ok: (id: LocationId) => boolean = () => true) {
  let id: LocationId | null = null;
  let reach = Infinity;
  for (const p of POINTS) {
    if (!ok(p.id)) continue;
    const d = arc(lat, lon, p.lat, p.lon);
    if (d < reach) {
      reach = d;
      id = p.id;
    }
  }
  return id;
}

function guessNearest(): Guess {
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    zone = "";
  }
  const area = zone.split("/")[0];
  // UTC says nothing about where someone is, and Tor Browser reports it on purpose.
  const lat = AREA_LAT[area];
  if (lat === undefined && !HERE[zone]) return { zone, id: null, at: null };
  // The standard offset is the smaller of January's and July's, so summer time doesn't move the guess.
  const y = new Date().getFullYear();
  const off = -Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset()) / 60;
  const here = HERE[zone];
  const at = here ? { lat: here[0], lon: here[1] } : { lat, lon: Math.max(-180, Math.min(180, off * 15)) };
  const rule = RULES[zone] ?? (CANADA.has(zone) ? "yul" : AREA_RULES[area]);
  return { zone, id: rule ?? closest(at.lat, at.lon), at };
}

let cached: Guess | null = null;
export const readGuess = () => (cached ??= guessNearest());
export const noGuess = () => null;
export const subscribe = () => () => {};
