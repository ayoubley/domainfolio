/**
 * A short party-popper: a noise burst for the crack, a falling thump for the
 * charge and two bright pings for the streamers. Synthesised with the Web Audio
 * API, so the celebration ships without an audio file, and it stays silent on
 * browsers that cannot play it rather than throwing.
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

export function playPartyPopper(): void {
  const ctx = audioContext();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);

  const now = ctx.currentTime;

  // The crack: a band-passed noise burst that decays fast.
  const length = Math.floor(ctx.sampleRate * 0.22);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    const decay = Math.pow(1 - index / length, 3);
    samples[index] = (Math.random() * 2 - 1) * decay;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 1400;
  noiseFilter.Q.value = 0.8;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.45, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);

  // The charge: a quick falling thump underneath the crack.
  const thump = ctx.createOscillator();
  thump.type = "triangle";
  thump.frequency.setValueAtTime(180, now);
  thump.frequency.exponentialRampToValueAtTime(70, now + 0.16);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.26, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  thump.connect(thumpGain).connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.2);

  // The streamers: two short, bright pings a beat apart.
  [1250, 1680].forEach((frequency, index) => {
    const at = now + 0.12 + index * 0.11;
    const ping = ctx.createOscillator();
    ping.type = "sine";
    ping.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.12, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    ping.connect(gain).connect(ctx.destination);
    ping.start(at);
    ping.stop(at + 0.2);
  });
}
