import { useState, type FormEvent } from "react";
import { addDays, format, isAfter, isBefore, isToday, startOfDay, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { upperFirst } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { ActivityCard } from "@/components/ActivityCard";
import { EmptyState } from "@/components/EmptyState";
import { BellRing, CalendarX, Cake, Droplet, Keyboard, Mic, Pencil, ShoppingCart, Sparkles } from "lucide-react";
import { displayName, useAuth } from "@/hooks/use-auth";
import { useBirthdays, useCycles, useShopping } from "@/hooks/use-data";
import { alertsWereEnabled, enableAlerts, notificationsStatus } from "@/hooks/use-alerts";
import { nextBirthdayDate, type Activity } from "@/lib/data";
import { summarizeCycles } from "@/lib/cycle";
import { VOICE_EXAMPLES } from "@/lib/voice-parser";
import type { TabName } from "@/pages/Home";

interface TodayTabProps {
  activities: Activity[];
  loading: boolean;
  onAdd: () => void;
  onVoice: (mode: "voice" | "type") => void;
  onNavigate: (tab: TabName) => void;
  cardHandlers: {
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleComplete: (id: string, completed: boolean) => void;
  };
}

function AlertsBanner() {
  const [enabled, setEnabled] = useState(alertsWereEnabled() && notificationsStatus() !== "default");
  if (enabled) return null;
  const blocked = notificationsStatus() === "denied";
  return (
    <Card className="p-4 border-accent/40 bg-accent/10">
      <div className="flex items-start gap-3">
        <BellRing className="h-6 w-6 text-accent shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">Ative os alertas com som</p>
          <p className="text-xs text-muted-foreground">
            {blocked
              ? "As notificações estão bloqueadas neste navegador, mas o som funciona com o app aberto. Para liberar, vá nas configurações do site."
              : "Assim o app toca e avisa na hora dos seus compromissos (com o app aberto ou em segundo plano)."}
          </p>
          <Button
            size="sm"
            onClick={async () => {
              await enableAlerts();
              setEnabled(true);
            }}
            data-testid="button-enable-alerts"
          >
            Ativar alertas
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Nome e apelido (para os alertas falarem "Cida, dentro de 10 minutos..."). */
function NameCard({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as { name?: string; nickname?: string };
  const [name, setName] = useState(meta.name ?? "");
  const [nickname, setNickname] = useState(meta.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.auth.updateUser({ data: { name: name.trim(), nickname: nickname.trim() || null } });
    setSaving(false);
    onDone?.();
  };
  return (
    <Card className="p-4">
      <form onSubmit={save} className="space-y-3">
        <p className="text-sm font-medium">Como o app deve te chamar?</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome *" autoComplete="name" />
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Como quer ser chamada (opcional)"
          autoComplete="nickname"
        />
        <div className="flex justify-end gap-2">
          {onDone && (
            <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
          )}
          <Button type="submit" disabled={saving || !name.trim()}>Salvar</Button>
        </div>
      </form>
    </Card>
  );
}

export function TodayTab({ activities, loading, onAdd, onVoice, onNavigate, cardHandlers }: TodayTabProps) {
  const { user } = useAuth();
  const { data: shopping = [] } = useShopping();
  const { data: birthdays = [] } = useBirthdays();
  const { data: cycles = [] } = useCycles();

  const firstName = displayName(user);
  const [editingName, setEditingName] = useState(false);
  const today = startOfDay(new Date());
  const todayActivities = activities.filter((a) => isToday(a.date));
  const upcoming = activities
    .filter((a) => !isToday(a.date) && isAfter(a.date, today) && isBefore(a.date, addDays(today, 8)))
    .filter((a) => !a.completed)
    .slice(0, 5);

  const pendingShopping = shopping.filter((i) => !i.checked).length;
  const nextBirthday = [...birthdays].sort(
    (a, b) => nextBirthdayDate(a).getTime() - nextBirthdayDate(b).getTime(),
  )[0];
  const daysToBirthday = nextBirthday ? differenceInCalendarDays(nextBirthdayDate(nextBirthday), today) : undefined;
  const cycle = summarizeCycles(cycles);

  const greeting = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-5">
      <Card className="p-5 bg-hero border-0">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-accent" />
          <div>
            <h2 className="text-xl font-display font-semibold" data-testid="text-today-title">
              {greeting}{firstName ? `, ${firstName}` : ""}!
              {firstName && (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="ml-2 align-middle text-muted-foreground hover:text-primary"
                  title="Alterar como o app te chama"
                >
                  <Pencil className="inline h-3.5 w-3.5" />
                  <span className="sr-only">Alterar nome</span>
                </button>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {upperFirst(format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }))} ·{" "}
              {todayActivities.length} {todayActivities.length === 1 ? "compromisso" : "compromissos"} hoje
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={() => onNavigate("compras")}
            className="rounded-xl bg-white/70 dark:bg-white/5 p-3 text-left shadow-sm hover:bg-white transition-colors dark:hover:bg-white/10"
          >
            <ShoppingCart className="h-4 w-4 text-primary mb-1" />
            <p className="text-lg font-semibold leading-none">{pendingShopping}</p>
            <p className="text-[11px] text-muted-foreground">para comprar</p>
          </button>
          <button
            onClick={() => onNavigate("agenda")}
            className="rounded-xl bg-white/70 dark:bg-white/5 p-3 text-left shadow-sm hover:bg-white transition-colors dark:hover:bg-white/10"
          >
            <Cake className="h-4 w-4 text-primary mb-1" />
            <p className="text-sm font-semibold leading-tight truncate">{nextBirthday ? nextBirthday.name : "—"}</p>
            <p className="text-[11px] text-muted-foreground">
              {daysToBirthday === undefined ? "aniversários" : daysToBirthday === 0 ? "é hoje! 🎉" : `em ${daysToBirthday} dias`}
            </p>
          </button>
          <button
            onClick={() => onNavigate("ciclo")}
            className="rounded-xl bg-white/70 dark:bg-white/5 p-3 text-left shadow-sm hover:bg-white transition-colors dark:hover:bg-white/10"
          >
            <Droplet className="h-4 w-4 text-primary mb-1" />
            <p className="text-sm font-semibold leading-tight">
              {!cycle.hasHistory ? "—" : cycle.active ? `${cycle.dayOfPeriod}º dia` : `${cycle.daysUntilNext} dias`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {!cycle.hasHistory ? "ciclo" : cycle.active ? "menstruação" : "p/ próxima"}
            </p>
          </button>
        </div>
      </Card>

      {(!firstName || editingName) && <NameCard onDone={firstName ? () => setEditingName(false) : undefined} />}

      <AlertsBanner />

      <Card className="p-4 bg-secondary/60 border-secondary">
        <p className="text-sm font-medium mb-1">Fale comigo 🎙️</p>
        <p className="text-xs text-muted-foreground mb-3">
          Toque no microfone e diga, por exemplo: <em>“{VOICE_EXAMPLES[0]}”</em>
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onVoice("voice")} className="gap-2">
            <Mic className="h-4 w-4" /> Falar
          </Button>
          <Button size="sm" variant="outline" onClick={() => onVoice("type")} className="gap-2">
            <Keyboard className="h-4 w-4" /> Digitar
          </Button>
        </div>
      </Card>

      <section className="space-y-3">
        <h3 className="font-semibold">Hoje</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : todayActivities.length > 0 ? (
          todayActivities.map((a) => <ActivityCard key={a.id} {...a} {...cardHandlers} />)
        ) : (
          <EmptyState
            icon={CalendarX}
            title="Nada marcado para hoje"
            description="Aproveite o dia! Ou adicione um compromisso pelo microfone ou pelo botão abaixo."
            actionLabel="Adicionar compromisso"
            onAction={onAdd}
          />
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold">Próximos dias</h3>
          {upcoming.map((a) => (
            <ActivityCard key={a.id} {...a} showDate {...cardHandlers} />
          ))}
        </section>
      )}
    </div>
  );
}
