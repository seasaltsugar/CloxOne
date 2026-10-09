// CloxOne places: bundled cities (cities-data.js) + any IANA zone (zones.js). Offline.
// A column id is either a city id ("new-york") or a raw zone ("tz:America/Kentucky/Monticello").
(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const Z = root.CLOX_ZONES || { cc: {}, legacy: {} };
  const ROWS = root.CLOX_CITY_ROWS || [];

  const MIDEAST = new Set(["AE", "SA", "QA", "KW", "BH", "OM", "IL", "JO", "LB", "SY", "IQ", "IR", "YE", "PS"]);
  const CC_REGION = {
    US: "americas", CL: "americas", EC: "americas", BM: "americas", FK: "americas", GS: "americas",
    IS: "europe", PT: "europe", ES: "europe", FO: "europe", CY: "europe", TR: "europe", RU: "europe", ZZ: "europe",
    CV: "africa", MU: "africa", SC: "africa", MG: "africa", RE: "africa", KM: "africa", YT: "africa", SH: "africa",
    MV: "asia", IO: "asia", CC: "oceania", CX: "oceania", AU: "oceania", NZ: "oceania"
  };
  function regionFor(cc, tz) {
    if (MIDEAST.has(cc)) return "mideast";
    if (CC_REGION[cc]) return CC_REGION[cc];
    const p = (tz || "").split("/")[0];
    return { America: "americas", Europe: "europe", Africa: "africa", Australia: "oceania", Pacific: "oceania",
             Asia: "asia", Atlantic: "europe", Indian: "asia", Antarctica: "oceania", Arctic: "europe" }[p] || "asia";
  }

  function isValidZone(tz) {
    try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch (e) { return false; }
  }
  // Maps legacy or alternative names (Asia/Calcutta, US/Eastern, GMT) to the tzdb name.
  // Case-insensitive so "america/new_york" works when typed.
  const lowerIndex = {};
  for (const z of Object.keys(Z.cc)) lowerIndex[z.toLowerCase()] = z;
  for (const [k, v] of Object.entries(Z.legacy)) lowerIndex[k.toLowerCase()] = v;
  function canonical(tz) {
    if (!tz) return null;
    const t = String(tz).trim();
    if (Z.cc[t]) return t;
    if (Z.legacy[t]) return Z.legacy[t];
    const hit = lowerIndex[t.toLowerCase()];
    if (hit) return hit;
    if (!isValidZone(t)) return null;
    // Valid for the browser but unknown to us: use the browser's own spelling.
    const resolved = new Intl.DateTimeFormat("en-US", { timeZone: t }).resolvedOptions().timeZone;
    return Z.legacy[resolved] || resolved;
  }

  const CITIES = ROWS.map(([id, name, cc, tz, aliases]) => ({ id, name, cc: cc === "ZZ" ? "" : cc, tz, aliases, region: regionFor(cc, tz) }));
  const BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c]));
  const FIRST_BY_TZ = {};
  for (const c of CITIES) if (!FIRST_BY_TZ[c.tz]) FIRST_BY_TZ[c.tz] = c;

  // Pseudo-city for a raw zone: name from the last path segment, country from zone.tab.
  function zoneCity(tz) {
    const z = canonical(tz) || tz;
    const cc = Z.cc[z] && Z.cc[z] !== "ZZ" ? Z.cc[z] : "";
    const name = z === "UTC" ? "UTC" : z.split("/").pop().replace(/_/g, " ");
    return { id: "tz:" + z, name, cc, tz: z, aliases: [], region: regionFor(cc || "ZZ", z), isZone: true };
  }

  function placeOf(id) {
    if (!id) return null;
    if (BY_ID[id]) return BY_ID[id];
    if (id.startsWith("tz:")) { const z = canonical(id.slice(3)); return z ? zoneCity(z) : null; }
    return null;
  }

  // Best column id for a detected zone: the main bundled city for it, else the raw zone.
  function idForZone(tz) {
    const z = canonical(tz) || "UTC";
    return FIRST_BY_TZ[z] ? FIRST_BY_TZ[z].id : "tz:" + z;
  }

  const api = { CITIES, BY_ID, ZONE_CC: Z.cc, regionFor, canonical, isValidZone, zoneCity, placeOf, idForZone, FIRST_BY_TZ };
  root.CloxPlaces = api;
  root.CLOX_CITIES = CITIES;
  root.CLOX_CITY_BY_ID = BY_ID;
  if (typeof module !== "undefined") module.exports = api;
})();
