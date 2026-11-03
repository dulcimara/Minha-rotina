import { addDays, differenceInCalendarDays } from "date-fns";
import type { Cycle } from "@/lib/data";

export interface CycleSummary {
  /** menstruação em andamento (registrou início e ainda não o fim) */
  active?: Cycle;
  /** dia da menstruação atual (1 = primeiro dia) */
  dayOfPeriod?: number;
  /** dia do ciclo desde o último início */
  dayOfCycle?: number;
  /** duração média do ciclo, em dias */
  averageCycle: number;
  /** duração média da menstruação, em dias */
  averagePeriod?: number;
  nextStart?: Date;
  daysUntilNext?: number;
  hasHistory: boolean;
}

const DEFAULT_CYCLE = 28;

/** Calcula a situação atual e a previsão do próximo ciclo (estimativa simples pela média). */
export function summarizeCycles(cycles: Cycle[], today = new Date()): CycleSummary {
  const sorted = [...cycles].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  const last = sorted[0];
  if (!last) return { averageCycle: DEFAULT_CYCLE, hasHistory: false };

  // Intervalos entre os últimos inícios (ignora valores fora do comum).
  const gaps: number[] = [];
  for (let i = 0; i < Math.min(sorted.length - 1, 6); i++) {
    const gap = differenceInCalendarDays(sorted[i].startDate, sorted[i + 1].startDate);
    if (gap >= 15 && gap <= 60) gaps.push(gap);
  }
  const averageCycle = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : DEFAULT_CYCLE;

  const lengths = sorted
    .filter((c) => c.endDate)
    .slice(0, 6)
    .map((c) => differenceInCalendarDays(c.endDate!, c.startDate) + 1)
    .filter((n) => n > 0 && n <= 15);
  const averagePeriod = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : undefined;

  const dayOfCycle = differenceInCalendarDays(today, last.startDate) + 1;
  const active = last.endDate ? undefined : last;
  // Se esqueceu de registrar o fim depois de muitos dias, não considera mais "em andamento".
  const stillActive = active && dayOfCycle <= 15 ? active : undefined;

  let nextStart = addDays(last.startDate, averageCycle);
  while (differenceInCalendarDays(nextStart, today) < 0) nextStart = addDays(nextStart, averageCycle);

  return {
    active: stillActive,
    dayOfPeriod: stillActive ? dayOfCycle : undefined,
    dayOfCycle,
    averageCycle,
    averagePeriod,
    nextStart,
    daysUntilNext: differenceInCalendarDays(nextStart, today),
    hasHistory: true,
  };
}
