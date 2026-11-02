import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SpokenActivity {
  title: string;
  date: Date;
  address?: string;
}

/** "dentro de 10 minutos", "às 15:00", "amanhã às 9:00"... */
function whenToSpeak(date: Date, now: Date): string {
  const minutesLeft = Math.round((date.getTime() - now.getTime()) / 60_000);
  if (minutesLeft <= 0) return "agora";
  if (minutesLeft < 60) return `dentro de ${minutesLeft} ${minutesLeft === 1 ? "minuto" : "minutos"}`;
  if (minutesLeft < 120) {
    const rest = minutesLeft - 60;
    return rest === 0 ? "dentro de 1 hora" : `dentro de 1 hora e ${rest} ${rest === 1 ? "minuto" : "minutos"}`;
  }
  const hour = format(date, "HH:mm");
  if (isSameDay(date, now)) return `hoje às ${hour}`;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (isSameDay(date, tomorrow)) return `amanhã às ${hour}`;
  return `${format(date, "EEEE", { locale: ptBR })} às ${hour}`;
}

/** Ex.: "Dulcimara, dentro de 10 minutos você tem consulta médica, no endereço Rua X, 123." */
export function alertSentence(a: SpokenActivity, now: Date, name?: string): string {
  const when = whenToSpeak(a.date, now);
  const what = a.title.charAt(0).toLowerCase() + a.title.slice(1);
  // "Pagar conta", "Buscar as crianças" (verbo) -> "você precisa ..."; "Consulta" -> "você tem ..."
  const firstWord = what.split(/\s+/)[0] ?? "";
  const verb = /^[a-zçãéíóú]{3,}(ar|er|ir)$/.test(firstWord) ? "precisa" : "tem";
  const core = when === "agora" ? `está na hora: ${what}` : `${when} você ${verb} ${what}`;
  const where = a.address ? `, no endereço ${a.address}` : "";
  const sentence = `${core}${where}.`;
  return name ? `${name}, ${sentence}` : sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

