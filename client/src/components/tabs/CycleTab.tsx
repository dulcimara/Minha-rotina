import { useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, Trash2, CalendarHeart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useCycles, useUserId } from "@/hooks/use-data";
import { deleteCycle, endCycle, startCycle } from "@/lib/data";
import { summarizeCycles } from "@/lib/cycle";

const todayStr = () => format(new Date(), "yyyy-MM-dd");
const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function CycleTab() {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: cycles = [], isLoading } = useCycles();
  const [otherDate, setOtherDate] = useState(todayStr());
  const [showOtherDate, setShowOtherDate] = useState(false);
  const [busy, setBusy] = useState(false);

  const summary = summarizeCycles(cycles);

  const run = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await action();
      refresh(userId, "cycles");
      toast({ title: message });
      setShowOtherDate(false);
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const registerStart = (date: Date) => run(() => startCycle(date), "Início da menstruação registrado");
  const registerEnd = (date: Date) =>
    summary.active ? run(() => endCycle(summary.active!.id, date), "Fim da menstruação registrado") : undefined;

  return (
    <div className="space-y-5">
      <Card className="p-5 text-center space-y-3">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Droplet className="h-8 w-8 text-primary" />
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
              Próxima prevista para{" "}
              <strong>{format(summary.nextStart!, "d 'de' MMMM", { locale: ptBR })}</strong>
              {summary.daysUntilNext === 0 ? " (hoje)" : ` (em ${summary.daysUntilNext} dias)`}
            </p>
            <p className="text-xs text-muted-foreground">Ciclo médio: {summary.averageCycle} dias</p>
          </>
        )}

        <div className="grid gap-2 pt-1">
          {summary.active ? (
            <Button onClick={() => registerEnd(new Date())} disabled={busy} data-testid="button-cycle-end">
              Terminou hoje
            </Button>
          ) : (
            <Button onClick={() => registerStart(new Date())} disabled={busy} data-testid="button-cycle-start">
              Menstruei hoje
            </Button>
          )}
          {!showOtherDate ? (
            <Button variant="ghost" size="sm" onClick={() => setShowOtherDate(true)}>
              Registrar outra data
            </Button>
          ) : (
            <div className="flex items-end gap-2 text-left">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="cycle-date">{summary.active ? "Terminou em" : "Começou em"}</Label>
                <Input
                  id="cycle-date"
                  type="date"
                  max={todayStr()}
                  value={otherDate}
                  onChange={(e) => setOtherDate(e.target.value)}
                />
              </div>
              <Button
                disabled={busy || !otherDate}
                onClick={() => (summary.active ? registerEnd(parseDay(otherDate)) : registerStart(parseDay(otherDate)))}
              >
                Salvar
              </Button>
            </div>
          )}
        </div>
      </Card>

      {cycles.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <CalendarHeart className="h-5 w-5 text-primary" /> Histórico
          </h3>
          <div className="divide-y">
            {cycles.map((c) => {
              const length = c.endDate ? differenceInCalendarDays(c.endDate, c.startDate) + 1 : undefined;
              return (
                <div key={c.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {format(c.startDate, "d 'de' MMM", { locale: ptBR })}
                      {c.endDate ? ` → ${format(c.endDate, "d 'de' MMM", { locale: ptBR })}` : " → em andamento"}
                    </p>
                    {length && <p className="text-xs text-muted-foreground">{length} dias</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.confirm("Apagar este registro?") && run(() => deleteCycle(c.id), "Registro apagado")}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Apagar</span>
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
    </div>
  );
}
