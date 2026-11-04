/**
 * Voz do navegador: ouvir (reconhecimento) e falar (síntese).
 * Funciona melhor no Chrome do Android. No iPhone, use o Safari.
 */

// Tipos mínimos: a API ainda não está nos tipos padrão do TypeScript.
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface RecognitionErrorEvent {
  error: string;
}
export interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const speechRecognitionSupported = () => Boolean(getCtor());

export interface ListenHandlers {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "O microfone foi bloqueado. Libere o acesso ao microfone nas configurações do navegador.",
  "service-not-allowed": "O microfone foi bloqueado. Libere o acesso ao microfone nas configurações do navegador.",
  "no-speech": "Não ouvi nada. Toque no microfone e fale de novo.",
  "audio-capture": "Não encontrei um microfone neste aparelho.",
  network: "Sem internet: o reconhecimento de voz precisa de conexão.",
};

/** Começa a ouvir. Devolve uma função para parar. */
export function listen(handlers: ListenHandlers): () => void {
  const Ctor = getCtor();
  if (!Ctor) {
    handlers.onError("Este navegador não reconhece voz. Use o Chrome (Android) ou o Safari (iPhone), ou digite.");
    handlers.onEnd();
    return () => {};
  }

  const rec = new Ctor();
  rec.lang = "pt-BR";
  rec.interimResults = true;
  // Continua ouvindo depois de uma pausa curta (respirar entre "consulta" e "sexta às 15h").
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let finalText = "";
  let interimText = "";
  let finished = false;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  const maxTimer = setTimeout(() => stop(), MAX_LISTEN_MS);

  function stop() {
    if (silenceTimer) clearTimeout(silenceTimer);
    clearTimeout(maxTimer);
    try {
      rec.stop();
    } catch {
      // já parou
    }
  }

  rec.onresult = (e) => {
    // Remonta o texto inteiro a cada evento. No Android o Chrome às vezes
    // repete trechos já reconhecidos; mergeSegment evita a duplicação.
    let finals = "";
    let interim = "";
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finals = mergeSegment(finals, r[0].transcript);
      else interim += r[0].transcript;
    }
    finalText = finals;
    interimText = interim;
    handlers.onPartial(mergeSegment(finalText, interimText));

    // Para sozinho depois de alguns segundos de silêncio.
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => stop(), SILENCE_MS);
  };
  rec.onerror = (e) => {
    if (e.error === "aborted") return;
    if (e.error === "no-speech" && (finalText || interimText)) return;
    handlers.onError(ERROR_MESSAGES[e.error] ?? `Erro no reconhecimento de voz (${e.error}).`);
  };
  rec.onend = () => {
    if (finished) return;
    finished = true;
    if (silenceTimer) clearTimeout(silenceTimer);
    clearTimeout(maxTimer);
    const text = mergeSegment(finalText, interimText).trim();
    if (text) handlers.onFinal(text);
    handlers.onEnd();
  };

  try {
    rec.start();
  } catch {
    handlers.onError("Não foi possível ligar o microfone. Tente de novo.");
    handlers.onEnd();
  }
  return stop;
}

/** Quanto tempo de silêncio encerra a escuta. */
const SILENCE_MS = 2200;
/** Tempo máximo ouvindo de uma vez. */
const MAX_LISTEN_MS = 25_000;

/**
 * Junta um trecho novo ao texto já reconhecido, sem repetir:
 * - se o trecho novo já contém o anterior (Android manda acumulado), usa o novo;
 * - se o texto já termina com o trecho, ignora;
 * - senão, emenda.
 */
export function mergeSegment(previous: string, segment: string): string {
  const prev = previous.trim();
  const seg = segment.trim();
  if (!seg) return prev;
  if (!prev) return seg;
  const p = prev.toLowerCase();
  const s = seg.toLowerCase();
  if (s.startsWith(p)) return seg;
  if (p.endsWith(s)) return prev;
  return `${prev} ${seg}`;
}

// ---------------------------------------------------------------
// Falar em voz alta
// ---------------------------------------------------------------

function pickVoice(gender?: "male" | "female"): SpeechSynthesisVoice | undefined {
  if (!("speechSynthesis" in window)) return undefined;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("pt"));
  const br = voices.filter((v) => v.lang.toLowerCase() === "pt-br");
  const pool = br.length ? br : voices;
  if (!gender) return pool[0];
  const femaleHint = /female|feminin|luciana|francisca|maria|vit[óo]ria|camila|joana|helena|google português/i;
  const maleHint = /male|masculin|daniel|ant[ôo]nio|felipe|ricardo|thiago/i;
  const hint = gender === "female" ? femaleHint : maleHint;
  return pool.find((v) => hint.test(v.name)) ?? pool[0];
}

let speechUnlocked = false;

/**
 * O iPhone e alguns Android só deixam o app falar sozinho (na hora de um aviso)
 * se a voz já tiver sido usada depois de um toque na tela. Por isso, no primeiro
 * toque, falamos um texto vazio e mudo (main.tsx).
 */
export function unlockSpeech() {
  if (speechUnlocked || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechUnlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    u.lang = "pt-BR";
    window.speechSynthesis.speak(u);
  } catch {
    // sem voz disponível
  }
}

export function speak(text: string, gender?: "male" | "female") {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  const synth = window.speechSynthesis;
  const say = () => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      const voice = pickVoice(gender);
      if (voice) u.voice = voice;
      u.rate = 1;
      // No Android a voz às vezes fica "pausada" depois do app ir para segundo plano.
      synth.resume();
      synth.speak(u);
    } catch {
      // sem voz disponível: ignora
    }
  };
  // Falar logo depois de cancelar faz o Chrome engolir a fala; espera um pouco.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(say, 120);
  } else {
    say();
  }
}
