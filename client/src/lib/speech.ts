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
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onPartial((finalText + " " + interim).trim());
  };
  rec.onerror = (e) => {
    if (e.error === "aborted") return;
    handlers.onError(ERROR_MESSAGES[e.error] ?? `Erro no reconhecimento de voz (${e.error}).`);
  };
  rec.onend = () => {
    if (finalText.trim()) handlers.onFinal(finalText.trim());
    handlers.onEnd();
  };

  try {
    rec.start();
  } catch {
    handlers.onError("Não foi possível ligar o microfone. Tente de novo.");
    handlers.onEnd();
  }
  return () => rec.stop();
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

export function speak(text: string, gender?: "male" | "female") {
  if (!("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    const voice = pickVoice(gender);
    if (voice) u.voice = voice;
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // sem voz disponível: ignora
  }
}
