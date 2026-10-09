// CloxOne doodle patterns + UI icons.
// Icon path data from Tabler Icons v3.19.0 (MIT License, (c) 2020-2026 Paweł Kuna).
// https://github.com/tabler/tabler-icons — full licence text in /LICENSES/tabler-icons.txt
(function () {
  const ICONS = {
    clock: ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0", "M12 7v5l3 3"],
    world: ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0", "M3.6 9h16.8", "M3.6 15h16.8", "M11.5 3a17 17 0 0 0 0 18", "M12.5 3a17 17 0 0 1 0 18"],
    coffee: ["M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67 -.358 3.5 -1c.83 -.642 2.077 -1.017 3.5 -1c1.423 -.017 2.67 .358 3.5 1", "M8 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2", "M12 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2", "M3 10h14v5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -6 -6v-5z", "M16.746 16.726a3 3 0 1 0 .252 -5.555"],
    plane: ["M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3z"],
    message: ["M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1"],
    sun: ["M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"],
    moonStars: ["M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z", "M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2", "M19 11h2m-1 -1v2"],
    headphones: ["M4 13m0 2a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z", "M15 13m0 2a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z", "M4 15v-3a8 8 0 0 1 16 0v3"],
    mail: ["M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z", "M3 7l9 6l9 -6"],
    cloud: ["M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878"],
    calendar: ["M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z", "M16 3v4", "M8 3v4", "M4 11h16", "M11 15h1", "M12 15v3"],
    moon: ["M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"],
    settings: ["M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z", "M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"],
    lock: ["M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z", "M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0", "M8 11v-4a4 4 0 1 1 8 0v4"],
    grip: ["M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", "M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", "M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", "M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", "M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", "M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"],
    // Simple strokes (not from Tabler) for plus / close.
    plus: ["M12 5v14", "M5 12h14"],
    x: ["M18 6l-12 12", "M6 6l12 12"]
  };

  // Inline SVG element for UI chrome.
  function icon(name, size = 18, cls = "") {
    const paths = (ICONS[name] || []).map((d) => `<path d="${d}"/>`).join("");
    return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  // Six pattern "moods". Each uses a different subset of doodles and a different seed,
  // so columns look related but not identical (WhatsApp-wallpaper feel, original art).
  const PATTERNS = {
    travel:  { label: "Travel",  icons: ["plane", "world", "clock", "cloud", "mail"], seed: 11 },
    cafe:    { label: "Café",    icons: ["coffee", "message", "clock", "sun", "headphones"], seed: 23 },
    night:   { label: "Night",   icons: ["moonStars", "cloud", "clock", "message", "world"], seed: 37 },
    office:  { label: "Office",  icons: ["calendar", "mail", "clock", "coffee", "headphones"], seed: 41 },
    sunny:   { label: "Sunny",   icons: ["sun", "cloud", "plane", "world", "coffee"], seed: 53 },
    chatter: { label: "Chatter", icons: ["message", "mail", "headphones", "world", "clock"], seed: 67 }
  };
  const REGION_PATTERN = { americas: "sunny", europe: "cafe", africa: "travel", mideast: "night", asia: "chatter", oceania: "office" };

  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  const tileCache = new Map();
  // Returns a CSS url("data:image/svg+xml,...") tile, stroke in the given colour.
  function tile(patternId, color) {
    const key = patternId + color;
    if (tileCache.has(key)) return tileCache.get(key);
    const p = PATTERNS[patternId] || PATTERNS.travel;
    const r = rng(p.seed);
    const SIZE = 200, CELLS = 5, step = SIZE / CELLS;
    let g = "";
    let n = 0;
    for (let row = 0; row < CELLS; row++) {
      for (let col = 0; col < CELLS; col++) {
        const name = p.icons[(n++ + row) % p.icons.length];
        const x = col * step + step * 0.1 + r() * step * 0.25;
        const y = row * step + step * 0.1 + r() * step * 0.25;
        const rot = Math.round(r() * 70 - 35);
        const sc = (0.6 + r() * 0.3).toFixed(2);
        const paths = ICONS[name].map((d) => `<path d='${d}'/>`).join("");
        g += `<g transform='translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot} 12 12) scale(${sc})'>${paths}</g>`;
      }
    }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${SIZE}' height='${SIZE}' viewBox='0 0 ${SIZE} ${SIZE}' fill='none' stroke='${color}' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'>${g}</svg>`;
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    tileCache.set(key, url);
    return url;
  }

  window.CloxPatterns = { ICONS, icon, PATTERNS, REGION_PATTERN, tile };
})();
