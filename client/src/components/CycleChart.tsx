import { addDays, differenceInCalendarDays, format, getDaysInMonth, isSameDay, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Cycle } from "@/lib/data";
import { cn } from "@/lib/utils";

interface CycleChartProps {
  cycles: Cycle[];
  /** previsão do próximo início (opcional) */
  nextStart?: Date;
  /** duração média da menstruação, para desenhar a previsão */
  averagePeriod?: number;
  /** duração média do ciclo, para estimar o período fértil */
  averageCycle?: number;
  /** mostrar o período fértil estimado */
  showFertile?: boolean;
  months?: number;
}

type DayState = "period" | "predicted" | "fertile" | "none";

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Gráfico dos últimos meses: uma linha por mês, um quadradinho por dia.
 * Rosa = dias de menstruação; contorno lilás = previsão.
 * Cada linha também traz o texto (dias e duração), para não depender só da cor.
 */
export function CycleChart({ cycles, nextStart, averagePeriod, averageCycle = 28, showFertile, months = 6 }: CycleChartProps) {
  const today = new Date();

  // Marca cada dia de menstruação registrado.
  const periodDays = new Map<string, Cycle>();
  for (const c of cycles) {
    const end = c.endDate ?? (differenceInCalendarDays(today, c.startDate) <= 15 ? today : addDays(c.startDate, 4));
    for (let d = c.startDate; d <= end; d = addDays(d, 1)) periodDays.set(dayKey(d), c);
  }
  // Marca os dias previstos.
  const predicted = new Set<string>();
  if (nextStart) {
    const len = averagePeriod ?? 5;
    for (let i = 0; i < len; i++) predicted.add(dayKey(addDays(nextStart, i)));
  }

  // Período fértil estimado: ovulação ~14 dias antes do início seguinte; fértil = 5 dias antes até 1 depois.
  const fertile = new Set<string>();
  if (showFertile) {
    const starts = [...cycles.map((c) => c.startDate), ...(nextStart ? [nextStart] : [])].sort((a, b) => a.getTime() - b.getTime());
    if (nextStart) starts.push(addDays(nextStart, averageCycle));
    for (const next of starts.slice(1)) {
      const ovulation = addDays(next, -14);
      for (let i = -5; i <= 1; i++) fertile.add(dayKey(addDays(ovulation, i)));
    }
  }

  // Meses mostrados: os últimos N e, se a previsão cair no mês seguinte, ele também.
  const monthStarts = Array.from({ length: months }, (_, i) => startOfMonth(subMonths(today, months - 1 - i)));
  if (nextStart && startOfMonth(nextStart) > startOfMonth(today)) monthStarts.push(startOfMonth(nextStart));

  const rowSummary = (m: Date): string => {
    const inMonth = cycles
      .filter((c) => c.startDate.getMonth() === m.getMonth() && c.startDate.getFullYear() === m.getFullYear())
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    if (inMonth.length) {
      return inMonth
        .map((c) => {
          const end = c.endDate;
          const len = end ? differenceInCalendarDays(end, c.startDate) + 1 : undefined;
          return end
            ? `${format(c.startDate, "d")}–${format(end, "d")} · ${len}d`
            : `desde ${format(c.startDate, "d")}`;
        })
        .join(", ");
    }
    if (nextStart && nextStart.getMonth() === m.getMonth() && nextStart.getFullYear() === m.getFullYear()) {
      return `previsto ${format(nextStart, "d")}`;
    }
    return "—";
  };

  return (
    <div className="space-y-2" role="img" aria-label="Dias de menstruação nos últimos meses">
      {monthStarts.map((m) => {
        const total = getDaysInMonth(m);
        return (
          <div key={dayKey(m)} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground capitalize">
              {format(m, "MMM", { locale: ptBR }).replace(".", "")}
            </span>
            <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: "repeat(31, minmax(0, 1fr))" }}>
              {Array.from({ length: 31 }, (_, i) => {
                if (i >= total) return <span key={i} />;
                const d = new Date(m.getFullYear(), m.getMonth(), i + 1);
                const k = dayKey(d);
                const state: DayState = periodDays.has(k)
                  ? "period"
                  : predicted.has(k) && d >= today
                    ? "predicted"
                    : fertile.has(k)
                      ? "fertile"
                      : "none";
                const isToday = isSameDay(d, today);
                const label =
                  `${format(d, "d 'de' MMMM", { locale: ptBR })}` +
                  (state === "period" ? " — menstruação" : state === "predicted" ? " — previsão" : state === "fertile" ? " — fértil (estimado)" : "");
                return (
                  <span
                    key={i}
                    title={label}
                    className={cn(
                      "h-4 rounded-[3px]",
                      state === "period" && "bg-accent",
                      state === "predicted" && "border-[1.5px] border-primary bg-primary/10",
                      state === "fertile" && "bg-[hsl(168_55%_70%)]",
                      state === "none" && (d > today ? "bg-muted/50" : "bg-muted"),
                      isToday && "ring-[1.5px] ring-foreground",
                    )}
                  />
                );
              })}
            </div>
            <span className="w-[4.5rem] shrink-0 text-right text-[11px] leading-tight text-muted-foreground">
              {rowSummary(m)}
            </span>
          </div>
        );
      })}

      {/* Eixo dos dias e legenda */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="w-8 shrink-0" />
        <div className="flex flex-1 justify-between">
          <span>1</span>
          <span>10</span>
          <span>20</span>
          <span>31</span>
        </div>
        <span className="w-[4.5rem] shrink-0" />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-accent" /> Menstruação
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border-[1.5px] border-primary bg-primary/10" /> Previsão
        </span>
        {showFertile && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-[hsl(168_55%_70%)]" /> Fértil (estimado)
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-muted ring-[1.5px] ring-foreground" /> Hoje
        </span>
      </div>
    </div>
  );
}
