import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Plus } from "lucide-react";
import { AppIcon } from "@/components/AppIcons";
import { ReminderGlyph } from "@/components/ReminderGlyph";
import { useShareAccess } from "@/lib/sharing";
import { RemindersDialog, byDue, dueLabel, useCompleteReminder } from "@/components/RemindersDialog";
import { useReminders } from "@/hooks/use-data";
import { dueState } from "@/lib/lembretes";
import { cn } from "@/lib/utils";

/** Card da tela inicial: os próximos lembretes, com o "feito" a um toque. */
export function RemindersCard() {
  const { data: all = [] } = useReminders();
  const complete = useCompleteReminder();
  const access = useShareAccess();
  const [dialog, setDialog] = useState<{ open: boolean; key: number; startNew: boolean }>({ open: false, key: 0, startNew: false });
  const open = (startNew: boolean) => setDialog((d) => ({ open: true, key: d.key + 1, startNew }));

  const pending = all.filter((r) => !r.doneAt).sort(byDue);
  const late = pending.filter((r) => dueState(r.dueDate) === "atrasado").length;
  const top = pending.slice(0, 3);

  return (
    <section className="rounded-2xl border border-card-border bg-card p-3.5 shadow-[0_4px_18px_-8px_hsl(330_60%_60%/0.28)]" data-testid="reminders-card">
      <div className="flex items-center gap-3">
        <AppIcon name="lembretes" className="h-11 w-11" />
        <button type="button" className="flex-1 min-w-0 text-left" onClick={() => open(false)} data-testid="button-open-reminders">
          <p className="font-semibold leading-tight">Lembretes</p>
          <p className={cn("text-xs", late ? "text-destructive font-medium" : "text-muted-foreground")}>
            {pending.length === 0
              ? "Nada pendente"
              : late
                ? `${late} ${late === 1 ? "atrasado" : "atrasados"} · ${pending.length} no total`
                : `${pending.length} ${pending.length === 1 ? "pendente" : "pendentes"}`}
          </p>
        </button>
        <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => open(true)} data-testid="button-reminder-new">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {top.length > 0 && (
        <ul className="mt-2 divide-y">
          {top.map((r) => {
            const isLate = dueState(r.dueDate) === "atrasado";
            return (
              <li key={r.id} className="flex items-center gap-2.5 py-2">
                <button
                  type="button"
                  onClick={() => complete(r)}
                  disabled={!access.canEdit(r.ownerId, "lembretes", r.id)}
                  className="h-6 w-6 shrink-0 rounded-full border-2 border-primary/50 flex items-center justify-center hover:bg-primary/10"
                  aria-label={`Marcar "${r.text}" como feito`}
                >
                  <Check className="h-3 w-3 text-primary/60" />
                </button>
                <ReminderGlyph emoji={r.emoji} />
                <span className="flex-1 min-w-0 text-sm truncate">
                  {r.text}
                  {access.sharedBy(r.ownerId) && <span className="text-xs text-muted-foreground"> · de {access.sharedBy(r.ownerId)}</span>}
                </span>
                <span className={cn("shrink-0 text-[11px]", isLate ? "text-destructive font-medium" : "text-muted-foreground")}>
                  {dueLabel(r).replace(/^atrasado · era /, "atrasado · ")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {pending.length > 3 && (
        <Button
          variant="outline"
          className="mt-2 w-full gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => open(false)}
          data-testid="button-reminders-see-all"
        >
          Ver todos os lembretes ({pending.length}) <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      <RemindersDialog key={dialog.key} open={dialog.open} startNew={dialog.startNew} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </section>
  );
}
