import { track } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/NativeSelect";
import { Mic, Keyboard, Plus, X, Loader2 } from "lucide-react";
import { KindHeader } from "@/components/KindHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { WeekdayPicker } from "@/components/WeekdayPicker";
import { repeatLabel } from "@/lib/recurrence";
import { useToast } from "@/hooks/use-toast";
import { refresh, useChildren, useCycles, useLists, useUserId } from "@/hooks/use-data";
import { listen, speak, speechRecognitionSupported } from "@/lib/speech";
import { parseVoiceAs, parseVoiceCommand, splitQuantity, VOICE_EXAMPLES, type IntentChoice, type VoiceCommand } from "@/lib/voice-parser";
import { displayName } from "@/hooks/use-auth";

/** Opções da pergunta de esclarecimento, na ordem em que aparecem. */
const CLARIFY_OPTIONS: { value: IntentChoice; label: string }[] = [
  { value: "compromisso", label: "Compromisso" },
  { value: "lembrete", label: "Lembrete" },
  { value: "aniversario", label: "Aniversário" },
  { value: "lista", label: "Lista de compras" },
  { value: "remedio", label: "Remédio" },
  { value: "filme", label: "Filme ou série" },
];

/** "Ana, pronto! ..." — chama a pessoa pelo nome, sem repetir o início da frase. */
const withName = (name: string | undefined, spoken: string) => {
  if (!name || !spoken) return spoken;
  return `${name}, ${spoken.charAt(0).toLowerCase()}${spoken.slice(1)}`;
};
import { CATEGORIES, MONTH_NAMES, REMINDER_OPTIONS, reminderLabel } from "@/lib/options";
import {
  addShoppingItems,
  createActivity,
  createBirthday,
  endCycle,
  saveMedication,
  saveReminder,
  saveWatchItem,
  saveWorkout,
  startCycle,
  type WatchStatus,
} from "@/lib/data";
import { PRESETS, REPEATS, type Repeat } from "@/lib/lembretes";
import { SPORTS, sportOf } from "@/lib/workouts";
import { timesEvery } from "@/lib/meds";
import { Stars } from "@/components/WatchlistView";
import { addDays as addDaysFn } from "date-fns";

type Stage = "listening" | "typing" | "clarify" | "confirm";

interface VoiceAssistantProps {
  open: boolean;
  mode: "voice" | "type";
  /** Aberto pela aba Compras: o que for falado vira item da lista. */
  context?: "shopping";
  /** lista personalizada aberta (vazio = lista de compras) */
  listId?: string;
  onOpenChange: (open: boolean) => void;
}

// Formulário editável que a pessoa confere antes de salvar.
interface Draft {
  kind: "activity" | "shopping" | "birthday" | "period_start" | "period_end" | "reminder" | "workout" | "medication" | "movie";
  title: string;
  address: string;
  phone: string;
  repeatDays: number[];
  date: string; // AAAA-MM-DD
  time: string; // HH:mm
  category: string;
  reminderEnabled: boolean;
  minutesBefore: number;
  items: string[];
  name: string;
  gift: string;
  day: number;
  month: number;
  // lembrete
  emoji?: string;
  repeat: Repeat;
  // exercício
  sport: string;
  minutes: string;
  distance: string;
  // remédio
  dose: string;
  everyHours: string;
  medDays: string;
  childId: string;
  forName?: string;
  // filme ou série
  movieKind: "filme" | "serie";
  status: WatchStatus;
  rating?: number;
  where: string;
}

function emptyDraft(): Draft {
  const now = new Date();
  return {
    kind: "activity",
    title: "",
    address: "",
    phone: "",
    repeatDays: [],
    date: format(now, "yyyy-MM-dd"),
    time: "09:00",
    category: "outros",
    reminderEnabled: true,
    minutesBefore: 30,
    items: [],
    name: "",
    gift: "",
    day: now.getDate(),
    month: now.getMonth() + 1,
    repeat: "nao",
    sport: "Caminhada",
    minutes: "",
    distance: "",
    dose: "",
    everyHours: "8",
    medDays: "",
    childId: "",
    movieKind: "filme",
    status: "quero",
    where: "",
  };
}

function draftFrom(cmd: VoiceCommand, heard: string): Draft {
  const d = emptyDraft();
  switch (cmd.kind) {
    case "activity":
      return {
        ...d,
        kind: "activity",
        title: cmd.title,
        address: cmd.address ?? "",
        phone: cmd.phone ?? "",
        repeatDays: cmd.repeatDays ?? [],
        date: format(cmd.date, "yyyy-MM-dd"),
        time: format(cmd.date, "HH:mm"),
        category: cmd.category,
        reminderEnabled: cmd.reminderEnabled,
        minutesBefore: cmd.minutesBefore,
      };
    case "shopping":
      return { ...d, kind: "shopping", items: cmd.items.length ? cmd.items : [""] };
    case "birthday":
      return { ...d, kind: "birthday", name: cmd.name, gift: cmd.giftIdeas ?? "", day: cmd.day ?? d.day, month: cmd.month ?? d.month };
    case "period_start":
    case "period_end":
      return { ...d, kind: cmd.kind, date: format(cmd.date, "yyyy-MM-dd") };
    case "reminder":
      return { ...d, kind: "reminder", title: cmd.title, emoji: cmd.emoji, date: format(cmd.date, "yyyy-MM-dd"), time: cmd.time ?? "09:00", repeat: cmd.repeat };
    case "workout":
      return {
        ...d,
        kind: "workout",
        sport: cmd.activity,
        date: format(cmd.date, "yyyy-MM-dd"),
        minutes: cmd.minutes ? String(cmd.minutes) : "",
        distance: cmd.distanceKm != null ? String(cmd.distanceKm).replace(".", ",") : "",
      };
    case "medication":
      return {
        ...d,
        kind: "medication",
        title: cmd.name,
        dose: cmd.dose ?? "",
        everyHours: cmd.everyHours ? String(cmd.everyHours) : "24",
        time: cmd.firstTime ?? "08:00",
        medDays: cmd.days ? String(cmd.days) : "",
        forName: cmd.forName,
      };
    case "movie":
      return { ...d, kind: "movie", title: cmd.title, movieKind: cmd.movieKind, status: cmd.status, rating: cmd.rating, where: cmd.where ?? "" };
    default:
      // Não entendeu: sugere como atividade, com o texto ouvido como título.
      return { ...d, kind: "activity", title: heard };
  }
}

/** Frase do cabeçalho da confirmação, conforme o tipo. */
function confirmTitle(kind: Draft["kind"]): string {
  switch (kind) {
    case "shopping":
      return "Vou colocar na sua lista:";
    case "birthday":
      return "Vou guardar este aniversário:";
    case "period_start":
    case "period_end":
      return "Vou registrar no seu ciclo:";
    case "reminder":
      return "Vou criar este lembrete:";
    case "workout":
      return "Vou registrar seu exercício:";
    case "medication":
      return "Vou cadastrar este remédio:";
    case "movie":
      return "Vou anotar na sua lista:";
    default:
      return "Vou agendar assim. Confere?";
  }
}

const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function VoiceAssistant({ open, mode, context, listId, onOpenChange }: VoiceAssistantProps) {
  const { data: lists = [] } = useLists();
  const listName = lists.find((l) => l.id === listId)?.name;
  const { toast } = useToast();
  const userId = useUserId();
  const { data: cycles = [] } = useCycles();
  const { data: children = [] } = useChildren();

  const [stage, setStage] = useState<Stage>("listening");
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const nome = displayName(user);
  const cycleConsented = Boolean((user?.user_metadata as { cycle_consent_at?: string } | undefined)?.cycle_consent_at);
  const [cycleConsent, setCycleConsent] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const interpret = (text: string) => {
    // A classificação não depende da tela em que a pessoa está.
    const cmd = parseVoiceCommand(text);
    setHeard(text);
    // Na dúvida, pergunta em vez de adivinhar.
    if (cmd.kind === "unknown") {
      setStage("clarify");
      return;
    }
    setUnderstood(true);
    const d = draftFrom(cmd, text);
    // "para o João": liga o remédio ao perfil do filho com esse nome
    if (d.kind === "medication" && d.forName) {
      const n = d.forName.toLowerCase();
      d.childId = children.find((c) => c.name.toLowerCase().split(" ")[0] === n)?.id ?? "";
    }
    setDraft(d);
    setStage("confirm");
  };

  // A pessoa escolheu o tipo na pergunta de esclarecimento.
  const choose = (choice: IntentChoice) => {
    setUnderstood(true);
    setDraft(draftFrom(parseVoiceAs(choice, heard), heard));
    setStage("confirm");
  };

  const startListening = () => {
    setError(null);
    setHeard("");
    setStage("listening");
    stopRef.current = listen({
      onPartial: setHeard,
      onFinal: interpret,
      onError: (msg) => {
        setError(msg);
        setStage("typing");
      },
      onEnd: () => {},
    });
  };

  // Ao abrir: começa a ouvir (ou mostra o campo para digitar).
  useEffect(() => {
    if (!open) {
      stopRef.current();
      return;
    }
    setError(null);
    setTyped("");
    setHeard("");
    setDraft(emptyDraft());
    if (mode === "voice" && speechRecognitionSupported()) startListening();
    else {
      if (mode === "voice") setError("Este navegador não reconhece voz. Digite o que você diria:");
      setStage("typing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const close = () => {
    stopRef.current();
    onOpenChange(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      if ((draft.kind === "period_start" || draft.kind === "period_end") && !cycleConsented) {
        await supabase.auth.updateUser({ data: { cycle_consent_at: new Date().toISOString() } });
      }
      let spoken = "";
      if (draft.kind === "activity") {
        const [h, m] = draft.time.split(":").map(Number);
        const date = parseDay(draft.date);
        date.setHours(h || 0, m || 0, 0, 0);
        await createActivity({
          title: draft.title.trim() || "Compromisso",
          ...(draft.address.trim() ? { address: draft.address } : {}),
          ...(draft.phone.trim() ? { phone: draft.phone } : {}),
          ...(draft.repeatDays.length ? { repeatDays: draft.repeatDays } : {}),
          date,
          category: draft.category,
          reminderEnabled: draft.reminderEnabled,
          reminderType: "text",
          reminderMinutesBefore: draft.minutesBefore,
        });
        refresh(userId, "activities");
        spoken = draft.repeatDays.length
          ? `Pronto! ${draft.title}, ${repeatLabel(draft.repeatDays).toLowerCase()}, às ${format(date, "HH:mm")}.`
          : `Pronto! ${draft.title} marcado para ${format(date, "EEEE, d 'de' MMMM, 'às' HH:mm", { locale: ptBR })}.`;
      } else if (draft.kind === "shopping") {
        const items = draft.items.map((i) => i.trim()).filter(Boolean);
        if (!items.length) throw new Error("Inclua pelo menos um item.");
        await addShoppingItems(items.map(splitQuantity), listId);
        refresh(userId, "shopping");
        const where = listName ? `a lista ${listName}` : "a lista de compras";
        spoken = items.length === 1 ? `${items[0]} foi para ${where}.` : `${items.length} itens foram para ${where}.`;
      } else if (draft.kind === "birthday") {
        if (!draft.name.trim()) throw new Error("Diga de quem é o aniversário.");
        await createBirthday({
          name: draft.name,
          day: draft.day,
          month: draft.month,
          ...(draft.gift.trim() ? { giftIdeas: draft.gift } : {}),
        });
        refresh(userId, "birthdays");
        spoken = `Aniversário de ${draft.name} salvo: ${draft.day} de ${MONTH_NAMES[draft.month - 1]}.`;
      } else if (draft.kind === "reminder") {
        if (!draft.title.trim()) throw new Error("Diga o que é o lembrete.");
        await saveReminder({
          text: draft.title,
          emoji: draft.emoji ?? PRESETS.find((p) => p.title.toLowerCase() === draft.title.trim().toLowerCase())?.emoji,
          dueDate: draft.date,
          dueTime: draft.time || "09:00",
          repeat: draft.repeat,
          alert: true,
        });
        refresh(userId, "reminders");
        const rep = draft.repeat !== "nao" ? `, ${REPEATS.find((r) => r.value === draft.repeat)?.label.toLowerCase()}` : "";
        spoken = `Lembrete criado: ${draft.title}, ${format(parseDay(draft.date), "d 'de' MMMM", { locale: ptBR })}${rep}.`;
      } else if (draft.kind === "workout") {
        const minutes = draft.minutes ? Math.round(Number(draft.minutes)) : undefined;
        const dist = draft.distance ? Number(draft.distance.replace(",", ".")) : undefined;
        await saveWorkout({
          activity: draft.sport,
          day: draft.date,
          minutes,
          distanceKm: sportOf(draft.sport).distance && dist != null && !Number.isNaN(dist) ? dist : undefined,
        });
        refresh(userId, "workouts");
        spoken = `${draft.sport} registrada${minutes ? `: ${minutes} minutos` : ""}. Muito bem!`;
      } else if (draft.kind === "medication") {
        if (!draft.title.trim()) throw new Error("Diga o nome do remédio.");
        const every = Number(draft.everyHours) || 24;
        const days = Number(draft.medDays) || 0;
        const start = format(new Date(), "yyyy-MM-dd");
        await saveMedication({
          name: draft.title,
          dose: draft.dose || undefined,
          times: timesEvery(draft.time || "08:00", every),
          startDate: start,
          endDate: days ? format(addDaysFn(new Date(), days - 1), "yyyy-MM-dd") : undefined,
          reminder: true,
          childId: draft.childId || undefined,
        });
        refresh(userId, "medications");
        spoken = `Remédio ${draft.title} cadastrado, ${every === 24 ? "uma vez por dia" : `de ${every} em ${every} horas`}, a partir das ${draft.time}.`;
      } else if (draft.kind === "movie") {
        if (!draft.title.trim()) throw new Error("Diga o nome do filme ou série.");
        await saveWatchItem({
          title: draft.title,
          kind: draft.movieKind,
          where: draft.where || undefined,
          status: draft.status,
          rating: draft.status === "assisti" ? draft.rating : undefined,
          watchedAt: draft.status === "assisti" ? format(new Date(), "yyyy-MM-dd") : undefined,
        });
        refresh(userId, "watchlist");
        spoken = `${draft.title} ${draft.status === "assisti" ? "foi para os já vistos" : "está na sua lista"}.`;
      } else if (draft.kind === "period_start") {
        await startCycle(parseDay(draft.date));
        refresh(userId, "cycles");
        spoken = "Início da menstruação registrado.";
      } else {
        const active = cycles.find((c) => !c.endDate);
        if (!active) throw new Error("Não há uma menstruação em andamento. Registre primeiro o início.");
        await endCycle(active.id, parseDay(draft.date));
        refresh(userId, "cycles");
        spoken = "Fim da menstruação registrado.";
      }
      toast({ title: "Salvo!", description: spoken });
      track("usou_voz", { tipo: draft.kind }); // ciclo e remédios não são enviados (analytics.ts)
      speak(withName(nome, spoken));
      close();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isPeriod = draft.kind === "period_start" || draft.kind === "period_end";

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-voice-assistant">
        {stage === "listening" && (
          <>
            <DialogHeader>
              <DialogTitle>Estou ouvindo...</DialogTitle>
              <DialogDescription>
                {context === "shopping"
                  ? "Diga os itens da lista. Ex.: leite, pão e café."
                  : "Fale tudo de uma vez: o quê, o dia e a hora. Quando você parar de falar, eu entendo sozinha."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" />
                <div className="relative h-20 w-20 rounded-full bg-mic flex items-center justify-center shadow-lg">
                  <Mic className="h-9 w-9 text-white" />
                </div>
              </div>
              <p className="min-h-12 text-center text-lg font-medium" data-testid="text-transcript">
                {heard || <span className="text-muted-foreground text-base">Ex.: “{VOICE_EXAMPLES[0]}”</span>}
              </p>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => { stopRef.current(); setStage("typing"); }}>
                <Keyboard className="h-4 w-4 mr-2" /> Digitar
              </Button>
              <Button onClick={() => stopRef.current()}>Pronto, terminei</Button>
            </DialogFooter>
          </>
        )}

        {stage === "clarify" && (
          <>
            <DialogHeader>
              <DialogTitle>{nome ? `${nome}, não entendi bem` : "Não entendi bem"}</DialogTitle>
              <DialogDescription>
                Tudo bem! Você quer marcar um compromisso, criar um lembrete, cadastrar um aniversário ou colocar algo na lista?
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground" data-testid="text-clarify-heard">Ouvi: “{heard}”</p>
            <div className="grid grid-cols-2 gap-2">
              {CLARIFY_OPTIONS.map((o) => (
                <Button key={o.value} variant="outline" onClick={() => choose(o.value)} data-testid={`button-clarify-${o.value}`}>
                  {o.label}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={startListening} data-testid="button-clarify-again">
                Falar de novo
              </Button>
            </DialogFooter>
          </>
        )}

        {stage === "typing" && (
          <>
            <DialogHeader>
              <DialogTitle>O que você quer registrar?</DialogTitle>
              <DialogDescription>Escreva do mesmo jeito que você falaria.</DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim()) interpret(typed.trim());
              }}
              className="space-y-3"
            >
              <Input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={context === "shopping" ? "Ex.: leite, pão e café" : "Ex.: dentista sexta às 15h"}
                data-testid="input-voice-typed"
              />
              <div className="flex flex-wrap gap-2">
                {VOICE_EXAMPLES.slice(1, 5).map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setTyped(ex)}
                    className="text-xs rounded-full bg-muted px-3 py-1 text-muted-foreground hover:bg-secondary"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                {speechRecognitionSupported() ? (
                  <Button type="button" variant="ghost" onClick={startListening}>
                    <Mic className="h-4 w-4 mr-2" /> Falar
                  </Button>
                ) : <span />}
                <Button type="submit" disabled={!typed.trim()}>Continuar</Button>
              </DialogFooter>
            </form>
          </>
        )}

        {stage === "confirm" && (
          <>
            <KindHeader
              kind={isPeriod ? "period" : (draft.kind as Exclude<Draft["kind"], "period_start" | "period_end">)}
              title={understood ? (draft.kind === "shopping" && listName ? `Vou colocar na lista "${listName}":` : confirmTitle(draft.kind)) : "Não entendi tudo. Confere pra mim?"}
              heard={heard}
            />
            {!understood && (
              <p className="text-xs text-muted-foreground -mt-1">
                Preencha o que faltou ou toque em “Falar de novo”. Ex.: “coloca leite na lista”, “aniversário da Ana dia 12 de março”.
              </p>
            )}

            <div className="space-y-4 py-2">
              {draft.kind === "activity" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-title">O quê</Label>
                    <Input id="va-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-date">{draft.repeatDays.length ? "Começa em" : "Dia"}</Label>
                      <Input id="va-date" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-time">Hora</Label>
                      <Input id="va-time" type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} />
                    </div>
                  </div>
                  <WeekdayPicker id="va-repeat" value={draft.repeatDays} onChange={(repeatDays) => set({ repeatDays })} />
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-address">Endereço <span className="text-muted-foreground font-normal">(opc.)</span></Label>
                      <Input id="va-address" value={draft.address} onChange={(e) => set({ address: e.target.value })} placeholder="Rua, número, bloco, sala" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-phone">Telefone <span className="text-muted-foreground font-normal">(opc.)</span></Label>
                      <Input id="va-phone" type="tel" inputMode="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(61) 99999-0000" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-cat">Categoria</Label>
                    <NativeSelect id="va-cat" value={draft.category} onChange={(e) => set({ category: e.target.value })}>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 p-3">
                    <Label htmlFor="va-alert" className="flex-1">Alerta com som</Label>
                    <Switch id="va-alert" checked={draft.reminderEnabled} onCheckedChange={(v) => set({ reminderEnabled: v })} />
                  </div>
                  {draft.reminderEnabled && (
                    <div className="space-y-1.5">
                      <Label htmlFor="va-before">Avisar</Label>
                      <NativeSelect
                        id="va-before"
                        value={draft.minutesBefore}
                        onChange={(e) => set({ minutesBefore: Number(e.target.value) })}
                      >
                        {!REMINDER_OPTIONS.some((o) => o.value === draft.minutesBefore) && (
                          <option value={draft.minutesBefore}>{reminderLabel(draft.minutesBefore)}</option>
                        )}
                        {REMINDER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                  )}
                </>
              )}

              {draft.kind === "shopping" && (
                <div className="space-y-2">
                  <Label>Itens para a lista de compras</Label>
                  {draft.items.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => set({ items: draft.items.map((it, j) => (j === i ? e.target.value : it)) })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => set({ items: draft.items.filter((_, j) => j !== i) })}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remover</span>
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => set({ items: [...draft.items, ""] })}>
                    <Plus className="h-4 w-4 mr-1" /> Mais um item
                  </Button>
                </div>
              )}

              {draft.kind === "birthday" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-name">De quem</Label>
                    <Input id="va-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-day">Dia</Label>
                      <NativeSelect id="va-day" value={draft.day} onChange={(e) => set({ day: Number(e.target.value) })}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-month">Mês</Label>
                      <NativeSelect id="va-month" value={draft.month} onChange={(e) => set({ month: Number(e.target.value) })}>
                        {MONTH_NAMES.map((m, i) => (
                          <option key={m} value={i + 1} className="capitalize">{m}</option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-gift">
                      Ideias de presente <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Input id="va-gift" value={draft.gift} onChange={(e) => set({ gift: e.target.value })} placeholder="Ex.: perfume, livro" />
                  </div>
                  <p className="text-xs text-muted-foreground">Você recebe um alerta no dia, às 9h.</p>
                </>
              )}

              {draft.kind === "reminder" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-rtext">Lembrete</Label>
                    <Input id="va-rtext" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-rdate">Quando</Label>
                      <Input id="va-rdate" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-rtime">Hora do aviso</Label>
                      <Input id="va-rtime" type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-repeat">Repetir</Label>
                    <NativeSelect id="va-repeat" value={draft.repeat} onChange={(e) => set({ repeat: e.target.value as Repeat })}>
                      {REPEATS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </NativeSelect>
                  </div>
                </>
              )}

              {draft.kind === "workout" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-sport">Atividade</Label>
                    <NativeSelect id="va-sport" value={draft.sport} onChange={(e) => set({ sport: e.target.value })}>
                      {SPORTS.map((sp) => (
                        <option key={sp.name} value={sp.name}>{sp.emoji} {sp.name}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-wday">Quando</Label>
                      <Input id="va-wday" type="date" max={format(new Date(), "yyyy-MM-dd")} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-wmin">Minutos</Label>
                      <Input id="va-wmin" inputMode="numeric" value={draft.minutes} onChange={(e) => set({ minutes: e.target.value.replace(/\D/g, "") })} placeholder="Ex.: 40" />
                    </div>
                  </div>
                  {sportOf(draft.sport).distance === "km" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="va-wdist">Distância (km)</Label>
                      <Input id="va-wdist" inputMode="decimal" value={draft.distance} onChange={(e) => set({ distance: e.target.value.replace(/[^\d,.]/g, "") })} placeholder="Ex.: 3,5" />
                    </div>
                  )}
                </>
              )}

              {draft.kind === "medication" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-mname">Remédio</Label>
                      <Input id="va-mname" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-mdose">Dose</Label>
                      <Input id="va-mdose" value={draft.dose} onChange={(e) => set({ dose: e.target.value })} placeholder="Ex.: 5 ml" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-mevery">A cada (horas)</Label>
                      <NativeSelect id="va-mevery" value={draft.everyHours} onChange={(e) => set({ everyHours: e.target.value })}>
                        {["4", "6", "8", "12", "24"].map((h) => (
                          <option key={h} value={h}>{h === "24" ? "1 vez ao dia" : `${h} em ${h} horas`}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-mfirst">Primeira dose</Label>
                      <Input id="va-mfirst" type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-mdays">Por quantos dias</Label>
                      <Input id="va-mdays" inputMode="numeric" value={draft.medDays} onChange={(e) => set({ medDays: e.target.value.replace(/\D/g, "") })} placeholder="Vazio = contínuo" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-mwho">Para quem</Label>
                      <NativeSelect id="va-mwho" value={draft.childId} onChange={(e) => set({ childId: e.target.value })}>
                        <option value="">Para mim</option>
                        {children.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Doses: {timesEvery(draft.time || "08:00", Number(draft.everyHours) || 24).join(", ")}</p>
                </>
              )}

              {draft.kind === "movie" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-mtitle">Título</Label>
                    <Input id="va-mtitle" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["filme", "serie"] as const).map((k) => (
                      <Button key={k} type="button" size="sm" variant={draft.movieKind === k ? "default" : "outline"} onClick={() => set({ movieKind: k })}>
                        {k === "filme" ? "Filme" : "Série"}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([["quero", "Quero ver"], ["assistindo", "Assistindo"], ["assisti", "Já vi"]] as const).map(([v, l]) => (
                      <Button key={v} type="button" size="sm" variant={draft.status === v ? "default" : "outline"} onClick={() => set({ status: v })}>
                        {l}
                      </Button>
                    ))}
                  </div>
                  {draft.status === "assisti" && (
                    <div className="space-y-1.5">
                      <Label>Sua nota</Label>
                      <Stars value={draft.rating} onChange={(v) => set({ rating: v })} size="h-7 w-7" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="va-mwhere">Onde assistir</Label>
                    <Input id="va-mwhere" value={draft.where} onChange={(e) => set({ where: e.target.value })} placeholder="Netflix, cinema..." />
                  </div>
                </>
              )}

              {isPeriod && (
                <>
                  {!cycleConsented && (
                    <label className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={cycleConsent}
                        onChange={(e) => setCycleConsent(e.target.checked)}
                      />
                      <span>
                        Concordo em registrar meus dados do ciclo menstrual (dados sensíveis de saúde, só eu vejo e posso apagar
                        quando quiser).
                      </span>
                    </label>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={draft.kind === "period_start" ? "default" : "outline"}
                      onClick={() => set({ kind: "period_start" })}
                    >
                      Começou
                    </Button>
                    <Button
                      type="button"
                      variant={draft.kind === "period_end" ? "default" : "outline"}
                      onClick={() => set({ kind: "period_end" })}
                    >
                      Terminou
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-pdate">Dia</Label>
                    <Input id="va-pdate" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={startListening} disabled={saving}>
                <Mic className="h-4 w-4 mr-2" /> Falar de novo
              </Button>
              <Button
                onClick={save}
                disabled={saving || (isPeriod && !cycleConsented && !cycleConsent)}
                data-testid="button-voice-confirm"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
