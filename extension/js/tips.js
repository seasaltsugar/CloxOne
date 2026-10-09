// CloxOne tip-jar reminder schedule. Counters live only on this device; tips are never verified.
// Milestones: day 7, day 30, then every 60 days of use. At most once per 30 days.
// "Tip on Ko-fi" pauses reminders for 6 months. Hidden for Pro.
(function () {
  const DAY = 86400000;

  function fresh() {
    return { days: 0, lastDay: "", monthKey: "", monthOpens: 0, nextMilestone: 7, lastShown: 0, pausedUntil: 0 };
  }

  function recordOpen(t, today) {
    t = Object.assign(fresh(), t || {});
    if (t.lastDay !== today) { t.days += 1; t.lastDay = today; }
    const mk = today.slice(0, 7);
    if (t.monthKey !== mk) { t.monthKey = mk; t.monthOpens = 0; }
    t.monthOpens += 1;
    return t;
  }

  function shouldShow(t, now, isPro) {
    if (isPro || !t) return false;
    if (t.days < t.nextMilestone) return false;
    if (now < t.pausedUntil) return false;
    if (now - t.lastShown < 30 * DAY) return false;
    return true;
  }

  function markShown(t, now) {
    const m = t.nextMilestone;
    t.lastShown = now;
    t.nextMilestone = (m === 7 && t.days < 30) ? 30 : t.days + 60;
    return t;
  }

  function markTipped(t, now) {
    t.pausedUntil = now + 182 * DAY;
    t.nextMilestone = t.days + 60;
    return t;
  }

  const api = { fresh, recordOpen, shouldShow, markShown, markTipped };
  const root = typeof window !== "undefined" ? window : globalThis;
  root.CloxTips = api;
  if (typeof module !== "undefined") module.exports = api;
})();
