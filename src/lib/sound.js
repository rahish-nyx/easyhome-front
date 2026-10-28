/**
 * A short, soft two-note chime for live notifications. Created lazily so the
 * browser only builds an AudioContext after the first user gesture.
 */
let audioContext = null;
let unlocked = false;
let lastPlayedAt = 0;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  return audioContext;
}

export function unlockNotificationSound() {
  const context = getContext();
  if (!context) return;
  unlocked = true;
  if (context.state === "suspended") context.resume().catch(() => {});
}

if (typeof window !== "undefined") {
  const unlock = () => unlockNotificationSound();
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
}

export function playNotificationSound() {
  const now = Date.now();
  // The bell can be mounted in more than one place; play once per event.
  if (now - lastPlayedAt < 1200) return;
  lastPlayedAt = now;

  const context = getContext();
  if (!context) return;
  if (context.state === "suspended") {
    if (!unlocked) return;
    context.resume().catch(() => {});
  }

  const start = context.currentTime + 0.01;
  const notes = [
    { frequency: 880, at: 0, duration: 0.16 },
    { frequency: 1174.66, at: 0.09, duration: 0.22 },
  ];

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0.0001, start + note.at);
    gain.gain.exponentialRampToValueAtTime(0.035, start + note.at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start + note.at);
    oscillator.stop(start + note.at + note.duration + 0.02);
  }
}
