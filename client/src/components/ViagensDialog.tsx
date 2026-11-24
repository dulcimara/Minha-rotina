import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInputBR } from "@/components/DateInputBR";
import { AppIcon } from "@/components/AppIcons";
import { Pencil, Plane, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useUserId, useViagens } from "@/hooks/use-data";
import { deleteViagem, saveViagem, viagemPassou, type Viagem, type ViagemInput } from "@/lib/data";
import { cn } from "@/lib/utils";

/** "aaaa-mm-dd" -> "dd/mm/aaaa" */
const brDate = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

function ViagemForm({ viagem, onDone }: { viagem?: Viagem; onDone: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [dataIda, setDataIda] = useState(viagem?.dataIda ?? "");
  const [dataVolta, setDataVolta] = useState(viagem?.dataVolta ?? "");
  const [origem, setOrigem] = useState(viagem?.origem ?? "");
  const [destino, setDestino] = useState(viagem?.destino ?? "");
  const [numeroReserva, setNumeroReserva] = useState(viagem?.numeroReserva ?? "");
  const [ciaIda, setCiaIda] = useState(viagem?.ciaIda ?? "");
  const [ciaVolta, setCiaVolta] = useState(viagem?.ciaVolta ?? "");
  const [saving, setSaving] = useState(false);

  const voltaAntesDaIda = Boolean(dataVolta && dataIda && dataVolta < dataIda);
  const valido = Boolean(dataIda && origem.trim() && destino.trim() && !voltaAntesDaIda);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    setSaving(true);
    const input: ViagemInput = {
      dataIda,
      dataVolta: dataVolta || undefined,
      origem,
      destino,
      numeroReserva,
      ciaIda,
      ciaVolta,
    };
    try {
      await saveViagem(input, viagem?.id);
      refresh(userId, "viagens");
      toast({ title: viagem ? "Viagem atualizada!" : "Viagem salva!" });
      onDone();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-muted/50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="v-ida">Data de ida *</Label>
          <DateInputBR id="v-ida" value={dataIda} onChange={setDataIda} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-volta">Data de volta</Label>
          <DateInputBR id="v-volta" value={dataVolta} onChange={setDataVolta} />
        </div>
      </div>
      {voltaAntesDaIda && <p className="text-sm text-destructive">A volta não pode ser antes da ida.</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="v-origem">Origem *</Label>
          <Input id="v-origem" value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex.: Brasília" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-destino">Destino *</Label>
          <Input id="v-destino" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex.: Salvador" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="v-reserva">Número da reserva (opcional)</Label>
        <Input id="v-reserva" value={numeroReserva} onChange={(e) => setNumeroReserva(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="v-cia-ida">Companhia da ida</Label>
          <Input id="v-cia-ida" value={ciaIda} onChange={(e) => setCiaIda(e.target.value)} placeholder="Ex.: LATAM" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-cia-volta">Companhia da volta</Label>
          <Input id="v-cia-volta" value={ciaVolta} onChange={(e) => setCiaVolta(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving || !valido}>Salvar</Button>
      </div>
    </form>
  );
}

/** Cadastro de viagens com histórico: "Próximas" e "Anteriores" (pela data de volta). */
export function ViagensDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const userId = useUserId();
  const { toast } = useToast();
  const { data: viagens = [] } = useViagens();
  const [aba, setAba] = useState<"proximas" | "anteriores">("proximas");
  const [editing, setEditing] = useState<Viagem | "novo" | null>(null);

  const proximas = viagens.filter((v) => !viagemPassou(v)).sort((a, b) => a.dataIda.localeCompare(b.dataIda));
  const anteriores = viagens.filter((v) => viagemPassou(v)).sort((a, b) => b.dataIda.localeCompare(a.dataIda));
  const lista = aba === "proximas" ? proximas : anteriores;

  const remove = async (v: Viagem) => {
    if (!window.confirm(`Excluir a viagem para ${v.destino}?`)) return;
    try {
      await deleteViagem(v.id);
      refresh(userId, "viagens");
      toast({ title: "Viagem excluída" });
    } catch (err) {
      toast({ title: "Não foi possível excluir", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setEditing(null); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <AppIcon name="viagens" className="h-9 w-9" /> Minhas viagens
        </DialogTitle>
        <DialogDescription className="sr-only">Viagens próximas e anteriores, com datas, trechos e reservas</DialogDescription>

        {editing !== null ? (
          <ViagemForm viagem={editing === "novo" ? undefined : editing} onDone={() => setEditing(null)} />
        ) : (
          <div className="space-y-3">
            <Button size="sm" className="w-full" onClick={() => setEditing("novo")}>
              <Plus className="h-4 w-4 mr-1" /> Nova viagem
            </Button>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
              {(["proximas", "anteriores"] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={aba === k}
                  onClick={() => setAba(k)}
                  className={cn(
                    "rounded-lg py-1.5 text-sm font-medium transition-colors",
                    aba === k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
                  )}
                >
                  {k === "proximas" ? `Próximas (${proximas.length})` : `Anteriores (${anteriores.length})`}
                </button>
              ))}
            </div>
            {lista.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {aba === "proximas" ? "Nenhuma viagem marcada." : "Nenhuma viagem anterior ainda."}
              </p>
            )}
            <ul className="divide-y">
              {lista.map((v) => (
                <li key={v.id} className="flex items-start gap-3 py-2.5">
                  <Plane className="h-4 w-4 mt-1 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-semibold leading-tight">{v.origem} → {v.destino}</p>
                    <p className="text-sm text-muted-foreground">
                      Ida {brDate(v.dataIda)}
                      {v.dataVolta ? ` · Volta ${brDate(v.dataVolta)}` : " · só ida"}
                    </p>
                    {(v.ciaIda || v.ciaVolta) && (
                      <p className="text-sm">
                        {v.ciaIda && <>Ida: {v.ciaIda}</>}
                        {v.ciaIda && v.ciaVolta && " · "}
                        {v.ciaVolta && <>Volta: {v.ciaVolta}</>}
                      </p>
                    )}
                    {v.numeroReserva && <p className="text-sm">Reserva: {v.numeroReserva}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(v)} aria-label={`Editar viagem para ${v.destino}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(v)} aria-label={`Excluir viagem para ${v.destino}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
