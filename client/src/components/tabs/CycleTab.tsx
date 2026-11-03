import { useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarHeart, CalendarPlus, Droplet, Pencil, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useCycles, useUserId } from "@/hooks/use-data";
import { endCycle, startCycle, type Cycle } from "@/lib/data";
import { summarizeCycles } from "@/lib/cycle";
import { CycleChart } from "@/components/CycleChart";
import { CycleDialog } from "@/components/CycleDialog";

export function CycleTab() {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: cycles = [], isLoading } = useCycles();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; key: number; cycle: Cycle | null }>({
    open: false,
    key: 0,
    cycle: null,
  });

  const summary = summarizeCycles(cycles);

  const openDialog = (cycle: Cycle | null) => setDialog((d) => ({ open: true, key: d.key + 1, cycle }));

  const quick = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await action();
      refresh(userId, "cycles");
      toast({ title: message });
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 text-center space-y-3 bg-hero border-0">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-mic text-white flex items-center justify-center shadow-md">
          <Droplet className="h-7 w-7" />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !summary.hasHistory ? (
          <>
            <h2 className="text-xl font-display font-semibold">Seu ciclo</h2>
            <p className="text-sm text-muted-foreground">
              Registre quando a menstruação começar. Com o tempo, o app aprende a média do seu ciclo e mostra a previsão.
            </p>
          </>
        ) : summary.active ? (
          <>
            <h2 className="text-2xl font-display font-semibold">{summary.dayOfPeriod}º dia da menstruação</h2>
            <p className="text-sm text-muted-foreground">
              Começou em {format(summary.active.startDate, "d 'de' MMMM", { locale: ptBR })}
              {summary.averagePeriod ? ` · costuma durar ${summary.averagePeriod} dias` : ""}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-display font-semibold">{summary.dayOfCycle}º dia do ciclo</h2>
            <p className="text-sm text-muted-foreground">
              Próxima prevista para <strong>{format(summary.nextStart!, "d 'de' MMMM", { locale: ptBR })}</strong>
              {summary.daysUntilNext === 0 ? " (hoje)" : ` (em ${summary.daysUntilNext} dias)`}
            </p>
            <p className="text-xs text-muted-foreground">Ciclo médio: {summary.averageCycle} dias</p>
          </>
        )}

        <div className="grid gap-2 pt-1">
          {summary.active ? (
            <Button onClick={() => quick(() => endCycle(summary.active!.id, new Date()), "Fim da menstruação registrado")} disabled={busy} data-testid="button-cycle-end">
              Terminou hoje
            </Button>
          ) : (
            <Button onClick={() => quick(() => startCycle(new Date()), "Início da menstruação registrado")} disabled={busy} data-testid="button-cycle-start">
              Menstruei hoje
            </Button>
          )}
          <Button variant="outline" className="gap-2 bg-white/60 dark:bg-transparent" onClick={() => openDialog(null)} data-testid="button-cycle-other-date">
            <CalendarPlus className="h-4 w-4" /> Registrar outra data
          </Button>
        </div>
      </Card>

      {cycles.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Últimos 6 meses
          </h3>
          <CycleChart cycles={cycles} nextStart={summary.nextStart} averagePeriod={summary.averagePeriod} />
        </Card>
      )}

      {cycles.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <CalendarHeart className="h-5 w-5 text-primary" /> Histórico
          </h3>
          <p className="text-xs text-muted-foreground mb-2">Toque no lápis para corrigir as datas.</p>
          <div className="divide-y">
            {cycles.map((c) => {
              const length = c.endDate ? differenceInCalendarDays(c.endDate, c.startDate) + 1 : undefined;
              return (
                <div key={c.id} className="flex items-center gap-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {format(c.startDate, "d 'de' MMM", { locale: ptBR })}
                      {c.endDate ? ` → ${format(c.endDate, "d 'de' MMM", { locale: ptBR })}` : " → em andamento"}
                    </p>
                    {length && <p className="text-xs text-muted-foreground">{length} dias</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(c)} title="Corrigir">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Corrigir</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <p className="text-xs text-center text-muted-foreground px-4">
        A previsão é uma estimativa pela média dos seus ciclos e não substitui orientação médica.
      </p>

      <CycleDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        cycle={dialog.cycle}
      />
    </div>
  );
}
