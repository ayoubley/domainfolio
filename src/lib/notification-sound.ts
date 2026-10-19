/**
 * The soft two-note chime that confirms a successful save. It is intentionally
 * quiet and short — a notification, not a fanfare — and it is synthesised with
 * the Web Audio API, so nothing has to be downloaded. Browsers that cannot play
 * it stay silent instead of throwing.
 */
let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  return context;
}

export function playSuccessChime(): void {
  const ctx = audioContext();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);

  const now = ctx.currentTime;

  // A rising fifth, each note rounded off with a low-pass so nothing rings
  // harshly: E5 then B5, very short and very low in the mix.
  [659.25, 987.77].forEach((frequency, index) => {
    const at = now + index * 0.11;

    const note = ctx.createOscillator();
    note.type = "sine";
    note.frequency.value = frequency;

    const softener = ctx.createBiquadFilter();
    softener.type = "lowpass";
    softener.frequency.value = 2400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.06, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);

    note.connect(softener).connect(gain).connect(ctx.destination);
    note.start(at);
    note.stop(at + 0.55);
  });
}
