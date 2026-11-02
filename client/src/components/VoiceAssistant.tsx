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
import { Mic, Keyboard, Plus, X, Loader2, CalendarPlus, ShoppingCart, Cake, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useCycles, useUserId } from "@/hooks/use-data";
import { listen, speak, speechRecognitionSupported } from "@/lib/speech";
import { parseShoppingItems, parseVoiceCommand, VOICE_EXAMPLES, type VoiceCommand } from "@/lib/voice-parser";
import { CATEGORIES, MONTH_NAMES, REMINDER_OPTIONS, reminderLabel } from "@/lib/options";
import {
  addShoppingItems,
  createActivity,
  createBirthday,
  endCycle,
  startCycle,
} from "@/lib/data";

type Stage = "listening" | "typing" | "confirm";

interface VoiceAssistantProps {
  open: boolean;
  mode: "voice" | "type";
  /** Aberto pela aba Compras: o que for falado vira item da lista. */
  context?: "shopping";
  onOpenChange: (open: boolean) => void;
}

// Formulário editável que a pessoa confere antes de salvar.
interface Draft {
  kind: "activity" | "shopping" | "birthday" | "period_start" | "period_end";
  title: string;
  address: string;
  phone: string;
  date: string; // AAAA-MM-DD
  time: string; // HH:mm
  category: string;
  reminderEnabled: boolean;
  minutesBefore: number;
  items: string[];
  name: string;
  day: number;
  month: number;
}

function emptyDraft(): Draft {
  const now = new Date();
  return {
    kind: "activity",
    title: "",
    address: "",
    phone: "",
    date: format(now, "yyyy-MM-dd"),
    time: "09:00",
    category: "outros",
    reminderEnabled: true,
    minutesBefore: 30,
    items: [],
    name: "",
    day: now.getDate(),
    month: now.getMonth() + 1,
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
        date: format(cmd.date, "yyyy-MM-dd"),
        time: format(cmd.date, "HH:mm"),
        category: cmd.category,
        reminderEnabled: cmd.reminderEnabled,
        minutesBefore: cmd.minutesBefore,
      };
    case "shopping":
      return { ...d, kind: "shopping", items: cmd.items.length ? cmd.items : [""] };
    case "birthday":
      return { ...d, kind: "birthday", name: cmd.name, day: cmd.day ?? d.day, month: cmd.month ?? d.month };
    case "period_start":
    case "period_end":
      return { ...d, kind: cmd.kind, date: format(cmd.date, "yyyy-MM-dd") };
    default:
      // Não entendeu: sugere como atividade, com o texto ouvido como título.
      return { ...d, kind: "activity", title: heard };
  }
}

const KIND_TABS: { kind: Draft["kind"]; label: string; icon: typeof Mic }[] = [
  { kind: "activity", label: "Compromisso", icon: CalendarPlus },
  { kind: "shopping", label: "Compras", icon: ShoppingCart },
  { kind: "birthday", label: "Aniversário", icon: Cake },
  { kind: "period_start", label: "Menstruação", icon: Droplet },
];

const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function VoiceAssistant({ open, mode, context, onOpenChange }: VoiceAssistantProps) {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: cycles = [] } = useCycles();

  const [stage, setStage] = useState<Stage>("listening");
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const interpret = (text: string) => {
    let cmd = parseVoiceCommand(text);
    // Na aba Compras, frases sem data/hora viram itens da lista.
    if (context === "shopping" && (cmd.kind === "unknown" || (cmd.kind === "activity" && !cmd.hasTime))) {
      cmd = { kind: "shopping", items: parseShoppingItems(text) };
    }
    setHeard(text);
    setUnderstood(cmd.kind !== "unknown");
    setDraft(draftFrom(cmd, text));
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
      let spoken = "";
      if (draft.kind === "activity") {
        const [h, m] = draft.time.split(":").map(Number);
        const date = parseDay(draft.date);
        date.setHours(h || 0, m || 0, 0, 0);
        await createActivity({
          title: draft.title.trim() || "Compromisso",
          ...(draft.address.trim() ? { address: draft.address } : {}),
          ...(draft.phone.trim() ? { phone: draft.phone } : {}),
          date,
          category: draft.category,
          reminderEnabled: draft.reminderEnabled,
          reminderType: "text",
          reminderMinutesBefore: draft.minutesBefore,
        });
        refresh(userId, "activities");
        spoken = `Pronto! ${draft.title} marcado para ${format(date, "EEEE, d 'de' MMMM, 'às' HH:mm", { locale: ptBR })}.`;
      } else if (draft.kind === "shopping") {
        const items = draft.items.map((i) => i.trim()).filter(Boolean);
        if (!items.length) throw new Error("Inclua pelo menos um item.");
        await addShoppingItems(items);
        refresh(userId, "shopping");
        spoken = items.length === 1 ? `${items[0]} foi para a lista de compras.` : `${items.length} itens foram para a lista de compras.`;
      } else if (draft.kind === "birthday") {
        if (!draft.name.trim()) throw new Error("Diga de quem é o aniversário.");
        await createBirthday({ name: draft.name, day: draft.day, month: draft.month });
        refresh(userId, "birthdays");
        spoken = `Aniversário de ${draft.name} salvo: ${draft.day} de ${MONTH_NAMES[draft.month - 1]}.`;
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
      speak(spoken);
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
            <DialogHeader>
              <DialogTitle>{understood ? "Entendi assim. Está certo?" : "Não entendi bem. Me ajuda?"}</DialogTitle>
              <DialogDescription className="italic">“{heard}”</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-4 gap-1">
              {KIND_TABS.map(({ kind, label, icon: Icon }) => {
                const active = draft.kind === kind || (kind === "period_start" && isPeriod);
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      // Trocar de tipo começa com os campos vazios (não leva o texto anterior).
                      if (kind === draft.kind || (kind === "period_start" && isPeriod)) return;
                      setDraft({ ...emptyDraft(), kind, items: kind === "shopping" ? [""] : [] });
                    }}
                    className={`flex flex-col items-center gap-1 rounded-md p-2 text-[11px] transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 py-2">
              {draft.kind === "activity" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="va-title">O quê</Label>
                    <Input id="va-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-date">Dia</Label>
                      <Input id="va-date" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-time">Hora</Label>
                      <Input id="va-time" type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="va-address">Endereço <span className="text-muted-foreground font-normal">(opc.)</span></Label>
                      <Input id="va-address" value={draft.address} onChange={(e) => set({ address: e.target.value })} placeholder="Rua, número" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="va-phone">Telefone <span className="text-muted-foreground font-normal">(opc.)</span></Label>
                      <Input id="va-phone" type="tel" inputMode="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(61) 9..." />
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
                  <p className="text-xs text-muted-foreground">Você recebe um alerta no dia, às 9h.</p>
                </>
              )}

              {isPeriod && (
                <>
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
              <Button onClick={save} disabled={saving} data-testid="button-voice-confirm">
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
