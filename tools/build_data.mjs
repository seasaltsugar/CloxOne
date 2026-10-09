#!/usr/bin/env node
// Builds extension/js/cities.js and extension/js/zones.js from tools/data/.
//   node tools/build_data.mjs
// Validates every city: real IANA zone, zone belongs to the city's country (tzdb zone.tab),
// unique ids. Fails loudly on any problem so bad data never ships.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, "data");
const OUT = path.join(here, "..", "extension", "js");
const errors = [];

// ---- zone.tab: zone -> country
const zoneCC = {};
for (const line of fs.readFileSync(path.join(DATA, "zone.tab"), "utf8").split("\n")) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [cc, zone] = line.split("\t");
  zoneCC[zone.trim()] = cc.trim();
}
zoneCC["UTC"] = "ZZ";

const valid = (tz) => { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch (e) { return false; } };

// ---- Legacy names: what Chrome's ICU reports (e.g. Asia/Calcutta) -> tzdb name (Asia/Kolkata)
const legacy = {};
for (const zone of Object.keys(zoneCC)) {
  if (!valid(zone)) { errors.push(`zone.tab zone not known to ICU: ${zone}`); continue; }
  const resolved = new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
  if (resolved !== zone) legacy[resolved] = zone;
}
// Old and alternative names people type.
const MANUAL = {
  "US/Eastern": "America/New_York", "US/Central": "America/Chicago", "US/Mountain": "America/Denver",
  "US/Pacific": "America/Los_Angeles", "US/Alaska": "America/Anchorage", "US/Hawaii": "Pacific/Honolulu",
  "US/Arizona": "America/Phoenix", "Canada/Eastern": "America/Toronto", "Canada/Central": "America/Winnipeg",
  "Canada/Mountain": "America/Edmonton", "Canada/Pacific": "America/Vancouver", "Canada/Atlantic": "America/Halifax",
  "Canada/Newfoundland": "America/St_Johns", "Asia/Calcutta": "Asia/Kolkata", "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu", "Asia/Rangoon": "Asia/Yangon", "Asia/Dacca": "Asia/Dhaka",
  "Asia/Thimbu": "Asia/Thimphu", "Asia/Ulan_Bator": "Asia/Ulaanbaatar", "Asia/Macao": "Asia/Macau",
  "Asia/Chongqing": "Asia/Shanghai", "Asia/Chungking": "Asia/Shanghai", "Asia/Harbin": "Asia/Shanghai",
  "Asia/Tel_Aviv": "Asia/Jerusalem", "Asia/Istanbul": "Europe/Istanbul", "Europe/Kiev": "Europe/Kyiv",
  "America/Godthab": "America/Nuuk", "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Indianapolis": "America/Indiana/Indianapolis", "America/Louisville": "America/Kentucky/Louisville",
  "America/Montreal": "America/Toronto", "Australia/ACT": "Australia/Sydney", "Australia/NSW": "Australia/Sydney",
  "Australia/Canberra": "Australia/Sydney", "Australia/Victoria": "Australia/Melbourne",
  "Australia/Queensland": "Australia/Brisbane", "Australia/West": "Australia/Perth", "Australia/South": "Australia/Adelaide",
  "Australia/North": "Australia/Darwin", "Australia/Tasmania": "Australia/Hobart", "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Truk": "Pacific/Chuuk", "Pacific/Ponape": "Pacific/Pohnpei", "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Belfast": "Europe/London", "GB": "Europe/London", "Eire": "Europe/Dublin", "Japan": "Asia/Tokyo",
  "PRC": "Asia/Shanghai", "ROK": "Asia/Seoul", "ROC": "Asia/Taipei", "Singapore": "Asia/Singapore",
  "Hongkong": "Asia/Hong_Kong", "Israel": "Asia/Jerusalem", "Iran": "Asia/Tehran", "Egypt": "Africa/Cairo",
  "Turkey": "Europe/Istanbul", "NZ": "Pacific/Auckland", "Brazil/East": "America/Sao_Paulo",
  "Mexico/General": "America/Mexico_City", "Etc/UTC": "UTC", "Etc/GMT": "UTC", "GMT": "UTC", "Zulu": "UTC",
  "Universal": "UTC", "UCT": "UTC", "Etc/Universal": "UTC", "Etc/Zulu": "UTC"
};
for (const [from, to] of Object.entries(MANUAL)) {
  if (!zoneCC[to]) errors.push(`alias target not in zone.tab: ${from} -> ${to}`);
  if (!legacy[from]) legacy[from] = to;
}

// ---- Cities
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ʻ'’.]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cities = [];
const ids = new Set();
let lineNo = 0;
for (const line of fs.readFileSync(path.join(DATA, "cities.txt"), "utf8").split("\n")) {
  lineNo++;
  if (!line.trim() || line.startsWith("#")) continue;
  const [name, cc, tz, aliasStr = ""] = line.split("|").map((x) => x.trim());
  if (!name || !cc || !tz) { errors.push(`line ${lineNo}: needs Name|CC|Zone`); continue; }
  if (!valid(tz)) errors.push(`line ${lineNo}: ${name}: unknown zone ${tz}`);
  else if (zoneCC[tz] !== cc && !(cc === "UA" && tz === "Europe/Simferopol")) errors.push(`line ${lineNo}: ${name}: zone ${tz} belongs to ${zoneCC[tz] || "?"}, not ${cc}`);
  let id = slug(name);
  if (ids.has(id)) id = `${id}-${cc.toLowerCase()}`;
  if (ids.has(id)) errors.push(`line ${lineNo}: duplicate id ${id}`);
  ids.add(id);
  const aliases = aliasStr ? aliasStr.split(";").map((a) => a.trim()).filter(Boolean) : [];
  cities.push([id, name, cc, tz, aliases]);
}

if (errors.length) {
  console.error(`build_data: ${errors.length} problem(s):\n  ` + errors.join("\n  "));
  process.exit(1);
}

const header = "// Generated by tools/build_data.mjs from tools/data/. Do not edit by hand.\n";
fs.writeFileSync(path.join(OUT, "zones.js"), header +
  `globalThis.CLOX_ZONES = ${JSON.stringify({ cc: zoneCC, legacy })};\n` +
  "if (typeof module !== 'undefined') module.exports = globalThis.CLOX_ZONES;\n");
fs.writeFileSync(path.join(OUT, "cities-data.js"), header +
  "// [id, name, countryCode, IANA zone, aliases]\n" +
  `globalThis.CLOX_CITY_ROWS = [\n${cities.map((c) => JSON.stringify(c)).join(",\n")}\n];\n` +
  "if (typeof module !== 'undefined') module.exports = globalThis.CLOX_CITY_ROWS;\n");

const kb = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0);
console.log(`cities-data.js: ${cities.length} cities, ${kb("cities-data.js")} KB`);
console.log(`zones.js: ${Object.keys(zoneCC).length} zones, ${Object.keys(legacy).length} aliases, ${kb("zones.js")} KB`);
