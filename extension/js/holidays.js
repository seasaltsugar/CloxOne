// CloxOne public holidays, tracked per country (not per city or state).
// Data: holidays-data.js, generated at build time from python-holidays (MIT) by
// tools/build_holidays.py, covering 10 years. No network calls.
//
// Compact format per country:  { n: [names...], d: { "2026": "0101:0,0119:1,..." } }
// "MMDD:i" = month-day and an index into n. Decoded lazily, once per country.
(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const DB = root.CLOX_HOLIDAYS || { years: [], data: {} };
  const cache = new Map();

  function mapFor(cc) {
    if (!cc) return null;
    if (cache.has(cc)) return cache.get(cc);
    const raw = DB.data[cc];
    let m = null;
    if (raw) {
      m = new Map();
      for (const [year, list] of Object.entries(raw.d || {})) {
        if (!list) continue;
        for (const item of list.split(",")) {
          const [md, i] = item.split(":");
          m.set(`${year}-${md.slice(0, 2)}-${md.slice(2, 4)}`, raw.n[Number(i)]);
        }
      }
    }
    cache.set(cc, m);
    return m;
  }

  function covered(dateStr) {
    return DB.years.includes(Number(dateStr.slice(0, 4)));
  }

  // Holiday name on a date in the place's country, or null.
  // Years outside the bundled range return null (hidden, never guessed).
  function on(place, dateStr) {
    if (!place || !covered(dateStr)) return null;
    const m = mapFor(place.cc);
    return (m && m.get(dateStr)) || null;
  }

  function upcoming(place, dateStr, days, addDays) {
    for (let i = 1; i <= days; i++) {
      const d = addDays(dateStr, i);
      const name = on(place, d);
      if (name) return { date: d, name, inDays: i };
    }
    return null;
  }

  const hasData = () => DB.years.length > 0 && Object.keys(DB.data).length > 0;
  const range = () => (DB.years.length ? [Math.min(...DB.years), Math.max(...DB.years)] : null);

  const api = { on, upcoming, hasData, range, years: DB.years };
  root.CloxHolidays = api;
  if (typeof module !== "undefined") module.exports = api;
})();
