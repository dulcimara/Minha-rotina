import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { KindHeader } from "@/components/KindHeader";
import { useToast } from "@/hooks/use-toast";
import { refresh, useUserId } from "@/hooks/use-data";
import { saveCycleDay, type CycleDay } from "@/lib/data";
import { upperFirst, cn } from "@/lib/utils";

export const FLOWS = [
  { value: "leve", label: "Leve", drops: 1 },
  { value: "medio", label: "Médio", drops: 2 },
  { value: "intenso", label: "Intenso", drops: 3 },
];

export const SYMPTOMS = [
  "Cólica",
  "Dor de cabeça",
  "Inchaço",
  "Seios sensíveis",
  "Espinhas",
  "Cansaço",
  "Enjoo",
  "Dor nas costas",
  "Vontade de doce",
  "Insônia",
];

export const MOODS = [
  { value: "bem", label: "Bem", emoji: "😊" },
  { value: "normal", label: "Normal", emoji: "😐" },
  { value: "triste", label: "Triste", emoji: "😢" },
  { value: "irritada", label: "Irritada", emoji: "😠" },
  { value: "ansiosa", label: "Ansiosa", emoji: "😰" },
  { value: "cansada", label: "Cansada", emoji: "😴" },
];

const chip = (on: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-sm transition-colors",
    on ? "bg-mic text-white border-transparent" : "bg-card hover:bg-secondary",
  );

/** "Como você está hoje?": fluxo, sintomas, humor e anotação de um dia. */
export function CycleDayDialog({
  open,
  onOpenChange,
  entry,
  day,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entry?: CycleDay;
  day: string;
}) {
  const { toast } = useToast();
  const userId = useUserId();
  const [date, setDate] = useState(day);
  const [flow, setFlow] = useState(entry?.flow);
  const [symptoms, setSymptoms] = useState<string[]>(entry?.symptoms ?? []);
  const [mood, setMood] = useState(entry?.mood);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await saveCycleDay({ day: date, flow, symptoms, mood, notes });
      refresh(userId, "cycleDays");
      toast({ title: "Registro salvo" });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const [y, m, d] = date.split("-").map(Number);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-cycle-day">
        <KindHeader
          kind="period"
          label="Diário do ciclo"
          title="Como você está?"
          description={upperFirst(format(new Date(y, m - 1, d), "EEEE, d 'de' MMMM", { locale: ptBR }))}
        />

        <div className="space-y-1.5">
          <Label htmlFor="cd-day">Dia</Label>
          <Input id="cd-day" type="date" max={format(new Date(), "yyyy-MM-dd")} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Fluxo</Label>
          <div className="flex flex-wrap gap-1.5">
            {FLOWS.map((f) => (
              <button key={f.value} type="button" className={chip(flow === f.value)} onClick={() => setFlow(flow === f.value ? undefined : f.value)}>
                {"💧".repeat(f.drops)} {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sintomas</Label>
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOMS.map((s) => {
              const on = symptoms.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  className={chip(on)}
                  aria-pressed={on}
                  onClick={() => setSymptoms(on ? symptoms.filter((x) => x !== s) : [...symptoms, s])}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Humor</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {MOODS.map((mo) => (
              <button
                key={mo.value}
                type="button"
                className={cn(chip(mood === mo.value), "rounded-xl py-2")}
                onClick={() => setMood(mood === mo.value ? undefined : mo.value)}
              >
                <span className="block text-xl leading-none">{mo.emoji}</span>
                <span className="text-xs">{mo.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cd-notes">Anotação</Label>
          <Textarea id="cd-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Algo que queira lembrar" />
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={save} disabled={saving} data-testid="button-cycle-day-save">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
