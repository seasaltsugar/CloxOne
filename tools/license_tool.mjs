#!/usr/bin/env node
// CloxOne Pro licence keys (offline, no server).
//
//   node tools/license_tool.mjs init                         # create your signing key (once) and update config.js
//   node tools/license_tool.mjs issue --plan lifetime         # one key
//   node tools/license_tool.mjs issue --plan yearly           # expires in 1 year (+7 days grace)
//   node tools/license_tool.mjs issue --plan monthly          # expires in 1 month (+3 days grace)
//   node tools/license_tool.mjs batch 50 --plan lifetime      # 50 unique keys, one per line
//   node tools/license_tool.mjs verify CLOX1.xxx.yyy
//
// KEEP tools/keys/private-key.json SECRET. Never put it in the extension or in git.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const KEY_DIR = path.join(here, "keys");
const PRIV = path.join(KEY_DIR, "private-key.json");
const CONFIG = path.join(here, "..", "extension", "js", "config.js");

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const iso = (d) => d.toISOString().slice(0, 10);

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}

function loadPrivate() {
  if (!fs.existsSync(PRIV)) { console.error("No signing key yet. Run: node tools/license_tool.mjs init"); process.exit(1); }
  return crypto.createPrivateKey({ key: JSON.parse(fs.readFileSync(PRIV, "utf8")), format: "jwk" });
}

function publicJwk(priv) {
  const { kty, crv, x, y } = crypto.createPublicKey(priv).export({ format: "jwk" });
  return { kty, crv, x, y };
}

function issue(priv, plan, id) {
  const now = new Date();
  let exp = arg("exp", null);
  if (!exp && plan === "yearly") { const d = new Date(now); d.setUTCFullYear(d.getUTCFullYear() + 1); d.setUTCDate(d.getUTCDate() + 7); exp = iso(d); }
  if (!exp && plan === "monthly") { const d = new Date(now); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(d.getUTCDate() + 3); exp = iso(d); }
  const payload = Buffer.from(JSON.stringify({ id, plan, exp: exp || null, iat: iso(now) }));
  const sig = crypto.sign("sha256", payload, { key: priv, dsaEncoding: "ieee-p1363" });
  return `CLOX1.${b64url(payload)}.${b64url(sig)}`;
}

function verify(priv, key) {
  const [v, p, s] = key.trim().split(".");
  if (v !== "CLOX1") return "invalid format";
  const ok = crypto.verify("sha256", fromB64url(p), { key: crypto.createPublicKey(priv), dsaEncoding: "ieee-p1363" }, fromB64url(s));
  return ok ? `valid: ${fromB64url(p).toString()}` : "INVALID signature";
}

const randId = () => "K-" + crypto.randomBytes(4).toString("hex").toUpperCase();
const cmd = process.argv[2];

if (cmd === "init") {
  if (fs.existsSync(PRIV) && !process.argv.includes("--force")) {
    console.error("A signing key already exists. Re-running would invalidate every key you've sold. Use --force only if you mean it.");
    process.exit(1);
  }
  fs.mkdirSync(KEY_DIR, { recursive: true });
  const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  fs.writeFileSync(PRIV, JSON.stringify(privateKey.export({ format: "jwk" })), { mode: 0o600 });
  const pub = JSON.stringify(publicJwk(privateKey));
  const cfg = fs.readFileSync(CONFIG, "utf8").replace(/LICENSE_PUBLIC_JWK:\s*\{[^}]*\}/, `LICENSE_PUBLIC_JWK: ${pub}`);
  fs.writeFileSync(CONFIG, cfg);
  console.log("Signing key saved to tools/keys/private-key.json (keep it secret, back it up).");
  console.log("Public key written into extension/js/config.js:");
  console.log(pub);
} else if (cmd === "issue") {
  console.log(issue(loadPrivate(), arg("plan", "lifetime"), arg("id", randId())));
} else if (cmd === "batch") {
  const n = Number(process.argv[3] || 10), priv = loadPrivate(), plan = arg("plan", "lifetime");
  for (let i = 0; i < n; i++) console.log(issue(priv, plan, randId()));
} else if (cmd === "verify") {
  console.log(verify(loadPrivate(), process.argv[3] || ""));
} else {
  console.log("Usage: init | issue --plan lifetime|yearly|monthly [--id ID] [--exp YYYY-MM-DD] | batch N --plan ... | verify KEY");
}
