import { addDays, format, startOfDay } from "date-fns";
import type { Activity } from "@/lib/data";

/** Uma ocorrência de atividade num dia (para as recorrentes, uma por dia em que repete). */
export interface Occurrence extends Activity {
  /** id da atividade salva no banco */
  baseId: string;
  /** dia desta ocorrência, AAAA-MM-DD */
  day: string;
  recurring: boolean;
}

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LETTER = ["D", "S", "T", "Q", "Q", "S", "S"];

/** "Seg, Qua e Sex" · "Todos os dias" · "Seg a Sex" · "Fim de semana" */
export function repeatLabel(days: number[] | undefined): string {
  if (!days?.length) return "";
  const sorted = [...days].sort();
  const key = sorted.join(",");
  if (key === "0,1,2,3,4,5,6") return "Todos os dias";
  if (key === "1,2,3,4,5") return "Seg a Sex";
  if (key === "0,6") return "Fim de semana";
  const names = sorted.map((d) => WEEKDAY_SHORT[d]);
  return names.length === 1 ? `Toda ${names[0].toLowerCase()}` : names.slice(0, -1).join(", ") + " e " + names[names.length - 1];
}

/**
 * Lista as ocorrências entre dois dias (inclusive).
 * Atividade comum: aparece só no dia dela. Recorrente: aparece em cada dia da
 * semana escolhido, a partir do dia em que começa, sempre no mesmo horário.
 */
export function occurrencesBetween(activities: Activity[], from: Date, to: Date): Occurrence[] {
  const start = startOfDay(from);
  const end = startOfDay(to);
  const out: Occurrence[] = [];

  for (const a of activities) {
    if (!a.repeatDays?.length) {
      const d = startOfDay(a.date);
      if (d >= start && d <= end) {
        out.push({ ...a, baseId: a.id, day: format(a.date, "yyyy-MM-dd"), recurring: false });
      }
      continue;
    }
    const first = startOfDay(a.date) > start ? startOfDay(a.date) : start;
    for (let d = first; d <= end; d = addDays(d, 1)) {
      if (!a.repeatDays.includes(d.getDay())) continue;
      const date = new Date(d.getFullYear(), d.getMonth(), d.getDate(), a.date.getHours(), a.date.getMinutes());
      const day = format(date, "yyyy-MM-dd");
      const minutes = a.reminderMinutesBefore ?? 0;
      out.push({
        ...a,
        id: `${a.id}@${day}`,
        baseId: a.id,
        day,
        recurring: true,
        date,
        completed: a.completedDates?.includes(day) ?? false,
        reminderDateTime: a.reminderEnabled ? new Date(date.getTime() - minutes * 60_000) : undefined,
      });
    }
  }
  return out.sort((x, y) => x.date.getTime() - y.date.getTime());
}
