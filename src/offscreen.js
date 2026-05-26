// Plays a reminder chime when triggered by background.js. Service workers
// can't host an AudioContext, so this hidden page does it for them.

let audioCtx = null;

const getCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
};

const playChime = () => {
  try {
    const ctx = getCtx();
    const t0 = ctx.currentTime;

    // Single bell-character note: sine fundamental + inharmonic partial at
    // ~2.76x (classic struck-bell ratio). Soft attack, long exponential
    // decay — reads as a reminder, not a notification beep.
    const bellNote = (freq, startOffset, duration = 1.2) => {
      const start = t0 + startOffset;
      const stop = start + duration;
      const fundGain = 0.28;
      const partialGain = 0.07;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const partial = ctx.createOscillator();
      partial.type = 'sine';
      partial.frequency.value = freq * 2.76;

      const g1 = ctx.createGain();
      const g2 = ctx.createGain();

      g1.gain.setValueAtTime(0.0001, start);
      g1.gain.exponentialRampToValueAtTime(fundGain, start + 0.008);
      g1.gain.exponentialRampToValueAtTime(0.0001, stop);

      g2.gain.setValueAtTime(0.0001, start);
      g2.gain.exponentialRampToValueAtTime(partialGain, start + 0.008);
      g2.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.45);

      osc.connect(g1).connect(ctx.destination);
      partial.connect(g2).connect(ctx.destination);

      osc.start(start);
      osc.stop(stop + 0.1);
      partial.start(start);
      partial.stop(start + duration * 0.45 + 0.1);
    };

    // G major arpeggio: G4, B4, D5 — friendly, calm, distinctly "reminder".
    bellNote(392, 0);
    bellNote(494, 0.18);
    bellNote(587, 0.36, 1.6);
  } catch (err) {
    console.error('Failed to play chime', err);
  }
};

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'play-reminder-chime') playChime();
});
