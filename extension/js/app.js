// CloxOne New Tab dashboard.
// Privacy: no network APIs are used anywhere (tests enforce this); the manifest CSP sets connect-src 'none'.
(function () {
  "use strict";
  const C = window.CLOX_CONFIG, T = window.CloxTime, H = window.CloxHolidays,
        P = window.CloxPatterns, L = window.CloxLicense, TIPS = window.CloxTips, S = window.CloxStore;
  const PL = window.CloxPlaces, SR = window.CloxSearch;
  const DAY = 86400000;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const board = $("#board");
  const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");

  // ---------- State ----------
  // Chrome reports some zones by legacy names (Asia/Calcutta); canonical() maps them to tzdb names.
  const detectedTz = (() => { try { return PL.canonical(Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC"; } catch (e) { return "UTC"; } })();

  const cityOf = (id) => PL.placeOf(id);

  function defaults() {
    const home = PL.idForZone(detectedTz);
    const homeTz = PL.placeOf(home).tz;
    const others = ["london", "new-york", "tokyo", "sydney", "bengaluru"]
      .filter((id) => PL.BY_ID[id].tz !== homeTz).slice(0, C.FREE_COLUMN_LIMIT - 1);
    return {
      v: 2, home, columns: [home, ...others],
      use24: false, patterns: true, holidays: true,
      work: { start: C.DEFAULT_WORK_START, end: C.DEFAULT_WORK_END },
      colStyle: {}, pro: { key: "", plan: "", exp: null, valid: false },
      trialStart: 0, welcomed: false, tips: TIPS.fresh()
    };
  }

  const hadSyncCache = !!S.readSync();
  let state = Object.assign(defaults(), S.readSync() || {});
  normalizeState();

  // Migrates older state (v1 "local" home) and drops ids that no longer resolve.
  function normalizeState() {
    const fix = (id) => (id === "local" ? PL.idForZone(state.localTz || detectedTz) : id);
    state.home = fix(state.home);
    if (!PL.placeOf(state.home)) state.home = PL.idForZone(detectedTz);
    state.columns = [...new Set(state.columns.map(fix))].filter((id) => PL.placeOf(id));
    if (!state.columns.includes(state.home)) state.columns.unshift(state.home);
    delete state.localTz;
    state.v = 2;
  }

  const save = () => S.write(state);

  const trialActive = () => state.trialStart > 0 && Date.now() - state.trialStart < C.TRIAL_DAYS * DAY;
  const isPro = () => !!(state.pro && state.pro.valid) || trialActive();
  const workHours = () => (isPro() ? state.work : { start: C.DEFAULT_WORK_START, end: C.DEFAULT_WORK_END });

  // ---------- Helpers ----------
  const flag = (cc) => (cc && cc.length === 2) ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : "";
  const dateFmtCache = new Map();
  function longDate(t, tz) {
    let f = dateFmtCache.get(tz);
    if (!f) { f = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" }); dateFmtCache.set(tz, f); }
    return f.format(new Date(t));
  }
  function timeLabel(w) {
    const f = T.formatTime(w, state.use24);
    return f.suffix ? `${f.main} ${f.suffix}` : f.main;
  }
  const REGION_HEX = { americas: "#f4b183", europe: "#8fa8d6", africa: "#e0c068", mideast: "#b79ae0", asia: "#86cfa6", oceania: "#7ccfd6" };
  function columnStyle(city) {
    const custom = isPro() && state.colStyle[city.id];
    const tint = custom && custom.color
      ? `color-mix(in srgb, ${custom.color} ${darkMQ.matches ? 30 : 32}%, var(--surface))`
      : `var(--t-${city.region})`;
    const patternId = (custom && custom.pattern) || P.REGION_PATTERN[city.region] || "travel";
    const stroke = darkMQ.matches ? "rgba(255,255,255,0.065)" : "rgba(29,36,48,0.10)";
    const pat = state.patterns && patternId !== "none" ? P.tile(patternId, stroke) : "none";
    return { style: `--tint:${tint};--pattern:${pat}`, patterned: state.patterns && patternId !== "none" };
  }

  // ---------- Render ----------
  let scrubIdx = -1, scrubLocked = false;

  function render() {
    const now = Date.now();
    const home = cityOf(state.home);
    const rows = T.dayRows(now, home.tz);
    const homeDates = rows.map((t) => T.wall(t, home.tz).date);
    const nowIdx = Math.max(0, Math.min(23, Math.floor((now - rows[0]) / T.HOUR)));
    const pro = isPro();
    const visible = pro ? state.columns : state.columns.slice(0, C.FREE_COLUMN_LIMIT);
    const hiddenCount = state.columns.length - visible.length;
    const homeOffset = T.offsetMinutes(now, home.tz);
    const showHol = state.holidays && H.hasData();
    const wh = workHours();

    let html = "";
    for (const id of visible) {
      const city = cityOf(id);
      if (!city) continue;
      const isHome = id === state.home;
      const w = T.wall(now, city.tz);
      const tf = T.formatTime(w, state.use24);
      const diff = T.offsetMinutes(now, city.tz) - homeOffset;
      const diffLabel = isHome ? "" : (diff === 0 ? " · same time" : ` · ${T.offsetLabel(diff)}`);
      const st = columnStyle(city);

      let hol = '<div class="hol soon">&nbsp;</div>';
      if (showHol) {
        const today = H.on(city, w.date);
        if (today) hol = `<div class="hol" title="Public holiday today">Holiday: ${esc(today)}</div>`;
        else {
          const up = H.upcoming(city, w.date, 7, T.addDays);
          if (up) hol = `<div class="hol soon" title="${esc(up.date)}">${up.inDays === 1 ? "Tomorrow" : T.weekdayOf(up.date)}: ${esc(up.name)}</div>`;
        }
      }

      let cells = "";
      rows.forEach((t, i) => {
        const cw = isHome ? T.wall(t, home.tz) : T.wall(t, city.tz);
        const hf = cw.hour + cw.minute / 60;
        const holName = showHol ? H.on(city, cw.date) : null;
        const inWork = hf >= wh.start && hf < wh.end;
        const asleep = C.SLEEP_START > C.SLEEP_END ? (hf >= C.SLEEP_START || hf < C.SLEEP_END) : (hf >= C.SLEEP_START && hf < C.SLEEP_END);
        let cls = inWork && !holName ? "work" : asleep ? "sleep" : "off";
        if (holName) cls += " holiday";
        if (i === nowIdx) cls += " now";
        const dd = isHome ? 0 : T.dayDiff(cw.date, homeDates[i]);
        const badge = dd ? `<span class="daybadge" title="${dd > 0 ? "Next day" : "Previous day"}">${dd > 0 ? "+" : "−"}${Math.abs(dd)}d</span>` : "";
        const title = `${city.name}: ${cw.weekday} ${timeLabel(cw)}${holName ? " · Holiday: " + holName : ""}`;
        cells += `<div class="cell ${cls}" data-i="${i}" title="${esc(title)}">${badge}<span>${timeLabel(cw)}</span>${holName ? '<span class="hdot"></span>' : ""}${asleep ? P.icon("moon", 13, "moon") : ""}</div>`;
      });

      html += `<section class="col${st.patterned ? " patterned" : ""}" data-id="${esc(id)}" style="${esc(st.style)}" aria-label="${esc(city.name)}">
        <div class="col-head" draggable="true">
          <div class="col-tools">
            <span class="icon-btn grip" title="Drag to reorder">${P.icon("grip", 14)}</span>
            ${isHome ? "" : `<button class="icon-btn" data-remove="${esc(id)}" title="Remove ${esc(city.name)}" type="button">${P.icon("x", 14)}</button>`}
          </div>
          <div class="home-tag">${isHome ? "Home" : ""}</div>
          <div class="city">${city.cc ? `<span aria-hidden="true">${flag(city.cc)}</span>` : ""}<span class="name">${esc(city.name)}</span></div>
          <div class="zone">${esc(T.zoneAbbr(now, city.tz))}${diffLabel}</div>
          <div class="clock">${tf.main}${tf.suffix ? `<span class="sfx">${tf.suffix}</span>` : ""}</div>
          <div class="date">${esc(longDate(now, city.tz))}</div>
          ${hol}
        </div>
        <div class="rows">${cells}</div>
      </section>`;
    }

    if (!pro && (state.columns.length >= C.FREE_COLUMN_LIMIT)) {
      html += `<button class="lock-card" id="lock-card" type="button">${P.icon("lock", 26)}
        <span>${hiddenCount > 0 ? `${hiddenCount} more ${hiddenCount === 1 ? "city" : "cities"} saved` : `Add ${C.FREE_COLUMN_LIMIT + 1}th city`}</span>
        <small>Unlimited cities with CloxOne Pro</small></button>`;
    }
    html += '<div id="scrub-line"></div>';
    board.innerHTML = html;
    if (scrubIdx >= 0) setScrub(scrubIdx, scrubLocked);
  }

  // ---------- Scrubber ----------
  function setScrub(i, lock) {
    scrubIdx = i; scrubLocked = !!lock;
    $$(".cell.hl", board).forEach((c) => c.classList.remove("hl"));
    const line = $("#scrub-line");
    if (i < 0) { line.style.display = "none"; return; }
    const cells = $$(`.cell[data-i="${i}"]`, board);
    cells.forEach((c) => c.classList.add("hl"));
    if (!cells.length) return;
    const c0 = cells[0];
    const col = c0.closest(".col");
    line.style.top = (col.offsetTop + c0.offsetTop + c0.offsetHeight / 2 - 1) + "px";
    line.style.display = "block";
    line.classList.toggle("locked", scrubLocked);
  }

  board.addEventListener("mousemove", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell || scrubLocked) return;
    const i = Number(cell.dataset.i);
    if (i !== scrubIdx) setScrub(i, false);
  });
  board.addEventListener("mouseleave", () => { if (!scrubLocked) setScrub(-1, false); });
  board.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove]");
    if (rm) { removeColumn(rm.dataset.remove); return; }
    if (e.target.closest("#lock-card")) { openPaywall(true); return; }
    const cell = e.target.closest(".cell");
    if (cell) {
      const i = Number(cell.dataset.i);
      if (scrubLocked && i === scrubIdx) setScrub(i, false);
      else setScrub(i, true);
    }
  });

  // ---------- Drag & drop reorder ----------
  let dragId = null;
  board.addEventListener("dragstart", (e) => {
    const col = e.target.closest(".col");
    if (!col) return;
    dragId = col.dataset.id;
    col.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", dragId); } catch (err) { /* ignore */ }
  });
  board.addEventListener("dragover", (e) => {
    const col = e.target.closest(".col");
    if (!col || !dragId) return;
    e.preventDefault();
    $$(".col.drop-target", board).forEach((c) => c !== col && c.classList.remove("drop-target"));
    if (col.dataset.id !== dragId) col.classList.add("drop-target");
  });
  board.addEventListener("dragend", () => { dragId = null; $$(".col", board).forEach((c) => c.classList.remove("dragging", "drop-target")); });
  board.addEventListener("drop", (e) => {
    const col = e.target.closest(".col");
    if (!col || !dragId) return;
    e.preventDefault();
    const targetId = col.dataset.id;
    if (targetId === dragId) return;
    const rect = col.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    const cols = state.columns.filter((id) => id !== dragId);
    let idx = cols.indexOf(targetId) + (after ? 1 : 0);
    cols.splice(idx, 0, dragId);
    state.columns = cols; dragId = null; save(); render();
  });

  // ---------- Columns ----------
  function removeColumn(id) {
    if (id === state.home) return;
    state.columns = state.columns.filter((x) => x !== id);
    if (state.colStyle[id]) delete state.colStyle[id];
    save(); render();
  }
  function addColumn(id) {
    if (state.columns.includes(id)) return;
    if (!isPro() && state.columns.length >= C.FREE_COLUMN_LIMIT) { openPaywall(true); return; }
    state.columns.push(id); save(); render();
  }

  // ---------- Modals ----------
  const modalRoot = $("#modal-root");
  let closeCurrent = null;
  function openOverlay(innerHtml, cls = "modal") {
    closeModal();
    const ov = document.createElement("div");
    ov.className = cls === "drawer" ? "overlay drawer-ov" : "overlay";
    ov.innerHTML = cls === "drawer" ? "" : `<div class="modal" role="dialog" aria-modal="true">${innerHtml}</div>`;
    if (cls === "drawer") ov.style.background = "rgba(10,14,20,0.2)";
    modalRoot.appendChild(ov);
    let drawer = null;
    if (cls === "drawer") {
      drawer = document.createElement("aside");
      drawer.className = "drawer"; drawer.setAttribute("role", "dialog"); drawer.setAttribute("aria-modal", "true");
      drawer.innerHTML = innerHtml;
      modalRoot.appendChild(drawer);
    }
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) closeModal(); });
    closeCurrent = () => { ov.remove(); if (drawer) drawer.remove(); closeCurrent = null; };
    return drawer || ov.firstElementChild;
  }
  function closeModal() { if (closeCurrent) closeCurrent(); }

  // Place picker: cities, aliases (NYC, Bombay), countries, abbreviations (PST, IST) and raw IANA zones.
  function openPicker({ title, exclude, onPick }) {
    const m = openOverlay(`<h2>${esc(title)}</h2>
      <input class="search" id="city-q" type="text" placeholder="City, country, alias (NYC), abbreviation (PST) or IANA zone" autocomplete="off" spellcheck="false" aria-label="Search places">
      <ul class="results" id="city-res" role="listbox"></ul>`);
    const q = $("#city-q", m), res = $("#city-res", m);
    let list = [], active = 0;
    function draw() {
      list = SR.search(q.value, { exclude: new Set(exclude), limit: 40 });
      active = Math.min(active, Math.max(0, list.length - 1));
      const now = Date.now();
      res.innerHTML = list.length ? list.map((r, i) => {
        const p = r.place, w = T.wall(now, p.tz);
        const where = r.kind === "zone" ? `Time zone · ${esc(p.tz)}` : esc([SR.countryName(p.cc), p.tz].filter(Boolean).join(" · "));
        return `<li><button type="button" data-i="${i}" class="${i === active ? "active" : ""}"><span>${flag(p.cc)} ${esc(p.name)}<br><span class="meta">${where}</span></span><span class="meta">${esc(timeLabel(w))} · ${esc(T.zoneAbbr(now, p.tz))}</span></button></li>`;
      }).join("") : (() => {
        const already = SR.search(q.value, { limit: 1 })[0];
        return already
          ? `<li class="meta" style="padding:10px">${esc(already.place.name)} is already on your board.</li>`
          : '<li class="meta" style="padding:10px">No match. Try a nearby city, the country, or a time zone such as Africa/Bujumbura.</li>';
      })();
      const a = res.querySelector("button.active"); if (a) a.scrollIntoView({ block: "nearest" });
    }
    const pick = (i) => { const r = list[i]; if (!r) return; closeModal(); onPick(r.id); };
    q.addEventListener("input", () => { active = 0; draw(); });
    q.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { active = Math.min(list.length - 1, active + 1); draw(); e.preventDefault(); }
      if (e.key === "ArrowUp") { active = Math.max(0, active - 1); draw(); e.preventDefault(); }
      if (e.key === "Enter") pick(active);
    });
    res.addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (b) pick(Number(b.dataset.i)); });
    draw(); q.focus();
  }

  function openAddCity() {
    if (!isPro() && state.columns.length >= C.FREE_COLUMN_LIMIT) { openPaywall(true); return; }
    openPicker({ title: "Add a city", exclude: state.columns, onPick: addColumn });
  }

  function setHome(nid) {
    const old = state.home;
    if (nid === old) return;
    state.columns = state.columns.filter((x) => x !== nid);
    const i = state.columns.indexOf(old);
    if (i >= 0) state.columns[i] = nid; else state.columns.unshift(nid);
    state.home = nid; save(); render();
  }

  function openPaywall(fromAdd) {
    const canTrial = !state.trialStart;
    const m = openOverlay(`<h2>${P.icon("lock", 18)} Unlock CloxOne Pro</h2>
      <p>The free version shows ${C.FREE_COLUMN_LIMIT} cities. Pro adds:</p>
      <ul class="feature-list"><li>Unlimited city columns</li><li>Custom working hours (e.g. 10 AM–6 PM)</li><li>Custom column colours and patterns</li></ul>
      <p>$1.99/month, $15/year or $29 lifetime. Your licence key is checked on this device; nothing is sent anywhere.</p>
      <div class="actions">
        <button class="btn" type="button" data-act="close">Not now</button>
        <button class="btn" type="button" data-act="key">I have a key</button>
        ${canTrial ? '<button class="btn primary" type="button" data-act="trial">Start 7-day free trial</button>'
                   : `<a class="btn primary" href="${esc(C.KOFI_PRO_URL)}" target="_blank" rel="noopener">Get Pro on Ko-fi</a>`}
      </div>`);
    m.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]");
      if (!a) return;
      if (a.dataset.act === "close") closeModal();
      if (a.dataset.act === "key") openSettings("pro");
      if (a.dataset.act === "trial") {
        state.trialStart = Date.now(); save(); closeModal(); render();
        toast(`Pro trial started. Enjoy ${C.TRIAL_DAYS} days of everything.`);
        if (fromAdd) openAddCity(); // carry on with what the user was doing
      }
    });
  }

  // ---------- Settings ----------
  function openSettings(focus) {
    const pro = isPro();
    const hourOpts = (sel, from, to) => { let o = ""; for (let h = from; h <= to; h++) o += `<option value="${h}"${h === sel ? " selected" : ""}>${timeLabel({ hour: h % 24, minute: 0 })}${h === 24 ? " (midnight)" : ""}</option>`; return o; };
    const homePlace = cityOf(state.home);
    const patOpts = (sel) => `<option value="">Region default</option><option value="none"${sel === "none" ? " selected" : ""}>No pattern</option>` +
      Object.entries(P.PATTERNS).map(([k, v]) => `<option value="${k}"${sel === k ? " selected" : ""}>${v.label}</option>`).join("");
    const colRows = state.columns.map((id) => {
      const c = cityOf(id); if (!c) return "";
      const cs = state.colStyle[id] || {};
      return `<div class="colstyle" data-col="${esc(id)}"><span>${esc(c.name)}</span>
        <input type="color" value="${esc(cs.color || REGION_HEX[c.region])}" aria-label="Colour for ${esc(c.name)}">
        <select aria-label="Pattern for ${esc(c.name)}">${patOpts(cs.pattern || "")}</select></div>`;
    }).join("");
    const proStatus = state.pro.valid
      ? `<p class="msg-ok">Pro active (${esc(state.pro.plan || "licence")}${state.pro.exp ? ", until " + esc(state.pro.exp) : ""}). Thank you!</p>`
      : trialActive()
        ? `<p class="msg-ok">Free trial: ${Math.max(1, Math.ceil((state.trialStart + C.TRIAL_DAYS * DAY - Date.now()) / DAY))} days left.</p>`
        : `<p class="note">Free plan: up to ${C.FREE_COLUMN_LIMIT} cities.</p>`;

    const d = openOverlay(`
      <div class="row"><h2>Settings</h2><button class="icon-btn" data-act="close" type="button" title="Close">${P.icon("x", 14)}</button></div>

      <h3>Basics</h3>
      <div class="row"><span>Home city</span><span>${flag(homePlace.cc)} ${esc(homePlace.name)} <button class="btn" type="button" data-act="home">Change</button></span></div>
      <div class="row"><span>Clock</span><span class="seg"><button type="button" data-fmt="12" class="${state.use24 ? "" : "on"}">12-hour</button><button type="button" data-fmt="24" class="${state.use24 ? "on" : ""}">24-hour</button></span></div>
      <div class="row"><span>Column patterns</span><button type="button" class="switch ${state.patterns ? "on" : ""}" data-toggle="patterns" aria-pressed="${state.patterns}"></button></div>
      <div class="row"><span>Public holidays</span><button type="button" class="switch ${state.holidays ? "on" : ""}" data-toggle="holidays" aria-pressed="${state.holidays}"></button></div>
      ${H.hasData() ? `<p class="note">National public holidays for ${H.range()[0]}–${H.range()[1]}, by country.</p>`
                    : '<p class="note">Holiday data isn\'t bundled in this build yet, so holiday badges are hidden.</p>'}

      <h3>Working hours ${pro ? "" : '<span class="pro-badge">PRO</span>'}</h3>
      <div class="${pro ? "" : "locked"}">
        <div class="row"><label for="s-ws">Start</label><select id="s-ws">${hourOpts(state.work.start, 0, 23)}</select></div>
        <div class="row"><label for="s-we">End</label><select id="s-we">${hourOpts(state.work.end, 1, 24)}</select></div>
      </div>

      <h3>Column colours &amp; patterns ${pro ? "" : '<span class="pro-badge">PRO</span>'}</h3>
      <div class="${pro ? "" : "locked"}" id="s-cols">${colRows}
        <div class="row"><span></span><button class="btn" type="button" data-act="reset-cols">Reset to region defaults</button></div>
      </div>

      <h3 id="s-pro">CloxOne Pro</h3>
      ${proStatus}
      <div class="row"><input type="text" id="s-key" placeholder="Paste your licence key (CLOX1.…)" value="${esc(state.pro.key || "")}" spellcheck="false"></div>
      <div class="row"><span id="s-key-msg" class="note"></span><button class="btn primary" type="button" data-act="activate">Activate</button></div>
      <p class="note"><a href="${esc(C.KOFI_PRO_URL)}" target="_blank" rel="noopener">Get Pro on Ko-fi</a>${state.trialStart ? "" : ' · <a href="#" data-act="trial">Start 7-day free trial</a>'}</p>

      <h3>Support CloxOne</h3>
      <p class="note">CloxOne is free. If it saves you time, a coffee keeps it going.</p>
      <p><a class="btn" href="${esc(C.KOFI_URL)}" target="_blank" rel="noopener" data-act="kofi">${P.icon("coffee", 16)} Tip on Ko-fi</a></p>

      <h3>Privacy</h3>
      <p class="note">CloxOne makes zero network requests. No accounts, analytics or tracking. Your settings stay in this browser on this device. <a href="privacy.html" target="_blank" rel="noopener">Privacy &amp; credits</a></p>
    `, "drawer");

    const rerender = () => { save(); render(); };
    d.addEventListener("click", async (e) => {
      const t = e.target.closest("button, a");
      if (!t) return;
      if (t.dataset.act === "home") {
        openPicker({ title: "Choose your home city", exclude: [state.home], onPick: (id) => { setHome(id); openSettings(); } });
        return;
      }
      if (t.dataset.fmt) { state.use24 = t.dataset.fmt === "24"; rerender(); openSettings(); return; }
      if (t.dataset.toggle) { state[t.dataset.toggle] = !state[t.dataset.toggle]; t.classList.toggle("on"); t.setAttribute("aria-pressed", state[t.dataset.toggle]); rerender(); return; }
      const act = t.dataset.act;
      if (act === "close") closeModal();
      if (act === "reset-cols") { state.colStyle = {}; rerender(); openSettings(); }
      if (act === "kofi") { state.tips = TIPS.markTipped(state.tips, Date.now()); save(); }
      if (act === "trial") { e.preventDefault(); state.trialStart = Date.now(); rerender(); openSettings("pro"); }
      if (act === "activate") {
        const msg = $("#s-key-msg", d);
        const key = $("#s-key", d).value.trim();
        if (!key) { msg.className = "msg-err"; msg.textContent = "Paste a key first."; return; }
        const r = await L.verify(key, todayStr());
        if (r.valid) {
          state.pro = { key, plan: r.payload.plan || "", exp: r.payload.exp || null, valid: true };
          rerender(); openSettings("pro"); toast("CloxOne Pro activated. Thank you!");
        } else { msg.className = "msg-err"; msg.textContent = r.reason; }
      }
    });
    $("#s-ws", d).addEventListener("change", (e) => { state.work.start = Number(e.target.value); if (state.work.end <= state.work.start) state.work.end = Math.min(24, state.work.start + 1); rerender(); });
    $("#s-we", d).addEventListener("change", (e) => { state.work.end = Number(e.target.value); if (state.work.end <= state.work.start) state.work.start = Math.max(0, state.work.end - 1); rerender(); });
    $("#s-cols", d).addEventListener("input", (e) => {
      const row = e.target.closest("[data-col]"); if (!row) return;
      const id = row.dataset.col;
      const cs = state.colStyle[id] || {};
      if (e.target.type === "color") cs.color = e.target.value;
      if (e.target.tagName === "SELECT") cs.pattern = e.target.value;
      state.colStyle[id] = cs; rerender();
    });
    if (focus === "pro") { const el = $("#s-pro", d); el.scrollIntoView({ block: "start" }); $("#s-key", d).focus(); }
  }

  // ---------- Toast & tips ----------
  function toast(text, actions) {
    const root = $("#toast-root");
    root.innerHTML = `<div class="toast" role="status"><span>${text}</span>${actions || ""}</div>`;
    if (!actions) setTimeout(() => { root.innerHTML = ""; }, 4000);
    return root.firstElementChild;
  }

  function todayStr() { return T.wall(Date.now(), cityOf(state.home).tz).date; }

  let pointerOnBoard = false;
  board.addEventListener("mouseenter", () => { pointerOnBoard = true; });
  board.addEventListener("mouseleave", () => { pointerOnBoard = false; });

  function maybeShowTip(attempt = 0) {
    if (!TIPS.shouldShow(state.tips, Date.now(), isPro())) return;
    if ((pointerOnBoard || scrubLocked || closeCurrent) && attempt < 15) { setTimeout(() => maybeShowTip(attempt + 1), 2000); return; }
    if (pointerOnBoard || scrubLocked || closeCurrent) return; // never over a dialog or while scrubbing
    const b = $("#tip-banner");
    const n = state.tips.monthOpens;
    b.innerHTML = `${P.icon("coffee", 20)}<span class="msg">You've opened CloxOne ${n} ${n === 1 ? "time" : "times"} this month. Buy me a coffee?</span>
      <a class="btn primary" href="${esc(C.KOFI_URL)}" target="_blank" rel="noopener" data-tip="kofi">Tip on Ko-fi</a>
      <button class="btn" type="button" data-tip="later">Not now</button>`;
    b.hidden = false; b.classList.remove("fade");
    state.tips = TIPS.markShown(state.tips, Date.now()); save();
    let hovering = false;
    const hide = () => { b.classList.add("fade"); setTimeout(() => { b.hidden = true; }, 600); };
    b.onmouseenter = () => { hovering = true; };
    b.onmouseleave = () => { hovering = false; };
    const fadeTimer = setInterval(() => { if (!hovering) { clearInterval(fadeTimer); hide(); } }, 10000);
    b.onclick = (e) => {
      const t = e.target.closest("[data-tip]"); if (!t) return;
      if (t.dataset.tip === "kofi") { state.tips = TIPS.markTipped(state.tips, Date.now()); save(); }
      clearInterval(fadeTimer); hide();
    };
  }

  // ---------- Wiring ----------
  $("#btn-settings").innerHTML = `${P.icon("settings", 17)} Settings`;
  $("#btn-add").innerHTML = `${P.icon("plus", 17)} Add City`;
  $("#btn-settings").addEventListener("click", () => openSettings());
  $("#btn-add").addEventListener("click", openAddCity);
  const kf = $("#kofi-footer");
  kf.href = C.KOFI_URL; kf.innerHTML = `${P.icon("coffee", 15)} Tip on Ko-fi`;
  kf.addEventListener("click", () => { state.tips = TIPS.markTipped(state.tips, Date.now()); save(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (closeCurrent) closeModal(); else setScrub(-1, false); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openAddCity(); return; }
    if (closeCurrent) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const base = scrubIdx < 0 ? Math.floor((Date.now() - T.startOfDay(Date.now(), cityOf(state.home).tz)) / T.HOUR) : scrubIdx;
      setScrub(Math.max(0, Math.min(23, base + (e.key === "ArrowDown" ? 1 : -1))), true);
    }
  });

  // Live clock: re-render at the top of each minute only (no constant timers).
  function scheduleTick() {
    const ms = 60000 - (Date.now() % 60000) + 50;
    // Skip the refresh while a column is being dragged (re-rendering would cancel the drag).
    setTimeout(() => { if (!document.hidden && !dragId) render(); scheduleTick(); }, ms);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  darkMQ.addEventListener("change", render);

  // ---------- Boot ----------
  state.tips = TIPS.recordOpen(state.tips, todayStr());
  if (state.trialStart && !trialActive() && !state.pro.valid) { /* trial ended: render() hides extra columns */ }
  save();
  render();
  scheduleTick();

  // First paint done from the sync cache; now reconcile with chrome.storage.local.
  if (!hadSyncCache) S.readAsync().then((st) => {
    if (st && st.columns) { state = Object.assign(defaults(), st); normalizeState(); state.tips = TIPS.recordOpen(st.tips, todayStr()); save(); render(); }
  });

  // Re-verify a stored licence key offline (also catches expiry).
  if (state.pro && state.pro.key) {
    L.verify(state.pro.key, todayStr()).then((r) => {
      const was = state.pro.valid;
      state.pro.valid = r.valid;
      if (was !== r.valid) { save(); render(); }
    });
  }

  if (!state.welcomed) {
    const t = toast(`Welcome to CloxOne. Everything stays on this device. If Chrome asks whether to keep this New Tab page, choose <b>Keep it</b>.`,
      '<button class="btn primary" type="button" id="welcome-ok">Got it</button>');
    $("#welcome-ok", t).addEventListener("click", () => { state.welcomed = true; save(); $("#toast-root").innerHTML = ""; });
  } else {
    setTimeout(maybeShowTip, 1500);
  }
})();
