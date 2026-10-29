/**
 * Live notification bell.
 *
 * A small synth keeps the app free of audio files while still producing a
 * bright, clearly audible bell. The AudioContext is created lazily and primed
 * by the first pointer/key gesture so browser autoplay rules are respected.
 */
let audioContext = null;
let bellBus = null;
let unlocked = false;
let lastPlayedAt = 0;

const STRIKE_FREQUENCIES = [880, 1174.66];
const STRIKE_OFFSETS = [0, 0.19];

// Inharmonic ratios are what make a tone read as a bell rather than a beep.
const PARTIALS = [
  { ratio: 0.5, gain: 0.26, decay: 1.8 },
  { ratio: 1, gain: 0.44, decay: 1.35 },
  { ratio: 2.01, gain: 0.24, decay: 1.0 },
  { ratio: 2.76, gain: 0.16, decay: 0.8 },
  { ratio: 4.07, gain: 0.1, decay: 0.55 },
  { ratio: 5.43, gain: 0.07, decay: 0.42 },
];

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  return audioContext;
}

function getBellBus(context) {
  if (bellBus) return bellBus;

  // The compressor catches the summed partials so the louder bell stays clean
  // on small laptop speakers instead of clipping.
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 12;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  compressor.connect(context.destination);

  bellBus = context.createGain();
  bellBus.gain.value = 0.92;
  bellBus.connect(compressor);
  return bellBus;
}

function strike(context, start, frequency, level) {
  const output = getBellBus(context);

  for (const partial of PARTIALS) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const peak = Math.max(0.0001, partial.gain * level);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + partial.decay);

    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(start);
    oscillator.stop(start + partial.decay + 0.05);
  }
}

export function unlockNotificationSound() {
  const context = getContext();
  if (!context) return;
  unlocked = true;
  if (context.state !== "running") context.resume().catch(() => {});
}

if (typeof window !== "undefined") {
  const unlock = () => unlockNotificationSound();
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
}

export function playNotificationSound() {
  const context = getContext();
  if (!context) return;

  // A suspended context cannot play until the first gesture unlocks it. Do not
  // consume the throttle window while audio is still blocked.
  if (context.state !== "running" && !unlocked) return;

  const now = Date.now();
  // The bell can be mounted in more than one place; play once per event.
  if (now - lastPlayedAt < 1200) return;
  lastPlayedAt = now;

  const ring = () => {
    const start = context.currentTime + 0.01;
    STRIKE_FREQUENCIES.forEach((frequency, index) => {
      strike(context, start + STRIKE_OFFSETS[index], frequency, index ? 0.84 : 1);
    });
  };

  if (context.state === "running") {
    ring();
    return;
  }

  // A gesture has unlocked audio; resume before scheduling so the first alert
  // is not swallowed while the context is still suspended.
  if (!unlocked) return;
  context.resume().then(ring).catch(() => {});
}
