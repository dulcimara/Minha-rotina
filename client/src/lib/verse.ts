/**
 * Versículo do dia: um versículo de Provérbios sorteado uma vez por dia.
 * Texto: Almeida em domínio público, pela API gratuita bible-api.com (tradução "almeida").
 * Fica guardado no aparelho até o dia seguinte, para não mudar a cada abertura.
 */
export interface Verse {
  day: string; // AAAA-MM-DD
  ref: string; // "Provérbios 3:5"
  text: string;
}

const KEY = "minha-rotina:versiculo";
const URL = "https://bible-api.com/data/almeida/random/PRO";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function cachedVerse(): Verse | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Verse | null;
    return v && v.day === today() ? v : null;
  } catch {
    return null;
  }
}

export async function verseOfTheDay(): Promise<Verse | null> {
  const cached = cachedVerse();
  if (cached) return cached;
  try {
    const res = await fetch(URL);
    if (!res.ok) return null;
    const json = (await res.json()) as { random_verse?: { book?: string; chapter?: number; verse?: number; text?: string } };
    const r = json.random_verse;
    const text = r?.text?.replace(/\s+/g, " ").trim();
    if (!r || !text) return null;
    const v: Verse = { day: today(), ref: `${r.book || "Provérbios"} ${r.chapter}:${r.verse}`, text };
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* sem armazenamento: busca de novo na próxima abertura */
    }
    return v;
  } catch {
    return null; // sem internet ou serviço fora do ar: o espaço simplesmente não aparece
  }
}
