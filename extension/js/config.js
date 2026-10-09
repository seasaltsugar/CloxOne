// CloxOne configuration. Edit before publishing.
window.CLOX_CONFIG = {
  // Your Ko-fi page (tip jar). Opened as a normal browser tab only when the user clicks.
KOFI_URL: "https://ko-fi.com/seasaltsugar",
KOFI_PRO_URL: "https://ko-fi.com/s/e5d5f3c694",
  FREE_COLUMN_LIMIT: 4,
  TRIAL_DAYS: 7,
  DEFAULT_WORK_START: 9,
  DEFAULT_WORK_END: 17,
  SLEEP_START: 22,
  SLEEP_END: 7,
  // Public key that verifies Pro licence keys offline (ECDSA P-256).
  // Generate your own with: node tools/license_tool.mjs init   (then paste the printed JWK here)
  LICENSE_PUBLIC_JWK: {"kty":"EC","crv":"P-256","x":"vbHbF4669G0D4wcb5In7hUjY9t8XsqZtVUAVYJlCigY","y":"J6WYUjaXARlnzn9SRq6MSqFYU-O8KyPDXCwoc8P_gRk"}
};
