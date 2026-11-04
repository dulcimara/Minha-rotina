import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/NativeSelect";
import { ArrowLeft, Check, Pencil, Plus, Repeat as RepeatIcon, RotateCcw, Trash2, Users } from "lucide-react";
import { AppIcon } from "@/components/AppIcons";
import { ReminderGlyph, ReminderIcon } from "@/components/ReminderGlyph";
import { ShareDialog, SharedBadge } from "@/components/ShareDialog";
import { useShareAccess } from "@/lib/sharing";
import { useToast } from "@/hooks/use-toast";
import { refresh, useReminders, useUserId } from "@/hooks/use-data";
import { completeReminder, deleteReminder, reopenReminder, saveReminder, type Reminder } from "@/lib/data";
import { PRESETS, REPEATS, dueState, type Repeat } from "@/lib/lembretes";
import { cn } from "@/lib/utils";

const todayKey = () => format(new Date(), "yyyy-MM-dd");

/** "hoje", "amanhã", "sex, 7 nov", "atrasado desde 2 nov" */
export function dueLabel(r: Pick<Reminder, "dueDate" | "dueTime">): string {
  const st = dueState(r.dueDate);
  if (st === "sem-data") return "sem data";
  const d = new Date(r.dueDate + "T12:00");
  const time = r.dueTime && r.dueTime !== "09:00" ? ` às ${r.dueTime}` : "";
  if (st === "atrasado") return `atrasado · era ${format(d, "d MMM", { locale: ptBR })}`;
  if (st === "hoje") return `hoje${time}`;
  if (st === "amanha") return `amanhã${time}`;
  return format(d, st === "semana" ? "EEE, d MMM" : "d 'de' MMM", { locale: ptBR }) + time;
}

/** Ordem: atrasados, hoje, próximos; sem data por último. */
export const byDue = (a: Reminder, b: Reminder) =>
  (a.dueDate ?? "9999") + a.dueTime < (b.dueDate ?? "9999") + b.dueTime ? -1 : 1;

export function useCompleteReminder() {
  const { toast } = useToast();
  const userId = useUserId();
  return async (r: Reminder) => {
    try {
      const next = await completeReminder(r);
      refresh(userId, "reminders");
      toast({
        title: "Feito!",
        description: next ? `Próximo lembrete: ${format(new Date(next + "T12:00"), "d 'de' MMMM", { locale: ptBR })}.` : r.text,
      });
    } catch (err) {
      toast({ title: "Não foi possível marcar", description: (err as Error).message, variant: "destructive" });
    }
  };
}

function ReminderForm({ initial, onDone, onShare }: { initial?: Reminder; onDone: () => void; onShare?: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [text, setText] = useState(initial?.text ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? todayKey());
  const [dueTime, setDueTime] = useState(initial?.dueTime ?? "09:00");
  const [repeat, setRepeat] = useState<Repeat>(initial?.repeat ?? "nao");
  const [alert, setAlert] = useState(initial?.alert ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await saveReminder({ text, emoji, dueDate, dueTime, repeat, alert, notes }, initial?.id);
      refresh(userId, "reminders");
      toast({ title: initial ? "Lembrete atualizado" : "Lembrete criado" });
      onDone();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {!initial && (
        <div className="space-y-2">
          <Label>Escolha um pronto ou escreva o seu</Label>
          <div className="flex flex-wrap gap-1.5" data-testid="reminder-presets">
            {PRESETS.map((p) => {
              const on = text === p.title;
              return (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setText(p.title);
                    setEmoji(p.emoji);
                    setRepeat(p.repeat);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    on ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted/60",
                  )}
                >
                  <ReminderIcon emoji={p.emoji} className="h-3.5 w-3.5" /> {p.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="rm-text">Lembrete</Label>
        <Input
          id="rm-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!PRESETS.some((p) => p.title === e.target.value)) setEmoji(initial?.emoji);
          }}
          placeholder="Ex.: Levar o Pedro na natação"
          data-testid="input-reminder-text"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rm-date">Quando</Label>
          <Input id="rm-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rm-time">Hora do aviso</Label>
          <Input id="rm-time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rm-repeat">Repetir</Label>
        <NativeSelect id="rm-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
          {REPEATS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rm-notes">Observação · opcional</Label>
        <Input id="rm-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: vence dia 10, código de barras no e-mail" />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3">
        <Label htmlFor="rm-alert" className="cursor-pointer">
          Avisar na hora
        </Label>
        <Switch id="rm-alert" checked={alert} onCheckedChange={setAlert} />
      </div>

      <Button type="submit" className="w-full" disabled={!text.trim() || saving} data-testid="button-reminder-save">
        {initial ? "Salvar alterações" : "Criar lembrete"}
      </Button>
      {onShare && (
        <Button type="button" variant="outline" className="w-full gap-2" onClick={onShare} data-testid="button-reminder-share-one">
          <Users className="h-4 w-4" /> Compartilhar este lembrete
        </Button>
      )}
    </form>
  );
}

function Row({ r, onEdit, onShare }: { r: Reminder; onEdit: () => void; onShare: () => void }) {
  const userId = useUserId();
  const complete = useCompleteReminder();
  const access = useShareAccess();
  const by = access.sharedBy(r.ownerId);
  const editable = access.canEdit(r.ownerId, "lembretes", r.id);
  const late = dueState(r.dueDate) === "atrasado";
  const done = Boolean(r.doneAt);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={() => (done ? reopenReminder(r.id).then(() => refresh(userId, "reminders")) : complete(r))}
        disabled={!editable}
        className={cn(
          "h-7 w-7 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-primary/50 hover:bg-primary/10",
        )}
        aria-label={done ? "Desfazer" : "Marcar como feito"}
        title={done ? "Desfazer" : "Feito"}
      >
        {done ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 text-primary/60" />}
      </button>
      <ReminderGlyph emoji={r.emoji} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", done && "line-through text-muted-foreground")}>{r.text}</p>
        <p className={cn("text-xs truncate", late && !done ? "text-destructive font-medium" : "text-muted-foreground")}>
          {done ? `feito em ${format(r.doneAt!, "d MMM", { locale: ptBR })}` : dueLabel(r)}
          {!done && r.repeat !== "nao" && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · <RepeatIcon className="inline h-3 w-3 -mt-0.5" /> {REPEATS.find((x) => x.value === r.repeat)?.label.toLowerCase()}
            </span>
          )}
          {r.notes && <span className="text-muted-foreground font-normal"> · {r.notes}</span>}
        </p>
        {by && <SharedBadge name={by} readOnly={!editable} className="mt-0.5" />}
      </div>
      {editable && !done && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Editar">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar</span>
        </Button>
      )}
      {editable && (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        title="Apagar"
        onClick={async () => {
          if (!window.confirm(`Apagar o lembrete "${r.text}"?`)) return;
          await deleteReminder(r.id).catch(() => undefined);
          refresh(userId, "reminders");
        }}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Apagar</span>
      </Button>
      )}
    </div>
  );
}

export function RemindersDialog({
  open,
  onOpenChange,
  startNew,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** abre direto no formulário de novo lembrete */
  startNew?: boolean;
}) {
  const { data: all = [] } = useReminders();
  const [editing, setEditing] = useState<{ key: number; item?: Reminder } | null>(startNew ? { key: 0 } : null);
  const [share, setShare] = useState<{ open: boolean; key: number; item?: Reminder }>({ open: false, key: 0 });
  const openShare = (item?: Reminder) => setShare((x) => ({ open: true, key: x.key + 1, item }));
  const access = useShareAccess();
  const pending = all.filter((r) => !r.doneAt).sort(byDue);
  const done = all.filter((r) => r.doneAt).sort((a, b) => b.doneAt!.getTime() - a.doneAt!.getTime());
  const late = pending.filter((r) => dueState(r.dueDate) === "atrasado").length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setEditing(null);
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto" data-testid="dialog-reminders" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="rounded-2xl bg-hero p-4 flex items-center gap-3">
          <AppIcon name="lembretes" className="h-14 w-14" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Lembretes</p>
            <DialogTitle className="text-lg font-display font-semibold leading-snug">
              {editing ? (editing.item ? "Editar lembrete" : "Novo lembrete") : "Para não esquecer"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editing
                ? "Escolha a data e se quer que repita."
                : pending.length
                  ? `${pending.length} ${pending.length === 1 ? "pendente" : "pendentes"}${late ? ` · ${late} ${late === 1 ? "atrasado" : "atrasados"}` : ""}`
                  : "Contas, consultas, escola... tudo num lugar."}
            </DialogDescription>
          </div>
        </div>

        {editing ? (
          <>
            <Button variant="ghost" size="sm" className="-mt-1 w-fit gap-1 px-2" onClick={() => setEditing(null)}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <ReminderForm
              key={editing.key}
              initial={editing.item}
              onDone={() => setEditing(null)}
              onShare={editing.item && !access.sharedBy(editing.item.ownerId) ? () => openShare(editing.item) : undefined}
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button className="gap-2" onClick={() => setEditing({ key: Date.now() })} data-testid="button-reminder-add">
                <Plus className="h-4 w-4" /> Novo lembrete
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => openShare()} data-testid="button-reminders-share">
                <Users className="h-4 w-4" /> Compartilhar
              </Button>
            </div>
            {pending.length === 0 ? (
              <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">Nenhum lembrete pendente. 🎉</p>
            ) : (
              <div className="divide-y">
                {pending.map((r) => (
                  <Row key={r.id} r={r} onEdit={() => setEditing({ key: Date.now(), item: r })} onShare={() => openShare(r)} />
                ))}
              </div>
            )}
            {done.length > 0 && (
              <details className="rounded-xl border px-3">
                <summary className="cursor-pointer py-2.5 text-sm font-semibold text-muted-foreground">Feitos nos últimos 30 dias ({done.length})</summary>
                <div className="divide-y">
                  {done.map((r) => (
                    <Row key={r.id} r={r} onEdit={() => undefined} onShare={() => openShare(r)} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
        <ShareDialog
          key={`sh-${share.key}`}
          open={share.open}
          onOpenChange={(o) => setShare((x) => ({ ...x, open: o }))}
          area="lembretes"
          itemKey={share.item?.id}
          itemLabel={share.item?.text}
        />
      </DialogContent>
    </Dialog>
  );
}
