// CloxOne place search: city names, aliases (NYC, Bombay), country names, time zone
// abbreviations (PST, IST), and raw IANA zones (America/Kentucky/Monticello). Offline.
(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const P = root.CloxPlaces;

  // Abbreviation -> city ids, most likely meaning first. Ambiguous ones list several.
  const ABBR = {
    PT: ["los-angeles"], PST: ["los-angeles"], PDT: ["los-angeles"], PACIFIC: ["los-angeles"],
    MT: ["denver", "phoenix"], MST: ["denver", "phoenix"], MDT: ["denver"], MOUNTAIN: ["denver"],
    CT: ["chicago"], CST: ["chicago", "shanghai", "taipei"], CDT: ["chicago"], CENTRAL: ["chicago"],
    ET: ["new-york"], EST: ["new-york"], EDT: ["new-york"], EASTERN: ["new-york"],
    AKST: ["anchorage"], AKDT: ["anchorage"], HST: ["honolulu"],
    AST: ["halifax", "riyadh"], ADT: ["halifax"], NST: ["st-johns"], NDT: ["st-johns"],
    GMT: ["utc", "london"], UTC: ["utc"], Z: ["utc"], BST: ["london", "dhaka"],
    IST: ["mumbai", "dublin", "jerusalem"], CET: ["paris", "berlin"], CEST: ["paris", "berlin"],
    EET: ["athens", "cairo"], EEST: ["athens"], WET: ["lisbon"], WEST: ["lisbon"], MSK: ["moscow"],
    TRT: ["istanbul"], GST: ["dubai"], PKT: ["karachi"], NPT: ["kathmandu"], ICT: ["bangkok", "ho-chi-minh-city"],
    WIB: ["jakarta"], WITA: ["denpasar"], WIT: ["jayapura"], SGT: ["singapore"], MYT: ["kuala-lumpur"],
    HKT: ["hong-kong"], PHT: ["manila"], JST: ["tokyo"], KST: ["seoul"],
    AEST: ["sydney", "brisbane"], AEDT: ["sydney", "melbourne"], ACST: ["adelaide", "darwin"], ACDT: ["adelaide"],
    AWST: ["perth"], NZST: ["auckland"], NZDT: ["auckland"], SAST: ["johannesburg"], WAT: ["lagos"],
    EAT: ["nairobi"], CAT: ["harare"], BRT: ["sao-paulo"], ART: ["buenos-aires"], IRST: ["tehran"]
  };

  function norm(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ʻ'’.]/g, "")
      .toLowerCase().replace(/[_/,\-()]+/g, " ").replace(/\s+/g, " ").trim();
  }

  let regionNames = null;
  function countryName(cc) {
    if (!cc) return "";
    try {
      if (!regionNames) regionNames = new Intl.DisplayNames(["en"], { type: "region" });
      return regionNames.of(cc) || "";
    } catch (e) { return ""; }
  }

  let index = null;
  function buildIndex() {
    index = P.CITIES.map((c, rank) => ({
      c, rank,
      name: norm(c.name),
      aliases: c.aliases.map(norm),
      country: norm(countryName(c.cc)),
      cc: c.cc.toLowerCase(),
      tz: norm(c.tz)
    }));
    return index;
  }

  function textScore(key, q) {
    if (!key) return 0;
    if (key === q) return 100;
    if (key.startsWith(q)) return 80;
    if (key.includes(" " + q)) return 65;
    if (q.length >= 3 && key.includes(q)) return 40;
    return 0;
  }

  // Returns [{kind:'city'|'zone', id, place, score}]
  function search(query, opts = {}) {
    const exclude = opts.exclude || new Set();
    const limit = opts.limit || 40;
    const idx = index || buildIndex();
    const raw = String(query || "").trim();
    const q = norm(raw);
    const out = new Map();
    const add = (id, place, kind, score) => {
      if (exclude.has(id)) return;
      const prev = out.get(id);
      if (!prev || prev.score < score) out.set(id, { kind, id, place, score });
    };

    if (!q) {
      for (const e of idx.slice(0, limit + exclude.size)) add(e.c.id, e.c, "city", 1);
      return [...out.values()].slice(0, limit);
    }

    // Abbreviations (PST, IST…)
    const ab = ABBR[raw.toUpperCase()] || ABBR[q.toUpperCase()];
    if (ab) ab.forEach((id, i) => P.BY_ID[id] && add(id, P.BY_ID[id], "city", 99 - i));

    // Cities
    for (const e of idx) {
      let s = textScore(e.name, q);
      for (const a of e.aliases) s = Math.max(s, textScore(a, q) - (textScore(a, q) === 100 ? 2 : 5));
      const cs = textScore(e.country, q);
      if (cs) s = Math.max(s, cs >= 80 ? cs - 30 : cs - 35);
      if (q.length === 2 && e.cc === q) s = Math.max(s, 50);
      const ts = textScore(e.tz, q);
      if (ts >= 80) s = Math.max(s, ts - 10);
      if (s > 0) add(e.c.id, e.c, "city", s - e.rank / 10000);
    }

    // Raw IANA zones (any zone in tzdb, plus legacy names like Asia/Calcutta)
    const typedZone = raw.includes("/") || /^(utc|gmt|zulu|etc\b)/i.test(raw) ? P.canonical(raw) : null;
    if (typedZone) {
      const main = P.FIRST_BY_TZ[typedZone];
      if (main) add(main.id, main, "city", 97);
      add("tz:" + typedZone, P.zoneCity(typedZone), "zone", 96);
    }
    if (q.length >= 3) {
      for (const z of Object.keys(P.ZONE_CC)) {
        const s = textScore(norm(z), q);
        if (s >= 40 && !P.FIRST_BY_TZ[z]) add("tz:" + z, P.zoneCity(z), "zone", s - 30);
      }
    }

    return [...out.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }

  const api = { search, norm, countryName, ABBR };
  root.CloxSearch = api;
  if (typeof module !== "undefined") module.exports = api;
})();
