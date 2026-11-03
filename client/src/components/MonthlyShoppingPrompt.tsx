import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KindHeader } from "@/components/KindHeader";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, displayName } from "@/hooks/use-auth";
import { refresh, useShopping, useTrips, useUserId } from "@/hooks/use-data";
import { addShoppingItems } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { suggestFromHistory } from "@/lib/shopping-suggest";
import { cn } from "@/lib/utils";

/**
 * No primeiro acesso de cada mês, pergunta se a pessoa quer uma nova lista de
 * compras baseada no histórico. O mês já perguntado fica guardado na conta
 * (vale para todos os aparelhos).
 */
export function MonthlyShoppingPrompt({ paused = false }: { paused?: boolean }) {
  const { user } = useAuth();
  const userId = useUserId();
  const { toast } = useToast();
  const { data: trips, isSuccess: tripsLoaded } = useTrips();
  const { data: items = [], isSuccess: itemsLoaded } = useShopping();
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const monthKey = format(new Date(), "yyyy-MM");
  const asked = (user?.user_metadata as { shopping_month_asked?: string } | undefined)?.shopping_month_asked;

  const suggestions = useMemo(
    () => (trips ? suggestFromHistory(trips, items.filter((i) => !i.checked).map((i) => i.name)) : []),
    [trips, items],
  );

  const markAsked = () => supabase.auth.updateUser({ data: { shopping_month_asked: monthKey } }).catch(() => {});

  useEffect(() => {
    if (!user || !tripsLoaded || !itemsLoaded || asked === monthKey) return;
    // Só pergunta se houver compras de meses anteriores para se basear.
    const hasHistory = (trips ?? []).some((t) => format(t.doneAt, "yyyy-MM") < monthKey);
    if (hasHistory && suggestions.length) setOpen(true);
    else void markAsked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tripsLoaded, itemsLoaded, asked, monthKey]);

  const chosen = suggestions.filter((s) => !removed.includes(s.name));
  const name = displayName(user);
  const month = format(new Date(), "MMMM", { locale: ptBR });

  const close = () => {
    setOpen(false);
    void markAsked();
  };

  const create = async () => {
    setSaving(true);
    try {
      await addShoppingItems(chosen.map(({ name, quantity }) => ({ name, quantity })));
      refresh(userId, "shopping");
      toast({ title: "Lista do mês criada! 🛒", description: `${chosen.length} itens adicionados à lista de compras.` });
      close();
    } catch (err) {
      toast({ title: "Não foi possível criar a lista", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open && !paused} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col gap-3" data-testid="dialog-monthly-shopping">
        <div className="shrink-0">
        <KindHeader
          kind="shopping"
          label={`Novo mês · ${month}`}
          title={`${name ? `${name}, v` : "V"}ocê quer que eu crie uma nova lista de compras para este mês baseada no seu histórico?`}
          description={`Separei ${suggestions.length} itens que você costuma comprar. Toque para tirar o que não precisar.`}
        />
        </div>
        <div className="flex-1 overflow-y-auto flex flex-wrap content-start gap-1.5">
          {suggestions.map((s) => {
            const off = removed.includes(s.name);
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => setRemoved((r) => (off ? r.filter((x) => x !== s.name) : [...r, s.name]))}
                aria-pressed={!off}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  off ? "bg-background text-muted-foreground line-through" : "bg-secondary border-transparent",
                )}
              >
                {off ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 text-primary" />}
                {s.name}
                {s.quantity && <span className="text-xs text-muted-foreground">({s.quantity})</span>}
              </button>
            );
          })}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={close}>Agora não</Button>
          <Button onClick={create} disabled={saving || !chosen.length} data-testid="button-monthly-create">
            Sim, criar lista ({chosen.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
