import { useEffect, useState, type FormEvent } from "react";
import { morningSummary } from "@/lib/morning";
import { speak } from "@/lib/speech";
import { readSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { addDays, format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { upperFirst } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { ActivityCard } from "@/components/ActivityCard";
import { EmptyState } from "@/components/EmptyState";
import { CalendarX, Cake, Droplet, ShoppingCart, Sparkles, Volume2 } from "lucide-react";
import { displayName, useAuth } from "@/hooks/use-auth";
import { useBirthdays, useCycles, useDoses, useMedications, useShopping, useWorkouts } from "@/hooks/use-data";
import { MedsDialog } from "@/components/MedsDialog";
import { AppIcon, type AppIconName } from "@/components/AppIcons";
import { WorkoutsDialog } from "@/components/WorkoutsDialog";
import { thisWeekCount } from "@/lib/workouts";
import { dosesOn } from "@/lib/meds";
import type { Activity } from "@/lib/data";
import { summarizeCycles } from "@/lib/cycle";
import { BirthdaysDialog } from "@/components/BirthdaysDialog";
import { InstallBanner } from "@/components/InstallApp";
import { occurrencesBetween } from "@/lib/recurrence";
import type { TabName } from "@/pages/Home";

interface TodayTabProps {
  activities: Activity[];
  loading: boolean;
  onAdd: () => void;
  onNavigate: (tab: TabName) => void;
  cardHandlers: {
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleComplete: (id: string, completed: boolean) => void;
  };
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

/** Abre o compartilhamento (WhatsApp...) com uma mensagem de parabéns pronta. */
async function sendCongrats(name: string) {
  const text = `Feliz aniversário, ${name}! 🎉🎂 Muita saúde, alegria e paz. Um beijo!`;
  try {
    if (navigator.share) await navigator.share({ text });
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  } catch {
    // cancelado
  }
}

/** Card de resumo da tela inicial, com o ícone da área. */
function Tile({ icon, value, label, onClick, testId }: { icon: AppIconName; value: string; label: string; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex items-center gap-2.5 rounded-2xl border border-card-border bg-card p-2.5 text-left shadow-[0_4px_18px_-8px_hsl(330_60%_60%/0.28)] hover:bg-secondary/60 transition-colors"
    >
      <AppIcon name={icon} className="h-10 w-10" />
      <span className="min-w-0">
        <span className="block text-base font-semibold leading-tight">{value}</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

export function TodayTab({ activities, loading, onAdd, onNavigate, cardHandlers }: TodayTabProps) {
  const { user } = useAuth();
  const { data: shopping = [] } = useShopping();
  const { data: birthdays = [] } = useBirthdays();
  const { data: workouts = [] } = useWorkouts();
  const weekWorkouts = thisWeekCount(workouts);
  const [workoutsOpen, setWorkoutsOpen] = useState(false);
  const { data: cycles = [] } = useCycles();

  const firstName = displayName(user);
  const [birthdaysOpen, setBirthdaysOpen] = useState(false);
  const [medsOpen, setMedsOpen] = useState(false);
  // Veio da notificação do resumo da manhã: destaca o botão "Ouvir meu dia".
  const [fromSummary, setFromSummary] = useState(() => new URLSearchParams(window.location.search).has("resumo"));
  useEffect(() => {
    if (fromSummary) window.history.replaceState(null, "", "/");
  }, [fromSummary]);
  const { data: meds = [] } = useMedications();
  const { data: dosesTaken = [] } = useDoses();
  const doseSlots = dosesOn(meds, dosesTaken);
  const takenCount = doseSlots.filter((d) => d.taken).length;
  const nowTime = new Date();
  const nextDose = doseSlots.find((d) => !d.taken && d.at >= nowTime);
  const lateDoses = doseSlots.filter((d) => !d.taken && d.at < nowTime).length;
  const today = startOfDay(new Date());
  const todayActivities = occurrencesBetween(activities, today, today);
  // Próximos 7 dias; das recorrentes mostra só a próxima vez, para não repetir a lista.
  const seen = new Set<string>();
  const upcoming = occurrencesBetween(activities, addDays(today, 1), addDays(today, 7))
    .filter((o) => !o.completed)
    .filter((o) => (o.recurring ? !seen.has(o.baseId) && !!seen.add(o.baseId) : true))
    .slice(0, 5);

  const pendingShopping = shopping.filter((i) => !i.checked).length;
  const todayBirthdays = birthdays.filter((b) => b.day === today.getDate() && b.month === today.getMonth() + 1);
  const monthBirthdays = birthdays.filter((b) => b.month === today.getMonth() + 1).length;
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
            </h2>
            <p className="text-sm text-muted-foreground">
              {upperFirst(format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }))} ·{" "}
              {todayActivities.length} {todayActivities.length === 1 ? "compromisso" : "compromissos"} hoje
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={fromSummary ? "default" : "outline"}
          className={cn("mt-3 gap-2 bg-white/60 dark:bg-transparent", fromSummary && "bg-primary animate-pulse")}
          onClick={() => {
            setFromSummary(false);
            speak(morningSummary({ name: firstName, activities, birthdays, meds, doses: dosesTaken }), readSettings(user).voiceGender);
          }}
          data-testid="button-hear-summary"
        >
          <Volume2 className="h-4 w-4" /> Ouvir meu dia
        </Button>
      </Card>

      {!firstName && <NameCard />}

      <InstallBanner />

      <div className="grid grid-cols-2 gap-2" data-testid="summary-tiles">
        <Tile icon="listas" onClick={() => onNavigate("compras")} value={String(pendingShopping)} label="para comprar" />
        <Tile
          icon="aniversarios"
          onClick={() => setBirthdaysOpen(true)}
          testId="button-open-birthdays"
          value={String(monthBirthdays)}
          label="aniversários no mês"
        />
        <Tile
          icon="ciclo"
          onClick={() => onNavigate("ciclo")}
          value={!cycle.hasHistory ? "—" : cycle.active ? `${cycle.dayOfPeriod}º dia` : `${cycle.daysUntilNext} dias`}
          label={!cycle.hasHistory ? "ciclo" : cycle.active ? "menstruação" : "p/ próxima"}
        />
        <Tile
          icon="atividade"
          onClick={() => setWorkoutsOpen(true)}
          testId="button-open-workouts"
          value={String(weekWorkouts)}
          label={weekWorkouts === 1 ? "atividade na semana" : "atividades na semana"}
        />
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold">Hoje</h3>
        {todayBirthdays.map((b) => {
          const age = b.birthYear ? new Date().getFullYear() - b.birthYear : undefined;
          return (
            <Card key={b.id} className="p-4 flex items-center gap-3 bg-hero border-0" data-testid={`birthday-today-${b.id}`}>
              <AppIcon name="aniversarios" className="h-11 w-11" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">Hoje é aniversário de {b.name} 🎉</p>
                <p className="text-xs text-muted-foreground">{age ? `Faz ${age} anos` : "Não esqueça de dar os parabéns!"}</p>
                {b.giftIdeas && <p className="mt-1 text-xs text-foreground/80">🎁 Ideia de presente: {b.giftIdeas}</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => sendCongrats(b.name)} className="shrink-0">
                Parabéns
              </Button>
            </Card>
          );
        })}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : todayActivities.length > 0 ? (
          todayActivities.map((a) => <ActivityCard key={a.id} {...a} {...cardHandlers} />)
        ) : todayBirthdays.length > 0 ? null : (
          <EmptyState
            icon={CalendarX}
            title="Nada marcado para hoje"
            description="Aproveite o dia! Ou adicione um compromisso pelo microfone ou pelo botão abaixo."
            actionLabel="Adicionar compromisso"
            onAction={onAdd}
          />
        )}
      </section>

      {/* Remédios de hoje: um ícone logo abaixo das atividades do dia */}
      <button
        type="button"
        onClick={() => setMedsOpen(true)}
        className="w-full flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3 text-left shadow-[0_4px_18px_-8px_hsl(330_60%_60%/0.28)] hover:bg-secondary/60 transition-colors"
        data-testid="button-open-meds"
      >
        <AppIcon name="remedios" className="h-11 w-11" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">Remédios de hoje</p>
          <p className="text-xs text-muted-foreground">
            {doseSlots.length === 0
              ? "Nenhum remédio cadastrado para hoje. Toque para adicionar."
              : nextDose
                ? `${takenCount} de ${doseSlots.length} tomados · próximo às ${nextDose.time}: ${nextDose.med.name}`
                : `${takenCount} de ${doseSlots.length} tomados`}
          </p>
        </div>
        {lateDoses > 0 && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
            {lateDoses} {lateDoses === 1 ? "atrasada" : "atrasadas"}
          </span>
        )}
      </button>

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold">Próximos dias</h3>
          {upcoming.map((a) => (
            <ActivityCard key={a.id} {...a} showDate {...cardHandlers} />
          ))}
        </section>
      )}
      <BirthdaysDialog open={birthdaysOpen} onOpenChange={setBirthdaysOpen} />
      <MedsDialog open={medsOpen} onOpenChange={setMedsOpen} />
      <WorkoutsDialog open={workoutsOpen} onOpenChange={setWorkoutsOpen} />
    </div>
  );
}
