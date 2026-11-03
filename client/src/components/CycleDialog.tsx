import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KindHeader } from "@/components/KindHeader";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useUserId } from "@/hooks/use-data";
import { deleteCycle, startCycle, updateCycle, type Cycle } from "@/lib/data";

interface CycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** registro para corrigir; vazio = novo registro */
  cycle?: Cycle | null;
}

const toInput = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : "");
const fromInput = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Registrar uma menstruação de outra data (início e término) ou corrigir um registro. */
export function CycleDialog({ open, onOpenChange, cycle }: CycleDialogProps) {
  const { toast } = useToast();
  const userId = useUserId();
  const [start, setStart] = useState(toInput(cycle?.startDate) || toInput(new Date()));
  const [end, setEnd] = useState(toInput(cycle?.endDate));
  const [saving, setSaving] = useState(false);
  const today = toInput(new Date());

  const error =
    !start ? "Informe o dia em que começou."
    : start > today ? "O início não pode ser no futuro."
    : end && end < start ? "O término precisa ser depois do início."
    : end && end > today ? "O término não pode ser no futuro."
    : null;

  const run = async (action: () => Promise<void>, message: string) => {
    setSaving(true);
    try {
      await action();
      refresh(userId, "cycles");
      toast({ title: message });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (error) return;
    const s = fromInput(start);
    const e = end ? fromInput(end) : undefined;
    if (cycle) run(() => updateCycle(cycle.id, s, e), "Registro corrigido");
    else run(() => startCycle(s, e), "Menstruação registrada");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <KindHeader
          kind="period"
          title={cycle ? "Corrigir registro" : "Registrar outra data"}
          description="Esqueceu de registrar na hora? Informe quando começou e, se já acabou, quando terminou."
        />

        <div className="grid grid-cols-1 gap-3 py-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cycle-start">Começou em *</Label>
            <Input id="cycle-start" type="date" max={today} value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cycle-end">
              Terminou em <span className="text-muted-foreground font-normal">(opc.)</span>
            </Label>
            <Input id="cycle-end" type="date" min={start} max={today} value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        {!end && !error && (
          <p className="-mt-2 text-xs text-muted-foreground">Sem término: fica como menstruação em andamento.</p>
        )}
        {error && <p className="-mt-2 text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          {cycle ? (
            <Button
              variant="ghost"
              className="text-destructive gap-1"
              disabled={saving}
              onClick={() => window.confirm("Apagar este registro?") && run(() => deleteCycle(cycle.id), "Registro apagado")}
            >
              <Trash2 className="h-4 w-4" /> Apagar
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={saving || !!error} data-testid="button-cycle-save">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
