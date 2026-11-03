import { PRESETS, type Repeat } from "@/lib/lembretes";
import { SPORTS } from "@/lib/workouts";

/**
 * Interpretador de comandos de voz (sem IA).
 *
 * Recebe a frase que a pessoa falou (já transformada em texto pelo navegador)
 * e descobre o que ela quer: compromisso/alarme, item de compras, aniversário
 * ou registro de menstruação. O resultado sempre passa por uma tela de
 * confirmação, onde a pessoa pode corrigir qualquer campo antes de salvar.
 */

export type VoiceCommand =
  | {
      kind: "activity";
      title: string;
      address?: string;
      phone?: string;
      /** dias da semana em que repete (0 = domingo ... 6 = sábado) */
      repeatDays?: number[];
      date: Date;
      hasTime: boolean;
      category: string;
      reminderEnabled: boolean;
      minutesBefore: number;
    }
  | { kind: "shopping"; items: string[] }
  | { kind: "birthday"; name: string; day?: number; month?: number; giftIdeas?: string }
  | { kind: "period_start"; date: Date }
  | { kind: "period_end"; date: Date }
  | { kind: "reminder"; title: string; emoji?: string; date: Date; time?: string; repeat: Repeat }
  | { kind: "workout"; activity: string; date: Date; minutes?: number; distanceKm?: number }
  | {
      kind: "medication";
      name: string;
      dose?: string;
      everyHours?: number;
      firstTime?: string;
      days?: number;
      forName?: string;
    }
  | { kind: "movie"; title: string; movieKind: "filme" | "serie"; status: "quero" | "assistindo" | "assisti"; rating?: number; where?: string }
  | { kind: "unknown"; text: string };

// Limites de palavra que funcionam com acentos ("às", "amanhã"); o \\b do
// JavaScript só entende letras sem acento.
const START = "(?:^|(?<=[\\s,.;:!?]))";
const END = "(?=$|[\\s,.;:!?])";

// ---------------------------------------------------------------
// Números por extenso
// ---------------------------------------------------------------

const UNITS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, "três": 3, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9,
};
const TEENS: Record<string, number> = {
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15,
  dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
};
const TENS: Record<string, number> = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50 };

const NUMBER_WORD =
  "(?:(?:vinte|trinta|quarenta|cinquenta)(?:\\s+e\\s+(?:um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove))?" +
  "|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove" +
  "|um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove)";

function wordToNumber(word: string): number | undefined {
  const w = word.trim();
  if (w in UNITS) return UNITS[w];
  if (w in TEENS) return TEENS[w];
  if (w in TENS) return TENS[w];
  const m = w.match(/^(vinte|trinta|quarenta|cinquenta)\s+e\s+(\S+)$/);
  if (m && m[2] in UNITS) return TENS[m[1]] + UNITS[m[2]];
  return undefined;
}

/** Troca números por extenso por algarismos, só onde fazem sentido (horas, dias, minutos). */
function normalizeNumbers(text: string): string {
  const after = new RegExp(`(${START}(?:às|as|ás|dia|daqui a|daqui|em|até)\\s+)(${NUMBER_WORD})${END}`, "g");
  const before = new RegExp(
    `${START}(${NUMBER_WORD})(?=\\s+(?:minutos?|horas?|dias?|semanas?|da manhã|da manha|da tarde|da noite|da madrugada|de (?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)))`,
    "g",
  );
  return text
    .replace(after, (_m, pre: string, w: string) => `${pre}${wordToNumber(w) ?? w}`)
    .replace(before, (_m, w: string) => `${wordToNumber(w) ?? w}`)
    .replace(/\be\s+meia(?!\s*hora)\b/g, "e 30");
}

// ---------------------------------------------------------------
// Datas
// ---------------------------------------------------------------

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const MONTH_RE = "(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)";

const WEEKDAYS: Record<string, number> = {
  domingo: 0, segunda: 1, "terça": 2, terca: 2, quarta: 3, quinta: 4, sexta: 5, "sábado": 6, sabado: 6,
};
const WEEKDAY_RE =
  "(?:(?:na|no|nesta|neste|nessa|nesse|esta|este|essa|esse|próxima|proxima|próximo|proximo)\\s+)?" +
  "(domingo|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado)(?:[-\\s]feira)?(?:\\s+que\\s+vem)?";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

interface DateMatch {
  date: Date;
  /** quando "daqui a X minutos/horas" já define o horário */
  exactTime?: boolean;
  remove: string[];
}

function findDate(text: string, now: Date, allowPast: boolean): DateMatch | undefined {
  const today = startOfDay(now);
  let m: RegExpMatchArray | null;

  // daqui a 10 minutos / daqui a 2 horas / daqui a 3 dias
  if ((m = text.match(/\b(?:daqui\s+a|daqui|em)\s+(\d{1,3})\s+(minutos?|horas?|dias?|semanas?)\b/))) {
    const n = Number(m[1]);
    const unit = m[2];
    if (unit.startsWith("minuto")) return { date: new Date(now.getTime() + n * 60_000), exactTime: true, remove: [m[0]] };
    if (unit.startsWith("hora")) return { date: new Date(now.getTime() + n * 3_600_000), exactTime: true, remove: [m[0]] };
    if (unit.startsWith("semana")) return { date: addDays(today, n * 7), remove: [m[0]] };
    return { date: addDays(today, n), remove: [m[0]] };
  }
  if ((m = text.match(/\b(?:daqui\s+a|daqui)\s+meia\s+hora\b/))) {
    return { date: new Date(now.getTime() + 30 * 60_000), exactTime: true, remove: [m[0]] };
  }

  if ((m = text.match(new RegExp(`\\bdepois\\s+de\\s+amanh[ãa]${END}`)))) return { date: addDays(today, 2), remove: [m[0]] };
  if ((m = text.match(new RegExp(`\\b(?:para\\s+|pra\\s+)?amanh[ãa]${END}`)))) return { date: addDays(today, 1), remove: [m[0]] };
  if ((m = text.match(/\banteontem\b/))) return { date: addDays(today, -2), remove: [m[0]] };
  if ((m = text.match(/\bontem\b/))) return { date: addDays(today, -1), remove: [m[0]] };
  if ((m = text.match(/\b(?:para\s+|pra\s+)?hoje\b/))) return { date: today, remove: [m[0]] };

  // 12/11, 12/11/2026, 12-11
  if ((m = text.match(/\b(?:dia\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/))) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = m[3] ? Number(m[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    let date = new Date(year, month - 1, day);
    if (!m[3] && !allowPast && date < today) date = new Date(year + 1, month - 1, day);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { date, remove: [m[0]] };
  }

  // (dia) 12 de dezembro (de 2026)
  if ((m = text.match(new RegExp(`\\b(?:(?:no\\s+)?dia\\s+)?(\\d{1,2})\\s+de\\s+${MONTH_RE}(?:\\s+de\\s+(\\d{4}))?`)))) {
    const day = Number(m[1]);
    const month = MONTHS[m[2]];
    const year = m[3] ? Number(m[3]) : now.getFullYear();
    let date = new Date(year, month - 1, day);
    if (!m[3] && !allowPast && date < today) date = new Date(year + 1, month - 1, day);
    return { date, remove: [m[0]] };
  }

  // segunda, na sexta, próxima quarta-feira
  if ((m = text.match(new RegExp(`\\b${WEEKDAY_RE}\\b`)))) {
    const target = WEEKDAYS[m[1]];
    let delta = (target - today.getDay() + 7) % 7;
    const explicitNext = /pr[óo]xim|que\s+vem/.test(m[0]);
    if (allowPast) {
      // "comecei na segunda" -> segunda passada
      delta = delta === 0 ? 0 : delta - 7;
    } else if (delta === 0 && explicitNext) {
      delta = 7;
    }
    return { date: addDays(today, delta), remove: [m[0]] };
  }

  // dia 12 (deste mês, ou do próximo se já passou)
  if ((m = text.match(/\b(?:no\s+)?dia\s+(\d{1,2})\b/))) {
    const day = Number(m[1]);
    let date = new Date(today.getFullYear(), today.getMonth(), day);
    if (!allowPast && date < today) date = new Date(today.getFullYear(), today.getMonth() + 1, day);
    return { date, remove: [m[0]] };
  }

  return undefined;
}

// ---------------------------------------------------------------
// Horários
// ---------------------------------------------------------------

interface TimeMatch {
  hours: number;
  minutes: number;
  remove: string[];
}

function findTime(text: string): TimeMatch | undefined {
  let m: RegExpMatchArray | null;

  if ((m = text.match(new RegExp(`${START}(?:ao\\s+|à\\s+|a\\s+)?meio[-\\s]dia(?:\\s+e\\s+(\\d{1,2}))?\\b`)))) {
    return { hours: 12, minutes: m[1] ? Number(m[1]) : 0, remove: [m[0]] };
  }
  if ((m = text.match(new RegExp(`${START}(?:à\\s+|a\\s+)?meia[-\\s]noite\\b`)))) return { hours: 0, minutes: 0, remove: [m[0]] };

  const period = "(?:\\s+(?:da|de)\\s+(manhã|manha|tarde|noite|madrugada))?";

  // às 15h, às 15:30, às 15h30, as 3 da tarde, às 10 e 30, às 9 horas
  const withPrefix = new RegExp(
    `${START}(?:às|as|ás|para\\s+as|para\\s+às|pras|até\\s+as|até\\s+às)\\s+(\\d{1,2})` +
      `(?:\\s*(?:horas?|hs|h|:)\\s*(\\d{2})?)?` +
      `(?:\\s+e\\s+(\\d{1,2})(?:\\s+minutos?)?)?` +
      `(?:\\s*(?:horas?|hs|h)\\b)?` +
      period,
  );
  // 15h, 15:30, 15h30 (sem "às")
  const bare = new RegExp(`\\b(\\d{1,2})\\s*(?::|h(?=\\d|\\b))\\s*(\\d{2})?()` + period);

  m = text.match(withPrefix) ?? text.match(bare);
  if (!m) return undefined;

  let hours = Number(m[1]);
  const minutes = m[2] ? Number(m[2]) : m[3] ? Number(m[3]) : 0;
  const part = m[4];
  if (part && (part === "tarde" || part === "noite") && hours < 12) hours += 12;
  if (part === "noite" && hours === 24) hours = 0;
  if (hours > 23 || minutes > 59) return undefined;
  return { hours, minutes, remove: [m[0]] };
}

// ---------------------------------------------------------------
// Repetição: "todo dia", "de segunda a sexta", "toda terça e quinta"
// ---------------------------------------------------------------

const WD = "(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)s?(?:[-\\s]feiras?)?";

function weekdayNumber(word: string): number {
  const w = word.replace(/s?(?:[-\s]feiras?)?$/, "").replace(/s$/, "");
  return WEEKDAYS[w] ?? WEEKDAYS[w + "s"] ?? -1;
}

function findRepeat(text: string): { days: number[]; remove: string[] } | undefined {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/\b(?:todos\s+os\s+dias|todo\s+(?:santo\s+)?dia|diariamente)\b/))) {
    return { days: [0, 1, 2, 3, 4, 5, 6], remove: [m[0]] };
  }
  if ((m = text.match(new RegExp(`\\b(?:de\\s+|toda\\s+)?segunda(?:[-\\s]feira)?\\s+a\\s+sexta(?:[-\\s]feira)?|\\bdias\\s+[úu]teis${END}|\\bdurante\\s+a\\s+semana${END}`)))) {
    return { days: [1, 2, 3, 4, 5], remove: [m[0]] };
  }
  if ((m = text.match(/\b(?:todo\s+|todos\s+os\s+|nos\s+|aos\s+)?fins?\s+de\s+semana\b/))) {
    return { days: [0, 6], remove: [m[0]] };
  }
  const list = new RegExp(
    `(?:${START}(toda|todo|todas\\s+as|todos\\s+os|nas|nos|às|as|aos)\\s+)?(${WD}(?:\\s*(?:,|e)\\s*(?:a\\s+|o\\s+)?${WD})*)`,
  );
  if ((m = text.match(list))) {
    const prefix = m[1] ?? "";
    const words = m[2].split(/\s*(?:,|\be\b)\s*/).map((w) => w.replace(/^(?:a|o)\s+/, "").trim()).filter(Boolean);
    const plural = words.some((w) => /^(?:segundas|terças|tercas|quartas|quintas|sextas|sábados|sabados|domingos)/.test(w));
    if (/^tod/.test(prefix) || plural) {
      const days = Array.from(new Set(words.map(weekdayNumber).filter((d) => d >= 0))).sort();
      if (days.length) return { days, remove: [m[0]] };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------
// "Avisar X minutos antes"
// ---------------------------------------------------------------

function findAdvance(text: string): { minutes: number; remove: string[] } | undefined {
  let m: RegExpMatchArray | null;
  const verbs =
    "(?:(?:e\\s+)?(?:me\\s+)?(?:avis[ae]r?|avise|lembr[ae]r?|lembre|alert[ae]r?|alerte|notifiqu?e)(?:\\s+me)?\\s+)?(?:com\\s+)?";

  if ((m = text.match(new RegExp(`${verbs}meia\\s+hora\\s+(?:antes|de\\s+anteced[êe]ncia)`)))) {
    return { minutes: 30, remove: [m[0]] };
  }
  if ((m = text.match(new RegExp(`${verbs}(\\d{1,3})\\s+(minutos?|horas?|dias?)\\s+(?:antes|de\\s+anteced[êe]ncia)`)))) {
    const n = Number(m[1]);
    const unit = m[2];
    const minutes = unit.startsWith("hora") ? n * 60 : unit.startsWith("dia") ? n * 1440 : n;
    return { minutes, remove: [m[0]] };
  }
  if ((m = text.match(new RegExp(`${verbs}(?:um|uma|1)\\s+(hora|dia)\\s+antes`)))) {
    return { minutes: m[1] === "hora" ? 60 : 1440, remove: [m[0]] };
  }
  if ((m = text.match(new RegExp(`${verbs}na\\s+(?:hora|v[ée]spera)`)))) {
    return { minutes: /v[ée]spera/.test(m[0]) ? 1440 : 0, remove: [m[0]] };
  }
  return undefined;
}

// ---------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------

const CATEGORY_WORDS: [string, RegExp][] = [
  ["saude", /\b(consulta|m[ée]dic[oa]|dentista|exame|vacina|rem[ée]dio|terapia|psic[óo]log|fisioterap|pediatra|ginecolog|hospital|cl[íi]nica|ultrassom)/],
  ["fitness", /\b(academia|treino|caminhada|corrida|pilates|yoga|ioga|nata[çc][ãa]o|muscula[çc][ãa]o|exerc[íi]cio)/],
  ["autocuidado", /\b(unha|manicure|cabelo|sal[ãa]o|massagem|depila[çc][ãa]o|sobrancelha|skincare|descans)/],
  ["familia", /\b(escola|filh[oa]|crian[çc]a|beb[êe]|reuni[ãa]o de pais|m[ãa]e|pai|v[óo]|av[óo]|marido|esposa|fam[íi]lia)/],
  ["trabalho", /\b(reuni[ãa]o|trabalho|cliente|entrega|relat[óo]rio|apresenta[çc][ãa]o|chefe|escrit[óo]rio|call)/],
  ["casa", /\b(limpar|lavar|faxina|roupa|cozinhar|almo[çc]o|jantar|conta|pagar|boleto|lixo|passar|arrumar|mercado|feira|g[áa]s)/],
  ["lazer", /\b(cinema|passeio|viagem|festa|show|praia|parque|anivers[áa]rio)/],
];

export function guessCategory(text: string): string {
  for (const [category, re] of CATEGORY_WORDS) if (re.test(text)) return category;
  return "outros";
}

// ---------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------

function capitalize(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function cleanup(s: string): string {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function removeAll(text: string, parts: string[]): string {
  let out = text;
  for (const p of parts) out = out.replace(p, " ");
  return out;
}

// ---------------------------------------------------------------
// Detecção da intenção
// ---------------------------------------------------------------

const SHOPPING_RE =
  /\b(lista\s+(?:de\s+compras?|do\s+mercado|de\s+mercado|da\s+feira|de\s+supermercado)|na\s+lista|para\s+a\s+lista|pra\s+lista|(?:preciso|tenho\s+que|tem\s+que)\s+comprar|^comprar\b|^compra\b|faltando|acabou\s+o|acabou\s+a)/;

const PERIOD_RE = /\b(menstrua[çc][ãa]o|menstruada|menstruei|minha\s+regra|fiquei\s+de\s+regra|per[íi]odo\s+menstrual)/;
const PERIOD_END_RE = /\b(terminou|acabou|parou|passou|fim|terminei|acabei|parei)\b/;

function parseShopping(text: string): VoiceCommand {
  const body = text
    .replace(
      /\b(?:por\s+favor|coloca|coloque|colocar|adiciona|adicione|adicionar|inclui|inclua|incluir|bota|bote|botar|p[õo]e|ponha|anota|anote|anotar|acrescenta|acrescente|acrescentar)\b/g,
      " ",
    )
    .replace(new RegExp(`${START}(?:(?:na|à|a|para\\s+a|pra|para)\\s+)?lista(?:\\s+(?:de\\s+compras?|do\\s+mercado|de\\s+mercado|da\\s+feira|de\\s+supermercado))?\\b`, "g"), " ")
    .replace(/\b(?:eu\s+)?(?:preciso|tenho\s+que|tem\s+que)\s+comprar\b/g, " ")
    .replace(/^\s*compra(r)?\b/, " ")
    .replace(/\b(?:est[áa]\s+)?faltando\b/g, " ")
    .replace(/\bacabou\s+(?:o|a|os|as)\b/g, " ")
    .replace(/\b(?:no|do)\s+mercado\b/g, " ");

  const items = body
    .split(/,|;|\s+e\s+|\s+mais\s+|\s+também\s+/)
    .map((i) => cleanup(i.replace(/^(?:o|a|os|as|um|uma|uns|umas)\s+/, "")))
    .filter((i) => i.length > 0)
    .map(capitalize);

  return { kind: "shopping", items };
}

function parsePeriod(text: string, now: Date): VoiceCommand {
  const found = findDate(text, now, true);
  const date = found?.date ?? startOfDay(now);
  return PERIOD_END_RE.test(text) ? { kind: "period_end", date } : { kind: "period_start", date };
}

function parseBirthday(input: string, now: Date): VoiceCommand {
  // "..., ideia de presente perfume" (vai até o fim da frase)
  let text = input;
  let giftIdeas: string | undefined;
  const giftMatch = text.match(/[,;]?\s*(?:ideias?\s+de\s+presentes?|sugest(?:ão|ao|ões|oes)\s+de\s+presentes?|presente)\s*(?:é|:|seria|pode\s+ser)?\s+(.+)$/);
  if (giftMatch) {
    giftIdeas = capitalize(cleanup(giftMatch[1]));
    text = text.slice(0, giftMatch.index);
  }
  const found = findDate(text, now, true);
  const rest = found ? removeAll(text, found.remove) : text;

  const nameMatch = rest.match(
    new RegExp(`anivers[áa]rio\\s+(?:da|do|de|das|dos)\\s+(.+?)(?:\\s+(?:é|e|que\\s+é|no|em|dia|fica)${END}|$)`),
  );
  let name = nameMatch ? nameMatch[1] : "";
  name = cleanup(name.replace(/\b(?:minha|meu|minhas|meus)\b/g, (w) => w));

  return {
    kind: "birthday",
    name: capitalize(name),
    day: found ? found.date.getDate() : undefined,
    month: found ? found.date.getMonth() + 1 : undefined,
    giftIdeas: giftIdeas || undefined,
  };
}

const ACTIVITY_COMMAND_RE =
  /^(?:(?:por\s+favor|ok|oi|ei|eu)\s+)*(?:incluir|inclui|inclua|adicionar|adiciona|adicione|marcar|marca|marque|agendar|agenda|agende|criar|cria|crie|colocar|coloca|coloque|registrar|registra|registre|anotar|anota|anote|cadastrar|cadastra|cadastre|salvar|salva|salve|novo|nova|tenho|terei|vou\s+ter)\b\s*/;

const ACTIVITY_HINT_RE =
  /\b(compromisso|atividade|consulta|reuni[ãa]o|alarme|lembrete|lembrar|lembra|lembre|avis[ae]|avisar|agendar|marcar|incluir|adicionar|tenho)\b/;

function parseActivity(original: string, now: Date): VoiceCommand {
  let text = original;

  // "telefone 61 99999 0000"
  let phone: string | undefined;
  const phoneMatch = text.match(/\b(?:telefone|fone|celular|contato)\s*(?:é|:)?\s*([\d\s()+-]{8,})/);
  if (phoneMatch) {
    phone = phoneMatch[1].trim();
    text = text.replace(phoneMatch[0], " ");
  }

  // "no endereço Rua das Flores 123" (vai até "às", "dia", "amanhã", "e me avisa"... ou o fim)
  let address: string | undefined;
  const addressMatch = text.match(
    new RegExp(
      `\\b(?:no\\s+|com\\s+)?endere[çc]o\\s*(?:é|:)?\\s+(.+?)(?=\\s+(?:às|as|ás|dia|hoje|amanh[ãa]|depois\\s+de|na\\s+(?:segunda|terça|terca|quarta|quinta|sexta)|no\\s+(?:sábado|sabado|domingo)|e\\s+me|me\\s+avis|avisar|com\\s+\\d)${END}|$)`,
    ),
  );
  if (addressMatch) {
    address = cleanup(addressMatch[1]);
    address = address ? formatAddress(address) : undefined;
    text = text.replace(addressMatch[0], " ");
  }

  const advance = findAdvance(text);
  if (advance) text = removeAll(text, advance.remove);

  const repeat = findRepeat(text);
  if (repeat) text = removeAll(text, repeat.remove);

  const dateFound = repeat ? undefined : findDate(text, now, false);
  if (dateFound) text = removeAll(text, dateFound.remove);

  const timeFound = dateFound?.exactTime ? undefined : findTime(text);
  if (timeFound) text = removeAll(text, timeFound.remove);

  const isAlarm = /\b(alarme|despertador|me\s+lembr[ae]|lembrete|me\s+avis[ae]|me\s+acord[ae])\b/.test(original);

  // Título: tira as palavras de comando e sobras de ligação.
  let title = text
    .replace(ACTIVITY_COMMAND_RE, "")
    .replace(/^(?:um|uma)\s+(?:novo\s+|nova\s+)?/, "")
    .replace(/^(?:compromisso|atividade|alarme|lembrete|evento)\b\s*(?:de|para|pra|:)?\s*/, "")
    .replace(/^(?:me\s+)?(?:lembr[ae]r?|avis[ae]r?)\s+(?:me\s+)?(?:de|que|para|pra)?\s*/, "")
    .replace(/^(?:me\s+acord[ae]r?)\b/, "Acordar")
    .replace(new RegExp(`${START}(?:para|pra|no|na|de|às|as|à|e)\\s*$`), "")
    .replace(/\s+(?:para|pra)\s*$/g, "");
  title = cleanup(title);
  title = cleanup(title.replace(/\s+(?:para|pra|no|na|de|às|as|à|e)$/, ""));
  if (!title) title = isAlarm ? "Alarme" : "Compromisso";

  let date: Date;
  let hasTime = false;
  if (dateFound?.exactTime) {
    date = dateFound.date;
    hasTime = true;
  } else {
    date = dateFound ? new Date(dateFound.date) : startOfDay(now);
    if (timeFound) {
      date.setHours(timeFound.hours, timeFound.minutes, 0, 0);
      hasTime = true;
      // "às 7h" dito à noite, sem dia: entende como amanhã
      if (!dateFound && date.getTime() < now.getTime() - 60_000) date = addDays(date, 1), date.setHours(timeFound.hours, timeFound.minutes, 0, 0);
    } else {
      date.setHours(9, 0, 0, 0);
    }
  }

  // Recorrente: começa na próxima vez que cair num dos dias escolhidos.
  if (repeat) {
    for (let i = 0; i < 7; i++) {
      const d = addDays(startOfDay(now), i);
      if (!repeat.days.includes(d.getDay())) continue;
      d.setHours(date.getHours(), date.getMinutes(), 0, 0);
      if (i === 0 && hasTime && d.getTime() < now.getTime() - 60_000) continue;
      date = d;
      break;
    }
  }

  const minutesBefore = advance ? advance.minutes : isAlarm ? 0 : 30;

  return {
    kind: "activity",
    title: capitalize(title),
    address,
    phone,
    repeatDays: repeat?.days,
    date,
    hasTime,
    category: guessCategory(original),
    reminderEnabled: true,
    minutesBefore,
  };
}

// ---------------------------------------------------------------
// Cumprimentos e cortesia ("Olá, gostaria de incluir...")
// ---------------------------------------------------------------

const GREETING_RE =
  /^(?:(?:olá|ola|oi|ei|ok|bom\s+dia|boa\s+tarde|boa\s+noite|por\s+favor|tudo\s+bem|minha\s+rotina|app|aplicativo)\s*[,!.]?\s+)+/;
const POLITE_RE =
  /^(?:eu\s+)?(?:gostaria\s+de|queria|quero|preciso|vou|você\s+pode|voce\s+pode|pode|poderia|dá\s+pra|da\s+pra|daria\s+pra|tem\s+como)\s+(?:me\s+)?(?=(?:incluir|adicionar|marcar|agendar|criar|colocar|anotar|registrar|lembrar|avisar|cadastrar|salvar)\b)/;

/** Tira "olá", "por favor", "gostaria de"... do começo, que não fazem parte do pedido. */
export function stripPoliteness(text: string): string {
  let out = text.trim();
  for (let i = 0; i < 3; i++) {
    const before = out;
    out = out.replace(GREETING_RE, "").replace(POLITE_RE, "").replace(/\s+por\s+favor$/, "").trim();
    if (out === before) break;
  }
  return out;
}

/** "710 norte bloco j sala 13" -> "710 Norte Bloco J Sala 13" */
export function formatAddress(address: string): string {
  const small = new Set(["de", "da", "do", "das", "dos", "e", "em", "na", "no"]);
  return address
    .split(/\s+/)
    .map((w, i) => {
      if (!w) return w;
      if (i > 0 && small.has(w)) return w;
      if (/^[a-zà-ú]$/.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

// ---------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------

const UNIT =
  "(?:kg|quilos?|g|gramas?|l|litros?|ml|unidades?|un|pacotes?|caixas?|latas?|d[úu]zias?|garrafas?|potes?|sacos?|fardos?|bandejas?|ma[çc]os?|rolos?|vidros?|cartelas?)";

/** "2 kg de arroz" -> { name: "Arroz", quantity: "2 kg" } · "3 leites" -> { name: "Leites", quantity: "3" } */
export function splitQuantity(text: string): { name: string; quantity?: string } {
  const t = text.trim();
  const m = t.match(new RegExp(`^(\\d+(?:[.,]\\d+)?|meio|meia|uma?|duas?|dois|tr[êe]s)\\s*(${UNIT})?\\s+(?:de\\s+)?(.+)$`, "i"));
  if (!m || (!m[2] && !/^\d/.test(m[1]))) return { name: capitalize(t) };
  const n = wordToNumber(m[1].toLowerCase()) ?? (/^mei[oa]$/i.test(m[1]) ? "0,5" : m[1]);
  // A quantidade é só o número; a unidade falada (kg, pacote...) vai junto do nome: "Arroz (kg)".
  const unit = m[2]?.toLowerCase();
  return { name: capitalize(m[3]) + (unit ? ` (${unit})` : ""), quantity: String(n).replace(".", ",") };
}

/** Trata a frase inteira como itens de compra (usado quando o microfone é aberto na aba Compras). */
export function parseShoppingItems(input: string): string[] {
  const text = normalizeNumbers(input.trim().toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " "));
  const cmd = parseShopping(text);
  return cmd.kind === "shopping" ? cmd.items : [];
}

// ---------------------------------------------------------------
// Lembretes, exercícios, remédios e filmes
// ---------------------------------------------------------------

const deaccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const COMMAND_WORDS_RE =
  /^(?:(?:por\s+favor|ok|oi|ei|eu)\s+)*(?:incluir|inclui|inclua|adicionar|adiciona|adicione|criar|cria|crie|colocar|coloca|coloque|registrar|registra|registre|anotar|anota|anote|cadastrar|cadastra|cadastre|salvar|salva|salve|marcar|marca|marque|novo|nova|um|uma)\b\s*/;

const REMINDER_RE = /\blembretes?\b/;
const LONG_REPEAT: { re: RegExp; repeat: Repeat }[] = [
  { re: /\b(?:todos\s+os\s+dias|todo\s+dia|diariamente)\b/, repeat: "dia" },
  { re: /\b(?:toda\s+semana|todas\s+as\s+semanas|semanalmente|uma\s+vez\s+por\s+semana)\b/, repeat: "semana" },
  { re: /\b(?:a\s+cada\s+(?:6|seis)\s+meses|de\s+(?:6|seis)\s+em\s+(?:6|seis)\s+meses|semestral(?:mente)?|duas\s+vezes\s+por\s+ano)\b/, repeat: "semestre" },
  { re: /\b(?:todo\s+m[êe]s|todos\s+os\s+meses|mensalmente|uma\s+vez\s+por\s+m[êe]s)\b/, repeat: "mes" },
  { re: /\b(?:todo\s+ano|todos\s+os\s+anos|anualmente|uma\s+vez\s+por\s+ano)\b/, repeat: "ano" },
];

/** Lembrete pronto que combina com a frase ("pagar o cartão" -> "Pagar cartão de crédito"). */
const PRESET_KEYS: [RegExp, string][] = [
  [/buscar\s+(?:as\s+crian[çc]as\s+|os\s+filhos\s+|o\s+\w+\s+|a\s+\w+\s+)?na\s+escola|buscar\s+na\s+escola/, "Buscar na escola"],
  [/ginecologista/, "Agendar ginecologista"],
  [/oftalmologista|oculista/, "Agendar oftalmologista"],
  [/\bvacina\b(?!.*\b(?:pet|cachorro|gato)\b)/, "Tomar vacina"],
  [/cart[ãa]o(?:\s+de\s+cr[ée]dito)?/, "Pagar cartão de crédito"],
  [/investimento|investir/, "Fazer investimento"],
  [/dentista/, "Agendar dentista"],
  [/mamografia/, "Agendar mamografia"],
  [/exames?\s+de\s+rotina|check-?up/, "Fazer exames de rotina"],
  [/aluguel|condom[íi]nio/, "Pagar aluguel ou condomínio"],
  [/ipva|iptu/, "Pagar IPVA / IPTU"],
  [/revis[ãa]o\s+do\s+carro/, "Revisão do carro"],
  [/(?:vacina|verm[íi]fugo).*(?:pet|cachorro|gato)|verm[íi]fugo/, "Vacina ou vermífugo do pet"],
  [/renovar\s+(?:a\s+)?receita/, "Renovar receita"],
  [/filtro\s+(?:de\s+)?[áa]gua/, "Trocar filtro de água"],
  [/roupa\s+de\s+cama/, "Trocar roupa de cama"],
  [/pagar\s+(?:a\s+)?conta/, "Pagar conta"],
];
function matchPreset(text: string) {
  const hit = PRESET_KEYS.find(([re]) => re.test(text));
  return hit ? PRESETS.find((p) => p.title === hit[1]) : undefined;
}

function parseReminder(original: string, now: Date): VoiceCommand {
  let text = original;
  const adv = findAdvance(text); // lembrete não tem "X minutos antes": tira da frase
  if (adv) text = removeAll(text, adv.remove);
  let repeat: Repeat = "nao";
  for (const r of LONG_REPEAT) {
    const m = text.match(r.re);
    if (m) {
      repeat = r.repeat;
      text = text.replace(m[0], " ");
      break;
    }
  }
  const dateFound = findDate(text, now, false);
  if (dateFound) text = removeAll(text, dateFound.remove);
  const timeFound = dateFound?.exactTime ? undefined : findTime(text);
  if (timeFound) text = removeAll(text, timeFound.remove);
  const preset = matchPreset(original);
  let title = cleanup(
    text
      .replace(COMMAND_WORDS_RE, "")
      .replace(/^(?:um\s+|uma\s+|novo\s+)?lembretes?\s*(?:de|para|pra|:)?\s*/, "")
      .replace(/^(?:me\s+)?(?:lembr[ae]r?|avis[ae]r?)\s+(?:me\s+)?(?:de|que|para|pra)?\s*/, "")
      .replace(/\s+(?:para|pra|no|na|de|às|as|à|e|dia)$/, ""),
  );
  if (!title && preset) title = preset.title;
  const time = dateFound?.exactTime
    ? `${String(dateFound.date.getHours()).padStart(2, "0")}:${String(dateFound.date.getMinutes()).padStart(2, "0")}`
    : timeFound
      ? `${String(timeFound.hours).padStart(2, "0")}:${String(timeFound.minutes).padStart(2, "0")}`
      : undefined;
  return {
    kind: "reminder",
    title: capitalize(title || "Lembrete"),
    emoji: preset?.emoji,
    date: dateFound ? dateFound.date : startOfDay(now),
    time,
    repeat: repeat === "nao" && preset && !dateFound ? preset.repeat : repeat,
  };
}

const WORKOUT_VERBS: [RegExp, string][] = [
  [/\bcaminhei\b|\bcaminhada\b|\bandei\b/, "Caminhada"],
  [/\bcorri\b|\bcorrida\b/, "Corrida"],
  [/\bpedalei\b|\bbike\b|\bbicicleta\b/, "Bicicleta"],
  [/\bnadei\b|\bnata[çc][ãa]o\b/, "Natação"],
  [/\bmalhei\b|\bacademia\b|\bmuscula[çc][ãa]o\b/, "Musculação"],
  [/\bdancei\b|\bdan[çc]a\b|\bzumba\b/, "Dança"],
  [/\balonguei\b/, "Alongamento"],
];
const WORKOUT_RE = /\b(?:fiz|pratiquei|treinei|treino|caminhei|corri|pedalei|nadei|malhei|dancei|joguei|alonguei|exerc[íi]cios?|atividade\s+f[íi]sica)\b/;

function findSport(text: string): string | undefined {
  const plain = deaccent(text);
  const sport = SPORTS.find((sp) => new RegExp(`\\b${deaccent(sp.name.toLowerCase())}\\b`).test(plain));
  if (sport) return sport.name;
  return WORKOUT_VERBS.find(([re]) => re.test(text))?.[1];
}

function parseWorkout(text: string, now: Date): VoiceCommand {
  let minutes: number | undefined;
  let m: RegExpMatchArray | null;
  if ((m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:horas?|h)(?:\s+e\s+(\d+)(?:\s*(?:min|minutos?))?)?/))) {
    minutes = Math.round(Number(m[1].replace(",", ".")) * 60) + (m[2] ? Number(m[2]) : 0);
    if (/\bhoras?\s+e\s+meia\b/.test(text)) minutes += 30;
  } else if ((m = text.match(/(\d+)\s*(?:min|minutos?)\b/))) minutes = Number(m[1]);
  else if (/\b(?:uma\s+)?hora\s+e\s+meia\b/.test(text)) minutes = 90;
  else if (/\bmeia\s+hora\b/.test(text)) minutes = 30;
  else if (/\b(?:uma|1)\s+hora\b/.test(text)) minutes = 60;

  let distanceKm: number | undefined;
  if ((m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:km|quil[ôo]metros?)\b/))) distanceKm = Number(m[1].replace(",", "."));
  else if ((m = text.match(/(\d+)\s*(?:m|metros)\b/))) distanceKm = Number(m[1]) / 1000;

  const found = /\banteontem\b/.test(text)
    ? { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2) }
    : /\bontem\b/.test(text)
      ? { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1) }
      : findDate(text, now, true);
  return {
    kind: "workout",
    activity: findSport(text) ?? "Caminhada",
    date: found ? startOfDay(found.date) : startOfDay(now),
    minutes,
    distanceKm,
  };
}

const MEDICATION_WORD_RE = /\b(?:rem[ée]dios?|medicamentos?|medica[çc][ãa]o|xarope|antibi[óo]tico)\b/;
const MEDICATION_SCHEDULE_RE = /\b(?:de\s+\d+\s+em\s+\d+\s+horas|a\s+cada\s+\d+\s+horas)\b|\d+(?:[.,]\d+)?\s*(?:ml|mg|gotas?|comprimidos?|c[áa]psulas?)\b/;
/** Cadastro de remédio: "remédio X de 8 em 8 horas", "cadastrar remédio X". "Me avisa de tomar o remédio às 15h" continua sendo alarme. */
function isMedication(text: string): boolean {
  if (/\b(?:me\s+avis[ae]|me\s+lembr[ae]|alarme|lembrete)\b/.test(text)) return false;
  if (MEDICATION_SCHEDULE_RE.test(text) && (MEDICATION_WORD_RE.test(text) || /\btomar\b/.test(text))) return true;
  return new RegExp(`^(?:${COMMAND_WORDS_RE.source.slice(1)})?(?:o\\s+|um\\s+)?(?:novo\\s+)?(?:rem[ée]dio|medicamento)\\s+\\S`).test(text);
}

function parseMedication(text: string, now: Date): VoiceCommand {
  let rest = text;
  let m: RegExpMatchArray | null;
  let everyHours: number | undefined;
  if ((m = rest.match(/\b(?:de\s+(\d+)\s+em\s+\d+\s+horas|a\s+cada\s+(\d+)\s+horas)\b/))) {
    everyHours = Number(m[1] ?? m[2]);
    rest = rest.replace(m[0], " ");
  }
  let days: number | undefined;
  if ((m = rest.match(/\b(?:por|durante)\s+(\d+)\s+dias\b/))) {
    days = Number(m[1]);
    rest = rest.replace(m[0], " ");
  }
  let dose: string | undefined;
  if ((m = rest.match(/(\d+(?:[.,]\d+)?)\s*(ml|mg|g|gotas?|comprimidos?|c[áa]psulas?|sach[êe]s?|colher(?:es)?)\b/))) {
    dose = `${m[1]} ${m[2]}`;
    rest = rest.replace(m[0], " ");
  }
  let forName: string | undefined;
  if ((m = rest.match(/\b(?:para|pra|do|da)\s+(?:o\s+|a\s+)?([a-zà-ú]+)(?=\s|$)/))) {
    if (!/^(?:dor|febre|tosse|gripe|pressão|pressao|alergia|dormir|cabeça|cabeca)$/.test(m[1])) {
      forName = capitalize(m[1]);
      rest = rest.replace(m[0], " ");
    }
  }
  const time = findTime(rest);
  if (time) rest = removeAll(rest, time.remove);
  void now;
  const name = cleanup(
    rest
      .replace(COMMAND_WORDS_RE, "")
      .replace(/\b(?:rem[ée]dios?|medicamentos?|medica[çc][ãa]o|hor[áa]rio\s+d[eo]|tomar|dar|tomo|toma|começando|comecando|a\s+partir|primeira\s+dose)\b/g, " ")
      .replace(/^\s*(?:o|a|de|do|da)\s+/, ""),
  ).split(" ").slice(0, 3).join(" ");
  return {
    kind: "medication",
    name: capitalize(name),
    dose,
    everyHours,
    firstTime: time ? `${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}` : undefined,
    days,
    forName,
  };
}

const MOVIE_RE = /\b(?:filmes?|s[ée]ries?|document[áa]rio|novela)\b/;
const SERVICES_RE = /\b(?:na|no|pela|pelo)\s+(netflix|prime(?:\s+video)?|amazon|disney(?:\s*\+|\s+plus)?|max|hbo(?:\s+max)?|globoplay|apple\s+tv|youtube|cinema|tv)\b/;

function parseMovie(text: string, raw: string): VoiceCommand {
  let rest = text;
  let m: RegExpMatchArray | null;
  let where: string | undefined;
  if ((m = rest.match(SERVICES_RE))) {
    const w = m[1];
    where = /netflix/.test(w) ? "Netflix" : /prime|amazon/.test(w) ? "Prime Video" : /disney/.test(w) ? "Disney+" : /max|hbo/.test(w) ? "Max"
      : /globo/.test(w) ? "Globoplay" : /apple/.test(w) ? "Apple TV+" : /youtube/.test(w) ? "YouTube" : /cinema/.test(w) ? "Cinema" : "TV aberta";
    rest = rest.replace(m[0], " ");
  }
  let rating: number | undefined;
  if ((m = rest.match(/[,\s]*(?:e\s+)?(?:dei\s+)?(?:nota\s+(\d)|(\d)\s+estrelas?)\b/))) {
    rating = Math.min(5, Math.max(1, Number(m[1] ?? m[2])));
    rest = rest.replace(m[0], " ");
  }
  const status = /\b(?:assisti|já\s+vi|ja\s+vi|vi\s+o|vi\s+a|terminei)\b/.test(rest) ? "assisti" : /\b(?:assistindo|vendo|comecei)\b/.test(rest) ? "assistindo" : "quero";
  const movieKind = /\bs[ée]ries?\b|\bnovela\b/.test(rest) ? "serie" : "filme";
  // O título é o que vem depois de "filme"/"série"; sem essa palavra, o que sobra depois dos verbos.
  const after = rest.match(/\b(?:filmes?|s[ée]ries?|document[áa]rio|novela)\s+(?:chamad[oa]\s+)?(.+)$/);
  let title = cleanup(
    after
      ? after[1]
      : rest
          .replace(COMMAND_WORDS_RE, "")
          .replace(/^(?:(?:eu\s+)?(?:quero|queria|preciso|vou|estou|tô)\s+)?(?:ver|assistir|assisti|vendo|assistindo|comecei\s+a\s+ver|terminei\s+de\s+ver|já\s+vi|vi)\s+(?:o|a|os|as)?\s*/, ""),
  );
  title = cleanup(title.replace(/\s+(?:na|no|para|pra|e|de)$/, ""));
  // Recupera maiúsculas como foram ditas/digitadas ("The Bear", "Ainda Estou Aqui").
  const idx = raw.toLowerCase().indexOf(title);
  if (title && idx >= 0) title = raw.slice(idx, idx + title.length);
  return { kind: "movie", title: capitalize(title), movieKind, status, rating: status === "assisti" ? rating : undefined, where };
}

export function parseVoiceCommand(input: string, now: Date = new Date()): VoiceCommand {
  const raw = input.trim();
  if (!raw) return { kind: "unknown", text: "" };

  const text = stripPoliteness(
    normalizeNumbers(raw.toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ")),
  );

  if (REMINDER_RE.test(text)) return parseReminder(text, now);
  if (PERIOD_RE.test(text)) return parsePeriod(text, now);
  if (MOVIE_RE.test(text) && !/\b(?:cinema\s+com|ir\s+ao\s+cinema)\b/.test(text)) return parseMovie(text, raw);
  if (isMedication(text)) return parseMedication(text, now);
  if (WORKOUT_RE.test(text) && findSport(text)) return parseWorkout(text, now);
  if (/\banivers[áa]rio\b/.test(text) && !/\b(festa|comprar)\b/.test(text)) {
    return parseBirthday(text, now);
  }
  if (SHOPPING_RE.test(text)) return parseShopping(text);

  // "pagar o cartão todo mês dia 10", "agendar ginecologista": vira lembrete
  if (LONG_REPEAT.slice(2).some((r) => r.re.test(text)) || (matchPreset(text) && !findTime(text))) return parseReminder(text, now);

  const hasDateOrTime = Boolean(findDate(text, now, false) || findTime(text));
  if (ACTIVITY_HINT_RE.test(text) || ACTIVITY_COMMAND_RE.test(text) || hasDateOrTime) {
    return parseActivity(text, now);
  }

  return { kind: "unknown", text: capitalize(raw) };
}

/** Frases de exemplo mostradas na tela, para a pessoa saber o que dizer. */
export const VOICE_EXAMPLES = [
  "Incluir consulta no dentista sexta às 15h e me avisar 30 minutos antes",
  "Coloca leite, arroz e sabão em pó na lista de compras",
  "Fiquei menstruada hoje",
  "Aniversário da Ana dia 12 de março",
  "Me lembra de buscar as crianças às 17h",
  "Alarme daqui a 10 minutos",
  "Lembrete de pagar o cartão todo mês dia 10",
  "Fiz 40 minutos de caminhada, 3 km",
  "Remédio amoxicilina 5 ml de 8 em 8 horas por 7 dias para o João",
  "Quero ver o filme Ainda Estou Aqui na Globoplay",
];
