import { useState, type FormEvent } from "react";
import { addDays, format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/NativeSelect";
import { Pill, Plus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { keys, refresh, useChildren, useDoses, useMedications, useUserId } from "@/hooks/use-data";
import { queryClient } from "@/lib/queryClient";
import { deleteMedication, saveMedication, setDoseTaken, type DoseTaken, type Medication } from "@/lib/data";
import { dosesOn, timesEvery, treatmentLabel } from "@/lib/meds";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/AppIcons";

/** Ilustração do remédio (mesmo estilo das categorias). */
export function PillArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-12 w-12 shrink-0 rounded-2xl", className)} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#e6f6f4" />
      <g transform="rotate(-40 24 24)">
        <rect x="11" y="17.5" width="26" height="13" rx="6.5" fill="#2a9d8f" />
        <path d="M24 17.5h6.5a6.5 6.5 0 0 1 0 13H24z" fill="#9fe0d6" />
        <rect x="14.5" y="20.5" width="6" height="2.4" rx="1.2" fill="#ffffff" opacity=".6" />
      </g>
      <circle cx="36.5" cy="34.5" r="3.5" fill="#f4a261" />
    </svg>
  );
}

// ---------------------------------------------------------------
// Formulário de remédio
// ---------------------------------------------------------------

function MedForm({ med, onDone }: { med?: Medication; onDone: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: children = [] } = useChildren();
  const today = format(new Date(), "yyyy-MM-dd");

  const [name, setName] = useState(med?.name ?? "");
  const [dose, setDose] = useState(med?.dose ?? "");
  const [childId, setChildId] = useState(med?.childId ?? "");
  const [mode, setMode] = useState<"every" | "fixed">(med ? "fixed" : "every");
  const [every, setEvery] = useState(8);
  const [first, setFirst] = useState("08:00");
  const [times, setTimes] = useState<string[]>(med?.times.length ? med.times : ["08:00"]);
  const [continuous, setContinuous] = useState(med ? !med.endDate : false);
  const [days, setDays] = useState(() => {
    if (!med?.endDate) return 7;
    const [y, m, d] = med.endDate.split("-").map(Number);
    const [sy, sm, sd] = med.startDate.split("-").map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86_400_000) + 1;
  });
  const [startDate, setStartDate] = useState(med?.startDate ?? today);
  const [reminder, setReminder] = useState(med?.reminder ?? true);
  const [saving, setSaving] = useState(false);

  const finalTimes = mode === "every" ? timesEvery(first, every) : Array.from(new Set(times.filter(Boolean))).sort();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !finalTimes.length) return;
    setSaving(true);
    try {
      const [y, m, d] = startDate.split("-").map(Number);
      const endDate = continuous ? undefined : format(addDays(new Date(y, m - 1, d), Math.max(1, days) - 1), "yyyy-MM-dd");
      await saveMedication(
        { name, dose, times: finalTimes, startDate, endDate, reminder, childId: childId || undefined },
        med?.id,
      );
      refresh(userId, "medications");
      toast({ title: med ? "Remédio atualizado!" : "Remédio salvo!" });
      onDone();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl bg-muted/40 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="med-name">Remédio *</Label>
        <Input id="med-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Amoxicilina" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="med-dose">Dose</Label>
          <Input id="med-dose" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Ex.: 5 ml, 1 comprimido" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="med-who">Para quem</Label>
          <NativeSelect id="med-who" value={childId} onChange={(e) => setChildId(e.target.value)}>
            <option value="">Para mim</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Horários</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" size="sm" variant={mode === "every" ? "default" : "outline"} onClick={() => setMode("every")}>
            A cada X horas
          </Button>
          <Button type="button" size="sm" variant={mode === "fixed" ? "default" : "outline"} onClick={() => setMode("fixed")}>
            Horários fixos
          </Button>
        </div>
        {mode === "every" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="med-every" className="text-xs text-muted-foreground">De quanto em quanto tempo</Label>
              <NativeSelect id="med-every" value={every} onChange={(e) => setEvery(Number(e.target.value))}>
                {[4, 6, 8, 12, 24].map((h) => (
                  <option key={h} value={h}>{h === 24 ? "1 vez por dia" : `De ${h} em ${h} horas`}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-first" className="text-xs text-muted-foreground">Primeira dose</Label>
              <Input id="med-first" type="time" value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {times.map((t, i) => (
              <div key={i} className="flex gap-2">
                <Input type="time" value={t} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} />
                {times.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setTimes(times.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remover horário</span>
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setTimes([...times, "12:00"])}>
              <Plus className="h-4 w-4 mr-1" /> Mais um horário
            </Button>
          </div>
        )}
        {finalTimes.length > 0 && (
          <p className="text-xs text-muted-foreground">Doses às {finalTimes.join(", ")}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="med-cont">Uso contínuo</Label>
          <Switch id="med-cont" checked={continuous} onCheckedChange={setContinuous} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="med-start" className="text-xs text-muted-foreground">Começa em</Label>
            <Input id="med-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          {!continuous && (
            <div className="space-y-1.5">
              <Label htmlFor="med-days" className="text-xs text-muted-foreground">Por quantos dias</Label>
              <Input
                id="med-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 1)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-background p-3">
        <Label htmlFor="med-alert">Avisar em cada horário</Label>
        <Switch id="med-alert" checked={reminder} onCheckedChange={setReminder} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={saving || !name.trim() || !finalTimes.length} data-testid="button-med-save">
          Salvar
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Janela de remédios
// ---------------------------------------------------------------

export function MedsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: meds = [] } = useMedications();
  const { data: taken = [] } = useDoses();
  const { data: children = [] } = useChildren();
  const [editing, setEditing] = useState<Medication | "new" | null>(null);

  const slots = dosesOn(meds, taken);
  const childName = (id?: string) => children.find((c) => c.id === id)?.name;
  const now = new Date();

  const toggle = (medicationId: string, day: string, time: string, value: boolean) => {
    queryClient.setQueryData<DoseTaken[]>(keys.doses(userId), (old = []) =>
      value ? [...old, { medicationId, day, time }] : old.filter((d) => !(d.medicationId === medicationId && d.day === day && d.time === time)),
    );
    setDoseTaken(medicationId, day, time, value).catch((err) => {
      refresh(userId, "doses");
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setEditing(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-meds">
        <div className="flex items-center gap-3 rounded-2xl bg-hero p-4">
          <AppIcon name="remedios" className="h-14 w-14" />
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Remédios</p>
            <DialogTitle className="text-lg font-display font-semibold">Doses de hoje</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {slots.length ? `${slots.filter((s) => s.taken).length} de ${slots.length} tomadas` : "Nenhuma dose para hoje"}
            </DialogDescription>
          </div>
        </div>

        {editing ? (
          <MedForm med={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        ) : (
          <>
            {slots.length > 0 && (
              <div className="divide-y rounded-xl border bg-card px-3">
                {slots.map((s) => {
                  const late = !s.taken && s.at < now;
                  const forWho = childName(s.med.childId);
                  return (
                    <label key={`${s.med.id}-${s.time}`} className="flex items-center gap-3 py-2.5 cursor-pointer">
                      <Checkbox
                        checked={s.taken}
                        onCheckedChange={(c) => toggle(s.med.id, s.day, s.time, !!c)}
                        className="h-5 w-5"
                        data-testid={`dose-${s.med.id}-${s.time}`}
                      />
                      <span className={cn("w-12 text-sm font-semibold", late ? "text-destructive" : "text-primary")}>{s.time}</span>
                      <span className={cn("flex-1 min-w-0", s.taken && "line-through text-muted-foreground")}>
                        {s.med.name}
                        {s.med.dose && <span className="text-muted-foreground"> · {s.med.dose}</span>}
                        {forWho && <span className="block text-xs text-muted-foreground">para {forWho}</span>}
                      </span>
                      {late && <span className="text-[11px] text-destructive">atrasada</span>}
                    </label>
                  );
                })}
              </div>
            )}

            <Button onClick={() => setEditing("new")} className="w-full gap-1" data-testid="button-new-med">
              <Plus className="h-4 w-4" /> Novo remédio
            </Button>

            {meds.length > 0 && (
              <section className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Meus remédios</h3>
                <div className="divide-y">
                  {meds.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-2">
                      <Pill className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.name}
                          {m.dose ? ` · ${m.dose}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.times.join(", ")} · {treatmentLabel(m)}
                          {childName(m.childId) ? ` · ${childName(m.childId)}` : ""}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(m)} title="Editar">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Apagar"
                        onClick={async () => {
                          if (!window.confirm(`Apagar ${m.name}?`)) return;
                          try {
                            await deleteMedication(m.id);
                            refresh(userId, "medications", "doses");
                          } catch (err) {
                            toast({ title: "Não foi possível apagar", description: (err as Error).message, variant: "destructive" });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Apagar</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
