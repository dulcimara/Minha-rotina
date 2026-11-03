import { useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Syringe } from "lucide-react";
import { VACCINE_SOURCE, vaccineStatus } from "@/lib/vacinas";
import { cn } from "@/lib/utils";

/** Próximas vacinas da criança pelo Calendário Nacional (e as que já deveriam ter sido tomadas). */
export function VaccineCard({ name, birthDate }: { name: string; birthDate?: string }) {
  const [showPast, setShowPast] = useState(false);
  const { next, past } = vaccineStatus(birthDate);
  if (!birthDate) {
    return <p className="text-xs text-muted-foreground">Informe a data de nascimento para ver as vacinas de {name}.</p>;
  }
  if (!next.length && !past.length) return null;
  const today = new Date();

  return (
    <div className="rounded-lg bg-secondary/50 p-3 space-y-2" data-testid="vaccine-card">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        <Syringe className="h-3.5 w-3.5" /> Vacinas
      </p>
      {next.slice(0, 2).map((v, i) => {
        const days = differenceInCalendarDays(v.date, today);
        return (
          <div key={v.months} className={cn("text-sm", i > 0 && "border-t border-border/60 pt-2")}>
            <p className="font-medium">
              {v.label} · {format(v.date, "dd/MM/yyyy")}
              <span className="font-normal text-muted-foreground">
                {" "}
                ({days === 0 ? "hoje" : days === 1 ? "amanhã" : days < 60 ? `em ${days} dias` : format(v.date, "MMMM 'de' yyyy", { locale: ptBR })})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{v.vaccines.join(" · ")}</p>
          </div>
        );
      })}
      {next.length > 0 && <p className="text-[11px] text-muted-foreground">Você recebe um aviso uma semana antes de cada data.</p>}
      {past.length > 0 && (
        <button type="button" onClick={() => setShowPast((v) => !v)} className="text-xs font-medium text-primary">
          {showPast ? "Esconder" : `Conferir na caderneta as vacinas até hoje (${past.length} etapas)`}
        </button>
      )}
      {showPast && (
        <ul className="space-y-1">
          {past.map((v) => (
            <li key={v.months} className="text-xs">
              <span className="font-medium">{v.label}:</span> <span className="text-muted-foreground">{v.vaccines.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-muted-foreground">{VACCINE_SOURCE}</p>
    </div>
  );
}
