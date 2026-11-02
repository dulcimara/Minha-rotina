/**
 * Som do alerta, gerado pelo próprio navegador (não precisa de arquivo de áudio).
 *
 * Os navegadores só deixam tocar som depois que a pessoa toca na tela pelo
 * menos uma vez. Por isso "destravamos" o áudio no primeiro toque (main.tsx).
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function unlockAudio() {
  const c = getContext();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function tone(c: AudioContext, freq: number, start: number, duration: number, volume = 0.25) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Toca uma melodia curta (dó-mi-sol) algumas vezes. */
export function playChime(times = 3) {
  const c = getContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const notes = [523.25, 659.25, 783.99];
  for (let r = 0; r < times; r++) {
    const base = c.currentTime + 0.05 + r * 1.4;
    notes.forEach((f, i) => tone(c, f, base + i * 0.18, 0.5));
  }
}

export function vibrate() {
  try {
    navigator.vibrate?.([400, 200, 400, 200, 400]);
  } catch {
    // aparelho sem vibração
  }
}
