// MV3 service worker.
//
// Reminder firing — precision strategy:
//   - On any storage change to reminder data, recompute the earliest pending
//     dueAt across all reminder widgets and schedule a ONE-SHOT alarm for
//     that exact moment. Chrome 117+ removed the minimum delay on one-shot
//     `when:` alarms, so reminders fire to sub-second precision.
//   - A 5-minute repeating "safety" alarm covers edge cases where the
//     one-shot was lost (storage corruption, browser restart races).
//
// When a reminder fires:
//   - Push to `pendingReminders` and bump the action badge (guaranteed signal).
//   - Always play the offscreen chime — the OS may silence Chrome notifications
//     without telling us (Focus / DND / system settings) so the chime is the
//     only audio path we can trust.
//   - Opportunistically fire chrome.notifications if permission is granted.
//   - Open the action popup so any newly-pending reminders are immediately
//     visible (silently fails if Chrome isn't focused — badge still covers it).

const NEXT_TICK_ALARM = 'reminders-next-tick';
const SAFETY_ALARM = 'reminders-safety';
const REMINDER_KEY_PREFIX = 'reminders-widget-';
const PENDING_KEY = 'pendingReminders';
const OFFSCREEN_URL = 'offscreen.html';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

// ---------------- Message proxy (Google suggestions) ---------------------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchSuggestions') {
    fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(request.query)}`)
      .then(res => res.json())
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

// ---------------- Notification icon (PNG data URL) -----------------------
// chrome.notifications.create silently rejects SVG iconUrls. Synthesize a PNG
// once at SW boot via OffscreenCanvas, cache the data URL.

let cachedIconUrl = null;
const generateIconUrl = async () => {
  if (cachedIconUrl) return cachedIconUrl;
  try {
    const size = 64;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(20, 42);
    ctx.lineTo(44, 42);
    ctx.bezierCurveTo(44, 42, 42, 38, 42, 30);
    ctx.bezierCurveTo(42, 22, 38, 16, 32, 16);
    ctx.bezierCurveTo(26, 16, 22, 22, 22, 30);
    ctx.bezierCurveTo(22, 38, 20, 42, 20, 42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(32, 48, 3, 0, Math.PI * 2);
    ctx.fill();
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    cachedIconUrl = `data:image/png;base64,${btoa(binary)}`;
    return cachedIconUrl;
  } catch (err) {
    console.error('[reminders] icon generation failed', err);
    return null;
  }
};

// ---------------- Offscreen audio ---------------------------------------

const ensureOffscreen = async () => {
  if (!chrome.offscreen) return false;
  const existing = await chrome.offscreen.hasDocument?.();
  if (existing) return true;
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play reminder chime',
    });
    return true;
  } catch (err) {
    if (String(err).includes('Only a single offscreen')) return true;
    console.error('[reminders] failed to create offscreen document', err);
    return false;
  }
};

const playReminderChime = async () => {
  const ready = await ensureOffscreen();
  if (!ready) return;
  // On first offscreen creation the listener may not be attached yet when we
  // send. Retry once after a short delay if the first send fails.
  const trySend = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'play-reminder-chime' });
      return true;
    } catch {
      return false;
    }
  };
  if (await trySend()) return;
  await new Promise((r) => setTimeout(r, 300));
  await trySend();
};

// ---------------- Badge management ---------------------------------------

const getPending = () => new Promise((resolve) => {
  chrome.storage.local.get([PENDING_KEY], (result) => {
    resolve(Array.isArray(result[PENDING_KEY]) ? result[PENDING_KEY] : []);
  });
});

const setPending = (list) => new Promise((resolve) => {
  chrome.storage.local.set({ [PENDING_KEY]: list }, () => resolve());
});

const refreshBadge = async () => {
  const pending = await getPending();
  const count = pending.length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.type === 'reminders/dismiss') {
    (async () => {
      const pending = await getPending();
      await setPending(pending.filter((p) => p.firedId !== request.firedId));
      await refreshBadge();
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (request?.type === 'reminders/dismissAll') {
    (async () => {
      await setPending([]);
      await refreshBadge();
      sendResponse({ ok: true });
    })();
    return true;
  }
});

// ---------------- Alarm scheduling --------------------------------------

const findEarliestDueAt = async () => {
  const all = await new Promise((r) => chrome.storage.local.get(null, r));
  let earliest = Infinity;
  for (const [k, v] of Object.entries(all)) {
    if (!k.startsWith(REMINDER_KEY_PREFIX) || !Array.isArray(v)) continue;
    for (const e of v) {
      if (e.completed) continue;
      if (e.lastFiredAt && e.lastFiredAt >= e.dueAt) continue;
      if (e.dueAt < earliest) earliest = e.dueAt;
    }
  }
  return earliest;
};

const rescheduleNextTick = async () => {
  const earliest = await findEarliestDueAt();
  await new Promise((r) => chrome.alarms.clear(NEXT_TICK_ALARM, () => r()));
  if (earliest === Infinity) return;
  // Chrome 117+ removed the 30s floor for one-shot `when:` alarms. Past times
  // fire immediately; future times fire at the exact moment.
  const when = Math.max(earliest, Date.now() + 50);
  chrome.alarms.create(NEXT_TICK_ALARM, { when });
};

const ensureSafetyAlarm = () => {
  chrome.alarms.get(SAFETY_ALARM, (existing) => {
    if (!existing) {
      chrome.alarms.create(SAFETY_ALARM, { periodInMinutes: 5, when: Date.now() + 60_000 });
    }
  });
};

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const touched = Object.keys(changes).some((k) => k.startsWith(REMINDER_KEY_PREFIX));
  if (touched) {
    rescheduleNextTick().catch((err) => console.error('[reminders] reschedule failed', err));
  }
});

chrome.runtime.onInstalled.addListener(() => {
  ensureSafetyAlarm();
  refreshBadge();
  runReminderTick().then(rescheduleNextTick).catch((err) => console.error('[reminders] boot failed', err));
});

chrome.runtime.onStartup.addListener(() => {
  ensureSafetyAlarm();
  refreshBadge();
  runReminderTick().then(rescheduleNextTick).catch((err) => console.error('[reminders] startup failed', err));
});

// ---------------- Tick processing ---------------------------------------

const advanceDueAt = (dueAt, recurrence, now) => {
  const step =
    recurrence === 'hourly' ? HOUR_MS :
    recurrence === 'daily' ? DAY_MS :
    recurrence === 'weekly' ? WEEK_MS :
    0;
  if (!step) return dueAt;
  let next = dueAt + step;
  while (next <= now) next += step;
  return next;
};

const tryFireOsNotification = async (entry, timeLabel) => {
  try {
    const level = await new Promise((resolve) => chrome.notifications.getPermissionLevel((l) => resolve(l)));
    if (level !== 'granted') return;
    const iconUrl = await generateIconUrl();
    if (!iconUrl) return;
    await chrome.notifications.create(`reminder-${entry.id}-${Date.now()}`, {
      type: 'basic',
      iconUrl,
      title: 'Reminder',
      message: `${entry.text}${entry.recurrence !== 'none' ? ` · ${entry.recurrence}` : ''} (${timeLabel})`,
      priority: 2,
      requireInteraction: true,
    });
  } catch (err) {
    console.error('[reminders] OS notification failed', err);
  }
};

const fireReminder = async (entry) => {
  const timeLabel = new Date(entry.dueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const pending = await getPending();
  pending.push({
    firedId: `${entry.id}-${Date.now()}`,
    text: entry.text,
    timeLabel,
    recurrence: entry.recurrence,
    firedAt: Date.now(),
  });
  await setPending(pending);
  await refreshBadge();

  // Await the chime so the SW stays alive long enough to deliver the message
  // — otherwise the SW can be killed mid-send and the chime never plays.
  await playReminderChime();
  await tryFireOsNotification(entry, timeLabel);
};

const processReminderKey = async (key, entries, now) => {
  let firedCount = 0;
  const next = [];
  for (const entry of entries) {
    if (entry.completed) { next.push(entry); continue; }
    if (entry.lastFiredAt && entry.lastFiredAt >= entry.dueAt) { next.push(entry); continue; }
    if (entry.dueAt > now) { next.push(entry); continue; }

    await fireReminder(entry);
    firedCount++;
    if (entry.recurrence === 'none') {
      next.push({ ...entry, lastFiredAt: now });
    } else {
      next.push({ ...entry, lastFiredAt: now, dueAt: advanceDueAt(entry.dueAt, entry.recurrence, now) });
    }
  }

  if (firedCount > 0) {
    await new Promise((resolve) => chrome.storage.local.set({ [key]: next }, resolve));
  }
  return firedCount;
};

const openActionPopup = async () => {
  if (!chrome.action?.openPopup) return;
  try {
    await chrome.action.openPopup();
  } catch {
    // openPopup throws when Chrome isn't focused or there's no active window.
    // That's expected — badge + chime + notification still alert the user.
  }
};

const runReminderTick = async () => {
  const now = Date.now();
  const all = await new Promise((resolve) => chrome.storage.local.get(null, resolve));
  const reminderKeys = Object.keys(all).filter((k) => k.startsWith(REMINDER_KEY_PREFIX) && Array.isArray(all[k]));
  if (reminderKeys.length === 0) return;
  let total = 0;
  for (const key of reminderKeys) {
    total += await processReminderKey(key, all[key], now);
  }
  if (total > 0) {
    // Open the action popup once per fire batch so all newly-pending reminders
    // are visible together. Calling per-reminder would be redundant.
    openActionPopup();
  }
};

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== NEXT_TICK_ALARM && alarm.name !== SAFETY_ALARM) return;
  runReminderTick()
    .then(rescheduleNextTick)
    .catch((err) => console.error('[reminders] tick failed', err));
});
