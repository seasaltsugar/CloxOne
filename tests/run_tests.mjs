// node tests/run_tests.mjs — logic tests for CloxOne (no browser needed).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import os from "node:os";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const ext = path.join(here, "..", "extension");
const T = require(path.join(ext, "js/time.js"));
const TIPS = require(path.join(ext, "js/tips.js"));
require(path.join(ext, "js/zones.js"));
require(path.join(ext, "js/cities-data.js"));
const PL = require(path.join(ext, "js/cities.js"));
const SR = require(path.join(ext, "js/search.js"));
const { CITIES } = PL;

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
};
const at = (iso) => Date.parse(iso);

// --- Time zones (PRD journey 1, Oct 26 2021 screenshot date had SF on PDT, not PST)
const t = at("2026-01-15T16:00:00Z"); // 8 AM in San Francisco (PST)
eq("SF 8 AM PST", T.wall(t, "America/Los_Angeles").hour, 8);
eq("London 4 PM", T.wall(t, "Europe/London").hour, 16);
eq("Tokyo 1 AM next day", [T.wall(t, "Asia/Tokyo").hour, T.dayDiff(T.wall(t, "Asia/Tokyo").date, T.wall(t, "America/Los_Angeles").date)], [1, 1]);
eq("India +5:30 shows :30", T.wall(t, "Asia/Kolkata").minute, 30);
eq("Nepal +5:45 shows :45", T.wall(t, "Asia/Kathmandu").minute, 45);
eq("Adelaide summer +10:30", T.offsetMinutes(t, "Australia/Adelaide"), 630);
eq("Offset label -8h", T.offsetLabel(-480), "−8h");
eq("Offset label +5:30h", T.offsetLabel(330), "+5:30h");
eq("Zone abbr SF winter", T.zoneAbbr(t, "America/Los_Angeles"), "PST");
eq("Zone abbr SF summer", T.zoneAbbr(at("2026-07-01T12:00:00Z"), "America/Los_Angeles"), "PDT");
eq("Zone abbr London summer", T.zoneAbbr(at("2026-07-01T12:00:00Z"), "Europe/London"), "BST");

// --- Day rows: 24 instants from local midnight; DST days keep real times
const rows = T.dayRows(t, "America/Los_Angeles");
eq("24 rows", rows.length, 24);
eq("Row 0 is local midnight", [T.wall(rows[0], "America/Los_Angeles").hour, T.wall(rows[0], "America/Los_Angeles").minute], [0, 0]);
const dst = T.dayRows(at("2026-03-08T20:00:00Z"), "America/Los_Angeles"); // spring-forward day
eq("Spring-forward: 2 AM skipped", dst.slice(0, 4).map((x) => T.wall(x, "America/Los_Angeles").hour), [0, 1, 3, 4]);
const fall = T.dayRows(at("2026-11-01T20:00:00Z"), "America/Los_Angeles");
eq("Fall-back: 1 AM repeats", fall.slice(0, 4).map((x) => T.wall(x, "America/Los_Angeles").hour), [0, 1, 1, 2]);
eq("12h format", T.formatTime({ hour: 0, minute: 0 }, false), { main: "12:00", suffix: "AM" });
eq("24h format", T.formatTime({ hour: 21, minute: 30 }, true), { main: "21:30", suffix: "" });

// --- Every bundled city has a valid IANA zone
const bad = CITIES.filter((c) => { try { new Intl.DateTimeFormat("en-US", { timeZone: c.tz }); return false; } catch (e) { return true; } });
eq("All city time zones valid", bad.map((c) => c.id), []);
eq("City ids unique", new Set(CITIES.map((c) => c.id)).size, CITIES.length);

// --- City list (500+), zones and aliases
eq("At least 500 cities", CITIES.length >= 500, true);
const zoneMismatch = CITIES.filter((c) => c.cc && PL.ZONE_CC[c.tz] !== c.cc).map((c) => c.id);
eq("Every city's zone belongs to its country (tzdb zone.tab)", zoneMismatch, []);
eq("Every zone.tab zone is usable", Object.keys(PL.ZONE_CC).filter((z) => !PL.isValidZone(z)), []);
eq("Chrome legacy name Asia/Calcutta -> Asia/Kolkata", PL.canonical("Asia/Calcutta"), "Asia/Kolkata");
eq("Legacy Europe/Kiev -> Europe/Kyiv", PL.canonical("Europe/Kiev"), "Europe/Kyiv");
eq("Lower-case typed zone accepted", PL.canonical("america/new_york"), "America/New_York");
eq("US/Eastern alias", PL.canonical("US/Eastern"), "America/New_York");
eq("Bogus zone rejected", PL.canonical("Mars/Olympus_Mons"), null);
eq("Detected Asia/Calcutta picks Mumbai as home", PL.idForZone("Asia/Calcutta"), "mumbai");
eq("Detected Asia/Saigon picks Ho Chi Minh City", PL.idForZone("Asia/Saigon"), "ho-chi-minh-city");
eq("Uncovered zone becomes a raw zone column", PL.idForZone("America/Kentucky/Monticello"), "tz:America/Kentucky/Monticello");
const zc = PL.placeOf("tz:Africa/Bujumbura");
eq("Raw zone place: name, country, region", [zc.name, zc.cc, zc.region], ["Bujumbura", "BI", "africa"]);
eq("Regions: Dubai mideast, Honolulu americas, Reykjavik europe", ["dubai", "honolulu", "reykjavik"].map((id) => PL.BY_ID[id].region), ["mideast", "americas", "europe"]);
const top = (q) => (SR.search(q)[0] || {}).id;
eq("Search NYC -> New York", top("NYC"), "new-york");
eq("Search Bombay -> Mumbai", top("Bombay"), "mumbai");
eq("Search Asia/Calcutta -> Mumbai", top("Asia/Calcutta"), "mumbai");
eq("Search PST -> Los Angeles", top("PST"), "los-angeles");
eq("Search IST -> Mumbai first", top("IST"), "mumbai");
eq("Search sao paulo (no accent) -> São Paulo", top("sao paulo"), "sao-paulo");
eq("Search Japan -> Tokyo", top("japan"), "tokyo");
eq("Search Bangalore -> Bengaluru", top("bangalore"), "bengaluru");
eq("Search raw IANA zone", top("America/Kentucky/Monticello"), "tz:America/Kentucky/Monticello");
eq("Search Monticello finds the zone", SR.search("Monticello").some((r) => r.id === "tz:America/Kentucky/Monticello"), true);
eq("Search Bujumbura -> city", top("Bujumbura"), "bujumbura");
eq("Search excludes existing columns", SR.search("NYC", { exclude: new Set(["new-york"]) }).some((r) => r.id === "new-york"), false);
eq("Empty search lists cities", SR.search("").length > 10, true);

// --- Holidays: run the real build script against a stub python-holidays, then decode in the extension code
const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), "clox-hol-"));
fs.writeFileSync(path.join(stubDir, "holidays.py"), `
import datetime
__version__ = "stub"
PUBLIC = "public"
class _H(dict):
    supported_languages = ("en_US",)
def list_supported_countries():
    return {"US": [], "JP": [], "IN": []}
def country_holidays(cc, years=None, **kw):
    h = _H()
    for y in (years or []):
        h[datetime.date(y, 1, 1)] = "New Year's Day"
        if cc == "JP": h[datetime.date(y, 10, 12)] = "Sports Day"
        if cc == "US": h[datetime.date(y, 7, 4)] = "Independence Day"
    return h
`);
const holOut = path.join(ext, "js", "holidays-data.js");
const holBackup = fs.readFileSync(holOut, "utf8");
try {
  execFileSync("python3", [path.join(here, "..", "tools", "build_holidays.py"), "--start", "2026", "--years", "10"],
    { env: { ...process.env, PYTHONPATH: stubDir }, stdio: "pipe" });
  const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(holOut, "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(ext, "js/holidays.js"), "utf8"), ctx);
  const H = ctx.CloxHolidays;
  eq("Holiday data spans 10 years", H.range(), [2026, 2035]);
  eq("Country-level lookup (JP, 2035)", H.on({ cc: "JP" }, "2035-10-12"), "Sports Day");
  eq("Country-level lookup (US)", H.on({ cc: "US" }, "2030-07-04"), "Independence Day");
  eq("Outside range hidden, not guessed", H.on({ cc: "US" }, "2036-07-04"), null);
  eq("Unknown country has none", H.on({ cc: "BI" }, "2026-01-01"), null);
  eq("Upcoming within 7 days", H.upcoming({ cc: "JP" }, "2026-10-09", 7, T.addDays), { date: "2026-10-12", name: "Sports Day", inDays: 3 });
} finally {
  fs.writeFileSync(holOut, holBackup); // keep the real (or placeholder) data file untouched
}

// --- Tip reminder schedule
const D = 86400000;
let s = TIPS.fresh(), now = at("2026-01-01T09:00:00Z");
const shownOn = [];
for (let day = 1; day <= 200; day++) {
  const today = new Date(now).toISOString().slice(0, 10);
  s = TIPS.recordOpen(s, today);
  if (TIPS.shouldShow(s, now, false)) { shownOn.push(s.days); s = TIPS.markShown(s, now); }
  now += D;
}
eq("Reminders on day 7, 37 (30-day gap), then every 60", shownOn, [7, 37, 97, 157]);
let s2 = TIPS.recordOpen(TIPS.fresh(), "2026-01-01"); s2.days = 10;
eq("Pro never sees reminders", TIPS.shouldShow(s2, Date.now(), true), false);
s2 = TIPS.markTipped(s2, at("2026-01-10T00:00:00Z"));
eq("Tipping pauses ~6 months", TIPS.shouldShow(Object.assign({}, s2, { days: 999 }), at("2026-05-01T00:00:00Z"), false), false);

// --- Licence keys: sign with the tool, verify with the extension's WebCrypto code
const tool = path.join(here, "..", "tools", "license_tool.mjs");
if (fs.existsSync(path.join(here, "..", "tools", "keys", "private-key.json"))) {
  const ctx = { window: {}, crypto: globalThis.crypto, atob, TextDecoder, console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ext, "js/config.js"), "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(ext, "js/license.js"), "utf8"), ctx);
  const key = execFileSync("node", [tool, "issue", "--plan", "lifetime", "--id", "T-1"]).toString().trim();
  eq("Valid key accepted", (await ctx.CloxLicense.verify(key, "2026-10-09")).valid, true);
  const tampered = key.replace(/\.([A-Za-z0-9_-])/, (m, c) => "." + (c === "e" ? "f" : "e"));
  eq("Tampered key rejected", (await ctx.CloxLicense.verify(tampered, "2026-10-09")).valid, false);
  const monthly = execFileSync("node", [tool, "issue", "--plan", "monthly", "--exp", "2026-01-31"]).toString().trim();
  eq("Expired key rejected", (await ctx.CloxLicense.verify(monthly, "2026-10-09")).valid, false);
  eq("Garbage rejected", (await ctx.CloxLicense.verify("hello", "2026-10-09")).valid, false);
} else {
  console.log("SKIP  licence tests (run: node tools/license_tool.mjs init)");
}

// --- Privacy: no network APIs anywhere in the extension code
const js = fs.readdirSync(path.join(ext, "js")).map((f) => fs.readFileSync(path.join(ext, "js", f), "utf8")).join("\n");
eq("No fetch/XHR/WebSocket/beacon in extension code", /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts/.test(js), false);
const manifest = JSON.parse(fs.readFileSync(path.join(ext, "manifest.json"), "utf8"));
eq("Only 'storage' permission, no host permissions", [manifest.permissions, manifest.host_permissions || []], [["storage"], []]);
eq("CSP blocks outbound connections", /connect-src 'none'/.test(manifest.content_security_policy.extension_pages), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
