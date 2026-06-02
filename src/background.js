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
const MINUTE_MS = 60 * 1000;
const HALF_HOUR_MS = 30 * MINUTE_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchSuggestions') {
    fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(request.query)}`)
      .then(res => res.json())
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

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

// First-install default layout. Seeded ONLY on a genuine fresh install
// (onInstalled reason === 'install'), never on extension updates, and only
// when no dashboard data exists yet — so existing users and anyone who
// deliberately cleared their dashboard are never overwritten or re-seeded.
// Captured verbatim from a reference setup; favicons are recomputed at render
// time (browser _favicon store), so the stored favicon values are only
// fallbacks and don't need to be fresh.
const DEFAULT_DASHBOARD = {
  links: JSON.parse('[{"h":1,"i":"google-search-1780419508526","id":"google-search-1780419508526","logoStyle":"mono","title":"Google Search","type":"google-search","variant":"logo","w":6,"x":6,"y":3},{"favicon":"https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F1%2F%23inbox&size=128","h":1,"i":"link-1780419544471","id":"link-1780419544471","isHeaderLink":true,"order":2,"theme":"default","title":"mail.google.com","type":"link","url":"https://mail.google.com/mail/u/1/#inbox","viewMode":"icon","w":1},{"favicon":"https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https%3A%2F%2Fmyaccount.google.com%2F&size=128","h":1,"i":"link-1780420031738","id":"link-1780420031738","isHeaderLink":true,"order":0,"theme":"default","title":"myaccount.google.com","type":"link","url":"https://myaccount.google.com/","viewMode":"icon","w":1},{"favicon":"https://www.gstatic.com/images/branding/productlogos/drive_2026/v1/web-32dp/logo_drive_2026_color_1x_web_32dp.png","h":2,"i":"link-1780420063700","id":"link-1780420063700","isHeaderLink":true,"order":6,"title":"Home - Google Drive","type":"link","url":"https://drive.google.com/drive/u/1/home","w":2},{"favicon":"https://www.youtube.com/favicon.ico","h":2,"i":"link-1780420076803","id":"link-1780420076803","isHeaderLink":true,"order":4,"title":"YouTube","type":"link","url":"https://www.youtube.com/?authuser=1","w":2},{"favicon":"https://www.google.com/images/branding/product/ico/web_maps_icon_32dp.ico","h":2,"i":"link-1780420131532","id":"link-1780420131532","isHeaderLink":true,"order":5,"title":"Google Maps","type":"link","url":"https://www.google.com/maps/@25.5804961,83.5603103,5548m/data=!3m1!1e3?authuser=1&entry=ttu&g_ep=EgoyMDI2MDUyNy4wIKXMDSoASAFQAw%3D%3D","w":2},{"favicon":"https://gstatic.com/images/branding/productlogos/meet_2026/v2/web-32dp/logo_meet_2026_color_1x_web_32dp.png","h":2,"i":"link-1780420199762","id":"link-1780420199762","isHeaderLink":true,"order":7,"title":"Google Meet","type":"link","url":"https://meet.google.com/landing?hs=197&authuser=1","w":2},{"favicon":"https://ssl.gstatic.com/social/photosui/images/logo/favicon_alldp.ico","h":2,"i":"link-1780420232726","id":"link-1780420232726","isHeaderLink":true,"order":3,"title":"Photos - Google Photos","type":"link","url":"https://photos.google.com/u/1/","w":2},{"favicon":"https://www.gstatic.com/images/branding/productlogos/calendar_2026_02/v2/ico/calendar_2026_02_32dp.ico","h":2,"i":"link-1780422139545","id":"link-1780422139545","isHeaderLink":true,"order":1,"title":"Google Calendar - Week of May 31, 2026","type":"link","url":"https://calendar.google.com/calendar/u/1/r","w":2},{"favicon":"https://www.gstatic.com/images/branding/productlogos/keep_2026/v2/web/192px.svg","h":2,"i":"link-1780422164463","id":"link-1780422164463","isHeaderLink":true,"order":8,"title":"Google Keep","type":"link","url":"https://keep.google.com/u/1/","w":2}]'),
  settings: { openInNewTab: false, themeMode: 'device', themeColor: '271 91% 65%' },
};

const seedDefaultLayout = (reason) => {
  if (reason !== 'install') return;
  chrome.storage.local.get(['dashboardLinks'], (result) => {
    if (result.dashboardLinks !== undefined) return;
    chrome.storage.local.set({
      dashboardLinks: DEFAULT_DASHBOARD.links,
      dashboardSettings: DEFAULT_DASHBOARD.settings,
    });
  });
};

chrome.runtime.onInstalled.addListener((details) => {
  seedDefaultLayout(details.reason);
  ensureSafetyAlarm();
  refreshBadge();
  runReminderTick().then(rescheduleNextTick).catch((err) => console.error('[reminders] boot failed', err));
});

chrome.runtime.onStartup.addListener(() => {
  ensureSafetyAlarm();
  refreshBadge();
  runReminderTick().then(rescheduleNextTick).catch((err) => console.error('[reminders] startup failed', err));
});

const formatRecurrenceLabel = (entry) => {
  switch (entry.recurrence) {
    case '30min': return '30 min';
    case 'hourly': return 'hourly';
    case 'daily': return 'daily';
    case 'weekly': return 'weekly';
    case 'custom': {
      const ms = entry.customIntervalMs || 0;
      const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
      if (minutes >= 1440 && minutes % 1440 === 0) return `every ${minutes / 1440}d`;
      if (minutes >= 60 && minutes % 60 === 0) return `every ${minutes / 60}h`;
      return `every ${minutes}m`;
    }
    default: return '';
  }
};

const advanceDueAt = (dueAt, recurrence, now, customIntervalMs) => {
  const step =
    recurrence === '30min' ? HALF_HOUR_MS :
    recurrence === 'hourly' ? HOUR_MS :
    recurrence === 'daily' ? DAY_MS :
    recurrence === 'weekly' ? WEEK_MS :
    recurrence === 'custom' ? Math.max(MINUTE_MS, customIntervalMs || 0) :
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
    const recurrenceSuffix = entry.recurrence !== 'none' ? ` · ${formatRecurrenceLabel(entry)}` : '';
    await chrome.notifications.create(`reminder-${entry.id}-${Date.now()}`, {
      type: 'basic',
      iconUrl,
      title: 'Reminder',
      message: `${entry.text}${recurrenceSuffix} (${timeLabel})`,
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
      next.push({ ...entry, lastFiredAt: now, dueAt: advanceDueAt(entry.dueAt, entry.recurrence, now, entry.customIntervalMs) });
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
