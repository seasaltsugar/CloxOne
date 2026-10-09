// CloxOne time math. Pure functions on top of the browser's Intl API (offline DST rules).
(function () {
  const HOUR = 3600000;
  const fmtCache = new Map();

  function partsFormatter(tz) {
    let f = fmtCache.get(tz);
    if (!f) {
      f = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", weekday: "short"
      });
      fmtCache.set(tz, f);
    }
    return f;
  }

  // Wall-clock parts of instant t (ms) in timezone tz.
  function wall(t, tz) {
    const p = {};
    for (const x of partsFormatter(tz).formatToParts(new Date(t))) p[x.type] = x.value;
    const hour = Number(p.hour) % 24;
    return {
      y: Number(p.year), m: Number(p.month), d: Number(p.day), hour, minute: Number(p.minute),
      weekday: p.weekday, date: `${p.year}-${p.month}-${p.day}`
    };
  }

  // Offset of tz from UTC at instant t, in minutes.
  function offsetMinutes(t, tz) {
    const w = wall(t, tz);
    const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.hour, w.minute);
    return Math.round((asUtc - Math.floor(t / 60000) * 60000) / 60000);
  }

  // Instant of local midnight on the calendar date that contains instant t in tz.
  function startOfDay(t, tz) {
    const w = wall(t, tz);
    let guess = Date.UTC(w.y, w.m - 1, w.d, 0, 0);
    let ts = guess - offsetMinutes(guess, tz) * 60000;
    ts = guess - offsetMinutes(ts, tz) * 60000;
    // If midnight doesn't exist (rare DST at 00:00), step forward to first valid instant.
    if (wall(ts, tz).date !== w.date) ts += HOUR;
    return ts;
  }

  // 24 hourly row instants starting at local midnight of the home timezone.
  // Using instants (not wall-clock labels) keeps DST days and :30/:45 zones correct.
  function dayRows(now, homeTz, count = 24) {
    const start = startOfDay(now, homeTz);
    const rows = [];
    for (let i = 0; i < count; i++) rows.push(start + i * HOUR);
    return rows;
  }

  function dayDiff(dateA, dateB) {
    const a = Date.UTC(+dateA.slice(0, 4), +dateA.slice(5, 7) - 1, +dateA.slice(8, 10));
    const b = Date.UTC(+dateB.slice(0, 4), +dateB.slice(5, 7) - 1, +dateB.slice(8, 10));
    return Math.round((a - b) / 86400000);
  }

  function formatTime(w, use24) {
    const mm = String(w.minute).padStart(2, "0");
    if (use24) return { main: `${String(w.hour).padStart(2, "0")}:${mm}`, suffix: "" };
    const h12 = w.hour % 12 === 0 ? 12 : w.hour % 12;
    return { main: `${h12}:${mm}`, suffix: w.hour < 12 ? "AM" : "PM" };
  }

  // Short zone label such as "PDT", "BST", "JST"; falls back to "GMT+5:30".
  // Common abbreviations Intl doesn't provide in English locales (zones without DST only).
  const FIXED_ABBR = {
    "Asia/Tokyo": "JST", "Asia/Seoul": "KST", "Asia/Kolkata": "IST", "Asia/Shanghai": "CST", "Asia/Taipei": "CST",
    "Asia/Hong_Kong": "HKT", "Asia/Singapore": "SGT", "Asia/Manila": "PHT", "Asia/Jakarta": "WIB", "Asia/Bangkok": "ICT",
    "Asia/Ho_Chi_Minh": "ICT", "Asia/Kuala_Lumpur": "MYT", "Asia/Dubai": "GST", "Asia/Riyadh": "AST", "Asia/Qatar": "AST",
    "Asia/Karachi": "PKT", "Asia/Kathmandu": "NPT", "Asia/Tehran": "IRST", "Africa/Lagos": "WAT", "Africa/Nairobi": "EAT",
    "Africa/Addis_Ababa": "EAT", "Africa/Kigali": "CAT", "Africa/Johannesburg": "SAST", "Europe/Moscow": "MSK",
    "Europe/Istanbul": "TRT", "America/Lima": "PET", "America/Bogota": "COT", "America/Argentina/Buenos_Aires": "ART",
    "America/Sao_Paulo": "BRT", "America/Caracas": "VET",
    "Africa/Bujumbura": "CAT", "Africa/Lusaka": "CAT", "Africa/Harare": "CAT", "Africa/Maputo": "CAT",
    "Africa/Lubumbashi": "CAT", "Africa/Blantyre": "CAT", "Africa/Gaborone": "CAT", "Africa/Windhoek": "CAT",
    "Africa/Khartoum": "CAT", "Africa/Juba": "CAT", "Africa/Kinshasa": "WAT", "Africa/Luanda": "WAT",
    "Africa/Douala": "WAT", "Africa/Libreville": "WAT", "Africa/Brazzaville": "WAT", "Africa/Bangui": "WAT",
    "Africa/Malabo": "WAT", "Africa/Niamey": "WAT", "Africa/Ndjamena": "WAT", "Africa/Porto-Novo": "WAT",
    "Africa/Dar_es_Salaam": "EAT", "Africa/Kampala": "EAT", "Africa/Mogadishu": "EAT", "Africa/Djibouti": "EAT",
    "Africa/Asmara": "EAT", "Asia/Dhaka": "BST", "Asia/Kabul": "AFT", "Asia/Yangon": "MMT", "Asia/Colombo": "SLST",
    "Asia/Tashkent": "UZT", "Asia/Samarkand": "UZT", "Asia/Baku": "AZT", "Asia/Tbilisi": "GET", "Asia/Yerevan": "AMT",
    "Asia/Kuwait": "AST", "Asia/Bahrain": "AST", "Asia/Baghdad": "AST", "Asia/Aden": "AST", "Asia/Muscat": "GST",
    "Pacific/Fiji": "FJT", "America/La_Paz": "BOT", "America/Guayaquil": "ECT", "America/Montevideo": "UYT"
  };
  const abbrCache = new Map();
  function zoneAbbr(t, tz) {
    const key = tz + ":" + Math.floor(t / (6 * HOUR));
    if (abbrCache.has(key)) return abbrCache.get(key);
    let label = "";
    for (const loc of ["en-US", "en-GB", "en-AU", "en-IN", "en-NZ", "en-CA"]) {
      const p = new Intl.DateTimeFormat(loc, { timeZone: tz, timeZoneName: "short" })
        .formatToParts(new Date(t)).find((x) => x.type === "timeZoneName");
      if (p && !/^(GMT|UTC)[+-−]/.test(p.value)) { label = p.value; break; }
      if (!label && p) label = p.value;
    }
    if (/^(GMT|UTC)[+-−]/.test(label) && FIXED_ABBR[tz]) label = FIXED_ABBR[tz];
    abbrCache.set(key, label);
    return label;
  }

  function offsetLabel(mins) {
    const sign = mins < 0 ? "−" : "+";
    const a = Math.abs(mins);
    const h = Math.floor(a / 60), m = a % 60;
    return `${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}h`;
  }

  function addDays(dateStr, n) {
    const t = Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10)) + n * 86400000;
    return new Date(t).toISOString().slice(0, 10);
  }

  function weekdayOf(dateStr) {
    const t = Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10));
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(t).getUTCDay()];
  }

  const api = { HOUR, wall, offsetMinutes, startOfDay, dayRows, dayDiff, formatTime, zoneAbbr, offsetLabel, addDays, weekdayOf };
  const root = typeof window !== "undefined" ? window : globalThis;
  root.CloxTime = api;
  if (typeof module !== "undefined") module.exports = api;
})();
