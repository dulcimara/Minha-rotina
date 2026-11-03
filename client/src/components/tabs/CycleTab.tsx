import { AppIcon } from "@/components/AppIcons";
import { useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarHeart, CalendarPlus, Droplet, Pencil, BarChart3, NotebookPen, ShieldCheck, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useCycleDays, useCycles, useUserId } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { readSettings } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { CycleDayDialog, FLOWS, MOODS } from "@/components/CycleDayDialog";
import { CycleEvolution } from "@/components/CycleEvolution";
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
  const { user } = useAuth();
  const settings = readSettings(user);
  const { data: cycleDays = [] } = useCycleDays();
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayEntry = cycleDays.find((d) => d.day === todayKey);
  const [dayDialog, setDayDialog] = useState<{ open: boolean; key: number; day: string }>({ open: false, key: 0, day: todayKey });
  const openDay = (day: string) => setDayDialog((d) => ({ open: true, key: d.key + 1, day }));
  const consented = Boolean((user?.user_metadata as { cycle_consent_at?: string } | undefined)?.cycle_consent_at);

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

  // Dados do ciclo são dados sensíveis de saúde (LGPD): pede consentimento específico antes do primeiro uso.
  if (!consented) {
    return (
      <Card className="p-5 space-y-4 bg-hero border-0">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-mic text-white flex items-center justify-center shadow-md">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-display font-semibold">Seu ciclo, só seu</h2>
          <p className="text-sm text-muted-foreground">
            As informações do ciclo menstrual são <strong>dados sensíveis de saúde</strong>. Elas ficam guardadas na sua conta,
            só você vê, nunca são compartilhadas e você pode apagar quando quiser.
          </p>
        </div>
        <Button
          className="w-full"
          data-testid="button-cycle-consent"
          onClick={() => supabase.auth.updateUser({ data: { cycle_consent_at: new Date().toISOString() } })}
        >
          Concordo em registrar meus dados do ciclo
        </Button>
        <a href="/privacidade" target="_blank" rel="noreferrer" className="block text-center text-xs text-primary underline-offset-4 hover:underline">
          Ler a política de privacidade
        </a>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 text-center space-y-3 bg-hero border-0">
        <AppIcon name="ciclo" className="mx-auto h-14 w-14" />

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

      {/* Diário: como está hoje */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-primary" /> Como você está hoje?
            </h3>
            <p className="text-xs text-muted-foreground">
              {todayEntry
                ? [
                    todayEntry.flow && `Fluxo ${FLOWS.find((f) => f.value === todayEntry.flow)?.label.toLowerCase()}`,
                    ...todayEntry.symptoms,
                    todayEntry.mood && MOODS.find((m) => m.value === todayEntry.mood)?.label,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Registre fluxo, sintomas e humor."}
            </p>
          </div>
          <Button size="sm" variant={todayEntry ? "outline" : "default"} onClick={() => openDay(todayKey)} data-testid="button-cycle-today">
            {todayEntry ? "Editar" : "Registrar"}
          </Button>
        </div>
      </Card>

      {(cycles.length > 1 || cycleDays.length > 0) && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Evolução
          </h3>
          <CycleEvolution cycles={cycles} days={cycleDays} />
        </Card>
      )}

      {cycles.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Últimos 6 meses
          </h3>
          <CycleChart
            cycles={cycles}
            nextStart={summary.nextStart}
            averagePeriod={summary.averagePeriod}
            averageCycle={summary.averageCycle}
            showFertile={settings.showFertile}
          />
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

      <CycleDayDialog
        key={`day-${dayDialog.key}`}
        open={dayDialog.open}
        onOpenChange={(open) => setDayDialog((d) => ({ ...d, open }))}
        day={dayDialog.day}
        entry={cycleDays.find((d) => d.day === dayDialog.day)}
      />
      <CycleDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        cycle={dialog.cycle}
      />
    </div>
  );
}
