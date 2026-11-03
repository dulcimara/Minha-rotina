import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Cycle, CycleDay } from "@/lib/data";
import { MOODS } from "@/components/CycleDayDialog";

/**
 * Evolução do ciclo: duração de cada ciclo (barras) com a média (linha
 * tracejada), mais os sintomas e humores mais registrados nos últimos 3 meses.
 */
export function CycleEvolution({ cycles, days }: { cycles: Cycle[]; days: CycleDay[] }) {
  const sorted = [...cycles].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const lengths = sorted
    .slice(0, -1)
    .map((c, i) => ({ start: c.startDate, days: differenceInCalendarDays(sorted[i + 1].startDate, c.startDate) }))
    .filter((c) => c.days >= 10 && c.days <= 70)
    .slice(-8);

  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  const recent = days.filter((d) => new Date(d.day + "T12:00") >= since);
  const symptomCount = new Map<string, number>();
  for (const d of recent) for (const s of d.symptoms) symptomCount.set(s, (symptomCount.get(s) ?? 0) + 1);
  const topSymptoms = Array.from(symptomCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const moodCount = new Map<string, number>();
  for (const d of recent) if (d.mood) moodCount.set(d.mood, (moodCount.get(d.mood) ?? 0) + 1);
  const topMoods = Array.from(moodCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (lengths.length < 1 && topSymptoms.length === 0 && topMoods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Registre pelo menos dois ciclos (ou alguns dias no diário) para ver a evolução aqui.
      </p>
    );
  }

  // Gráfico de barras desenhado à mão (SVG): uma barra por ciclo, rótulo do valor em cima.
  const W = 320;
  const H = 150;
  const pad = { l: 8, r: 8, t: 22, b: 26 };
  const max = Math.max(35, ...lengths.map((l) => l.days));
  const avg = lengths.length ? Math.round(lengths.reduce((s, l) => s + l.days, 0) / lengths.length) : 0;
  const slot = (W - pad.l - pad.r) / Math.max(lengths.length, 1);
  const bw = Math.min(28, slot - 8);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);

  return (
    <div className="space-y-4">
      {lengths.length > 0 && (
        <figure className="space-y-1">
          <figcaption className="text-sm">
            Duração dos ciclos — média de <strong>{avg} dias</strong>
            {lengths.length > 1 && (
              <span className="text-muted-foreground">
                {" "}
                (de {Math.min(...lengths.map((l) => l.days))} a {Math.max(...lengths.map((l) => l.days))})
              </span>
            )}
          </figcaption>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Duração dos últimos ${lengths.length} ciclos, média de ${avg} dias`}>
            <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="hsl(var(--border))" strokeWidth="1" />
            {lengths.map((l, i) => {
              const cx = pad.l + slot * i + slot / 2;
              const top = y(l.days);
              return (
                <g key={i}>
                  <title>{`Ciclo que começou em ${format(l.start, "d 'de' MMMM", { locale: ptBR })}: ${l.days} dias`}</title>
                  <path
                    d={`M${cx - bw / 2},${H - pad.b} V${top + 4} a4,4 0 0 1 4,-4 h${bw - 8} a4,4 0 0 1 4,4 V${H - pad.b} Z`}
                    fill="hsl(var(--accent))"
                  />
                  <text x={cx} y={top - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">
                    {l.days}
                  </text>
                  <text x={cx} y={H - pad.b + 15} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
                    {format(l.start, "MMM", { locale: ptBR }).replace(".", "")}
                  </text>
                </g>
              );
            })}
            {lengths.length > 1 && (
              <g>
                <line x1={pad.l} x2={W - pad.r} y1={y(avg)} y2={y(avg)} stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 3" />
              </g>
            )}
          </svg>
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] bg-accent" /> dias de cada ciclo (mês em que começou)
            </span>
            {lengths.length > 1 && (
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-t-[1.5px] border-dashed border-primary" /> média
              </span>
            )}
          </p>
        </figure>
      )}

      {(topSymptoms.length > 0 || topMoods.length > 0) && (
        <div className="space-y-2">
          <p className="text-sm">Últimos 3 meses no diário</p>
          {topSymptoms.length > 0 && (
            <div className="space-y-1.5">
              {topSymptoms.map(([s, n]) => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 truncate">{s}</span>
                  <span className="h-2.5 rounded-full bg-accent" style={{ width: `${(n / topSymptoms[0][1]) * 50}%` }} />
                  <span className="text-xs text-muted-foreground">{n} {n === 1 ? "dia" : "dias"}</span>
                </div>
              ))}
            </div>
          )}
          {topMoods.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Humor mais registrado:{" "}
              {topMoods
                .map(([m, n]) => {
                  const mo = MOODS.find((x) => x.value === m);
                  return `${mo?.emoji ?? ""} ${mo?.label ?? m} (${n})`;
                })
                .join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
