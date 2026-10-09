// CloxOne Pro licence keys, verified fully offline.
// Key format:  CLOX1.<base64url(JSON payload)>.<base64url(ECDSA P-256 signature, r||s)>
// Payload:     { "id": "K-0001", "plan": "lifetime"|"yearly"|"monthly", "exp": "YYYY-MM-DD"|null, "iat": "YYYY-MM-DD" }
// Keys are signed with your private key by tools/license_tool.mjs; only the public key ships here.
(function () {
  function b64urlToBytes(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  let keyPromise = null;
  function publicKey() {
    if (!keyPromise) {
      const jwk = Object.assign({ ext: true, key_ops: ["verify"] }, window.CLOX_CONFIG.LICENSE_PUBLIC_JWK);
      keyPromise = crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    }
    return keyPromise;
  }

  // Returns { valid, reason?, payload? }
  async function verify(key, today) {
    try {
      const parts = String(key || "").trim().split(".");
      if (parts.length !== 3 || parts[0] !== "CLOX1") return { valid: false, reason: "That doesn't look like a CloxOne key." };
      const payloadBytes = b64urlToBytes(parts[1]);
      const sig = b64urlToBytes(parts[2]);
      const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, await publicKey(), sig, payloadBytes);
      if (!ok) return { valid: false, reason: "This key isn't valid." };
      const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
      if (payload.exp && today > payload.exp) return { valid: false, reason: `This key expired on ${payload.exp}.`, payload };
      return { valid: true, payload };
    } catch (e) {
      return { valid: false, reason: "This key isn't valid." };
    }
  }

  window.CloxLicense = { verify };
})();
