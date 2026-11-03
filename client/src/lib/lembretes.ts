import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, format } from "date-fns";

export type Repeat = "nao" | "dia" | "semana" | "mes" | "semestre" | "ano";

export const REPEATS: { value: Repeat; label: string }[] = [
  { value: "nao", label: "Não repete" },
  { value: "dia", label: "Todo dia" },
  { value: "semana", label: "Toda semana" },
  { value: "mes", label: "Todo mês" },
  { value: "semestre", label: "A cada 6 meses" },
  { value: "ano", label: "Todo ano" },
];

export interface Preset {
  emoji: string;
  title: string;
  repeat: Repeat;
}

/** Lembretes prontos para escolher (dá para editar ou escrever outro). */
export const PRESETS: Preset[] = [
  { emoji: "🏫", title: "Buscar na escola", repeat: "dia" },
  { emoji: "🩺", title: "Agendar ginecologista", repeat: "ano" },
  { emoji: "👓", title: "Agendar oftalmologista", repeat: "ano" },
  { emoji: "💉", title: "Tomar vacina", repeat: "nao" },
  { emoji: "🧾", title: "Pagar conta", repeat: "mes" },
  { emoji: "💳", title: "Pagar cartão de crédito", repeat: "mes" },
  { emoji: "📈", title: "Fazer investimento", repeat: "mes" },
  { emoji: "🛒", title: "Fazer compras", repeat: "semana" },
  { emoji: "🦷", title: "Agendar dentista", repeat: "semestre" },
  { emoji: "🧪", title: "Fazer exames de rotina", repeat: "ano" },
  { emoji: "🎀", title: "Agendar mamografia", repeat: "ano" },
  { emoji: "🏠", title: "Pagar aluguel ou condomínio", repeat: "mes" },
  { emoji: "📄", title: "Pagar IPVA / IPTU", repeat: "ano" },
  { emoji: "🚗", title: "Revisão do carro", repeat: "semestre" },
  { emoji: "🐾", title: "Vacina ou vermífugo do pet", repeat: "ano" },
  { emoji: "💊", title: "Renovar receita", repeat: "nao" },
  { emoji: "🪪", title: "Renovar documento", repeat: "nao" },
  { emoji: "💧", title: "Trocar filtro de água", repeat: "semestre" },
  { emoji: "🛏️", title: "Trocar roupa de cama", repeat: "semana" },
  { emoji: "📞", title: "Ligar para a família", repeat: "semana" },
];

/** Próxima data de um lembrete que repete (a partir da data atual dele). */
export function nextDue(dateKey: string, repeat: Repeat, today = new Date()): string | undefined {
  if (repeat === "nao") return undefined;
  const step = (d: Date) =>
    repeat === "dia" ? addDays(d, 1) : repeat === "semana" ? addWeeks(d, 1) : repeat === "mes" ? addMonths(d, 1) : repeat === "semestre" ? addMonths(d, 6) : addYears(d, 1);
  let d = step(new Date(dateKey + "T12:00"));
  // se estava muito atrasado, pula para a próxima data a partir de hoje
  while (differenceInCalendarDays(d, today) < 0) d = step(d);
  return format(d, "yyyy-MM-dd");
}

export type DueState = "atrasado" | "hoje" | "amanha" | "semana" | "depois" | "sem-data";

export function dueState(dateKey: string | undefined, today = new Date()): DueState {
  if (!dateKey) return "sem-data";
  const diff = differenceInCalendarDays(new Date(dateKey + "T12:00"), today);
  if (diff < 0) return "atrasado";
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanha";
  if (diff <= 7) return "semana";
  return "depois";
}
