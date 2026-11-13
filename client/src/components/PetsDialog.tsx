import { useState, type FormEvent } from "react";
import { AppIcon } from "@/components/AppIcons";
import { DateInputBR } from "@/components/DateInputBR";
import { NativeSelect } from "@/components/NativeSelect";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useUserId, usePets, usePetVaccines, usePetHeats } from "@/hooks/use-data";
import {
  PET_ESPECIES,
  PET_HEALTH_DISCLAIMER,
  PET_SEXO,
  PET_VACCINE_SOURCES,
  VACCINE_CATALOG,
  deletePet,
  deletePetHeat,
  deletePetVaccine,
  dueVaccines,
  hasHeatTracking,
  heatForecast,
  openHeat,
  parseIso,
  petAge,
  savePet,
  savePetHeat,
  savePetVaccine,
  suggestNextDose,
  toIso,
  type Pet,
  type PetHeat,
  type PetVaccine,
} from "@/lib/pets";
import { differenceInCalendarDays, format } from "date-fns";

const OUTRA = "__outra__";
const fmt = (iso: string) => format(parseIso(iso), "dd/MM/yyyy");

function daysLabel(days: number) {
  if (days < 0) return `atrasada há ${-days} ${-days === 1 ? "dia" : "dias"}`;
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

// ---------------------------------------------------------------
// Diálogo principal
// ---------------------------------------------------------------

export function PetsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: pets = [] } = usePets();
  const [editing, setEditing] = useState<Pet | "novo" | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setEditing(null);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle>Meus pets</DialogTitle>
        <DialogDescription>Vacinas, reforços e cio em um só lugar.</DialogDescription>

        {editing ? (
          <PetForm pet={editing === "novo" ? undefined : editing} onDone={() => setEditing(null)} />
        ) : (
          <div className="space-y-4">
            {pets.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pet cadastrado ainda.</p>}
            {pets.map((p) => (
              <PetCard key={p.id} pet={p} onEdit={() => setEditing(p)} />
            ))}
            <Button variant="outline" className="w-full" onClick={() => setEditing("novo")} data-testid="button-pet-add">
              <Plus className="h-4 w-4" /> Adicionar pet
            </Button>
            <p className="text-[11px] leading-snug text-muted-foreground">{PET_HEALTH_DISCLAIMER}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------
// Cadastro e edição
// ---------------------------------------------------------------

function PetForm({ pet, onDone }: { pet?: Pet; onDone: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [p, setP] = useState<Omit<Pet, "id">>(() => ({ name: "", species: "cachorro", ...(pet ?? {}) }));
  const [weight, setWeight] = useState(pet?.weightKg != null ? String(pet.weightKg).replace(".", ",") : "");
  const [saving, setSaving] = useState(false);

  const neuteredValue = p.neutered === true ? "sim" : p.neutered === false ? "nao" : "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!p.name.trim()) return;
    setSaving(true);
    try {
      const weightKg = parseFloat(weight.replace(",", ".")) || undefined;
      await savePet({ ...p, weightKg }, pet?.id);
      refresh(userId, "pets");
      toast({ title: pet ? "Dados atualizados!" : `${p.name} foi adicionado(a)!` });
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
        <Label htmlFor="pet-name">Nome *</Label>
        <Input id="pet-name" autoFocus placeholder="Ex.: Thor" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pet-species">Espécie</Label>
          <NativeSelect id="pet-species" value={p.species} onChange={(e) => setP({ ...p, species: e.target.value as Pet["species"] })}>
            {PET_ESPECIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-sex">Sexo</Label>
          <NativeSelect
            id="pet-sex"
            value={p.sex ?? ""}
            onChange={(e) => setP({ ...p, sex: (e.target.value || undefined) as Pet["sex"] })}
          >
            <option value="">Não informar</option>
            {PET_SEXO.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pet-birth">Data de nascimento</Label>
          <DateInputBR id="pet-birth" value={p.birthDate} onChange={(iso) => setP({ ...p, birthDate: iso || undefined })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-weight">Peso (kg)</Label>
          <Input id="pet-weight" inputMode="decimal" placeholder="Ex.: 8,5" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pet-neutered">Castrado(a)?</Label>
          <NativeSelect
            id="pet-neutered"
            value={neuteredValue}
            onChange={(e) =>
              setP({ ...p, neutered: e.target.value === "sim" ? true : e.target.value === "nao" ? false : undefined })
            }
          >
            <option value="">Não sei</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </NativeSelect>
        </div>
        {p.neutered === true && (
          <div className="space-y-1.5">
            <Label htmlFor="pet-neutered-on">Data da cirurgia</Label>
            <DateInputBR id="pet-neutered-on" value={p.neuteredOn} onChange={(iso) => setP({ ...p, neuteredOn: iso || undefined })} />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pet-breed">Raça</Label>
        <Input id="pet-breed" placeholder="Ex.: SRD, Golden" value={p.breed ?? ""} onChange={(e) => setP({ ...p, breed: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pet-notes">Observações</Label>
        <Textarea id="pet-notes" rows={2} placeholder="Alergias, medicamentos de uso contínuo, veterinário..." value={p.notes ?? ""} onChange={(e) => setP({ ...p, notes: e.target.value })} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !p.name.trim()} data-testid="button-pet-save">
          Salvar
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Cartão de um pet
// ---------------------------------------------------------------

function PetCard({ pet, onEdit }: { pet: Pet; onEdit: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const { data: allVaccines = [] } = usePetVaccines();
  const vaccines = allVaccines.filter((v) => v.petId === pet.id);
  const nextDue = dueVaccines(vaccines, new Date(), 30)[0];

  const speciesLabel = PET_ESPECIES.find((e) => e.value === pet.species)?.label;
  const sexLabel = PET_SEXO.find((s) => s.value === pet.sex)?.label;
  const summary = [speciesLabel, sexLabel, petAge(pet.birthDate), pet.neutered ? "castrado(a)" : undefined]
    .filter(Boolean)
    .join(" · ");

  const remove = async () => {
    if (!window.confirm(`Apagar ${pet.name} e todo o histórico de vacinas e cios?`)) return;
    try {
      await deletePet(pet.id);
      refresh(userId, "pets", "petVaccines", "petHeats");
      toast({ title: `${pet.name} foi apagado(a)` });
    } catch (err) {
      toast({ title: "Não foi possível apagar", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-3" data-testid={`pet-card-${pet.id}`}>
      <div className="flex items-center gap-3">
        <AppIcon name="pets" className="h-11 w-11" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{pet.name}</p>
          <p className="text-xs text-muted-foreground truncate">{summary || "Dados básicos não informados"}</p>
          {nextDue && (
            <p className="mt-0.5 text-xs font-medium text-primary">
              Próxima: {nextDue.vaccine} {daysLabel(nextDue.days)}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit} title={`Editar ${pet.name}`} aria-label={`Editar ${pet.name}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`Ver vacinas e cio de ${pet.name}`}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border/60 pt-3">
          <VaccineSection pet={pet} vaccines={vaccines} />
          {hasHeatTracking(pet) && <HeatSection pet={pet} />}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}>
              <Trash2 className="h-4 w-4" /> Apagar {pet.name}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------
// Vacinas
// ---------------------------------------------------------------

function VaccineSection({ pet, vaccines }: { pet: Pet; vaccines: PetVaccine[] }) {
  const [adding, setAdding] = useState(false);
  const today = new Date();
  const catalog = VACCINE_CATALOG[pet.species];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Vacinas</p>
      {vaccines.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma vacina registrada.</p>}
      <ul className="space-y-2">
        {vaccines.map((v) => (
          <VaccineRow key={v.id} petId={pet.id} vaccine={v} today={today} />
        ))}
      </ul>

      {adding ? (
        <VaccineForm pet={pet} catalog={catalog} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Registrar vacina
        </Button>
      )}

      <p className="text-[10px] leading-snug text-muted-foreground">{PET_VACCINE_SOURCES}</p>
    </div>
  );
}

function VaccineRow({ petId, vaccine, today }: { petId: string; vaccine: PetVaccine; today: Date }) {
  const { toast } = useToast();
  const userId = useUserId();
  const days = vaccine.nextDate ? differenceInCalendarDays(parseIso(vaccine.nextDate), today) : undefined;

  const remove = async () => {
    try {
      await deletePetVaccine(vaccine.id);
      refresh(userId, "petVaccines");
    } catch (err) {
      toast({ title: "Não foi possível apagar", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <li className="flex items-start gap-2 rounded-lg bg-secondary/50 p-2.5 text-sm" data-testid="pet-vaccine-row">
      <div className="flex-1 min-w-0">
        <p className="font-medium">{vaccine.vaccine}</p>
        <p className="text-xs text-muted-foreground">
          Dose: {fmt(vaccine.doseDate)}
          {vaccine.nextDate && (
            <>
              {" · "}Próxima: {fmt(vaccine.nextDate)} ({days !== undefined && daysLabel(days)})
            </>
          )}
          {vaccine.batch ? ` · lote ${vaccine.batch}` : ""}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={remove} aria-label={`Apagar ${vaccine.vaccine}`}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

function VaccineForm({ pet, catalog, onDone }: { pet: Pet; catalog: string[]; onDone: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [choice, setChoice] = useState(catalog[0] ?? OUTRA);
  const [custom, setCustom] = useState("");
  const [doseDate, setDoseDate] = useState<string | undefined>(toIso(new Date()));
  const [nextDate, setNextDate] = useState<string | undefined>(undefined);
  const [batch, setBatch] = useState("");
  const [saving, setSaving] = useState(false);

  const vaccineName = choice === OUTRA ? custom.trim() : choice;

  // Sugere a próxima dose a cada mudança de vacina ou de data da dose; a usuária pode trocar.
  const recalc = (vac: string, dose?: string) => {
    setNextDate(dose && vac ? suggestNextDose(pet, vac, dose) : undefined);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!vaccineName || !doseDate) return;
    setSaving(true);
    try {
      await savePetVaccine({ petId: pet.id, vaccine: vaccineName, doseDate, nextDate, batch: batch.trim() || undefined });
      refresh(userId, "petVaccines");
      toast({ title: "Vacina registrada!", description: nextDate ? `Próxima dose em ${fmt(nextDate)}.` : undefined });
      onDone();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-muted/40 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="vac-name">Vacina *</Label>
        <NativeSelect
          id="vac-name"
          value={choice}
          onChange={(e) => {
            setChoice(e.target.value);
            recalc(e.target.value === OUTRA ? custom.trim() : e.target.value, doseDate);
          }}
        >
          {catalog.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={OUTRA}>Outra</option>
        </NativeSelect>
      </div>
      {choice === OUTRA && (
        <div className="space-y-1.5">
          <Label htmlFor="vac-custom">Nome da vacina *</Label>
          <Input
            id="vac-custom"
            placeholder="Ex.: Raiva de outro laboratório"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              recalc(e.target.value.trim(), doseDate);
            }}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="vac-dose">Data da dose *</Label>
          <DateInputBR
            id="vac-dose"
            value={doseDate}
            onChange={(iso) => {
              setDoseDate(iso || undefined);
              recalc(vaccineName, iso || undefined);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vac-next">Próxima dose</Label>
          <DateInputBR id="vac-next" value={nextDate} onChange={(iso) => setNextDate(iso || undefined)} />
        </div>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Sugerimos o reforço em 12 meses. Para filhote, até 16 semanas, a sugestão é 21 dias (série de reforços). Ajuste conforme a orientação do veterinário.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="vac-batch">Lote (opcional)</Label>
        <Input id="vac-batch" value={batch} onChange={(e) => setBatch(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !vaccineName || !doseDate}>
          Salvar vacina
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Cio (fêmeas não castradas)
// ---------------------------------------------------------------

function HeatSection({ pet }: { pet: Pet }) {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: allHeats = [] } = usePetHeats();
  const heats = allHeats.filter((h) => h.petId === pet.id);
  const [starting, setStarting] = useState(false);
  const [startDate, setStartDate] = useState<string | undefined>(toIso(new Date()));
  const current = openHeat(heats);
  const forecast = heatForecast(pet, heats);

  const endCurrent = async () => {
    if (!current) return;
    try {
      await savePetHeat({ petId: pet.id, startDate: current.startDate, endDate: toIso(new Date()), notes: current.notes }, current.id);
      refresh(userId, "petHeats");
      toast({ title: "Cio encerrado. Registro salvo!" });
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    }
  };

  const startHeat = async (e: FormEvent) => {
    e.preventDefault();
    if (!startDate) return;
    try {
      await savePetHeat({ petId: pet.id, startDate });
      refresh(userId, "petHeats");
      setStarting(false);
      toast({ title: "Cio registrado!" });
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    }
  };

  const removeHeat = async (h: PetHeat) => {
    try {
      await deletePetHeat(h.id);
      refresh(userId, "petHeats");
    } catch (err) {
      toast({ title: "Não foi possível apagar", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2" data-testid="pet-heat-section">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Cio</p>

      {pet.species === "gato" ? (
        <p className="text-xs text-muted-foreground">
          Gatas entram no cio em episódios curtos e frequentes na temporada, então o app não prevê a data. Registre cada episódio.
        </p>
      ) : forecast ? (
        <p className="text-sm">
          Próximo cio previsto: <span className="font-medium">{format(parseIso(forecast.nextDate), "dd/MM/yyyy")}</span>{" "}
          <span className="text-muted-foreground">({daysLabel(forecast.days)})</span>
          <span className="block text-[11px] text-muted-foreground">
            {forecast.basedOnHistory
              ? `Média dos últimos cios: a cada ${forecast.intervalDays} dias.`
              : `Estimativa inicial de ${forecast.intervalDays} dias. Fica mais precisa com mais registros.`}
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Registre o primeiro cio para começar a prever o próximo.</p>
      )}

      {current ? (
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5 text-sm">
          <span className="flex-1">Em cio desde {fmt(current.startDate)}</span>
          <Button size="sm" onClick={endCurrent}>
            Terminou o cio
          </Button>
        </div>
      ) : starting ? (
        <form onSubmit={startHeat} className="space-y-3 rounded-xl bg-muted/40 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="heat-start">Início do cio *</Label>
            <DateInputBR id="heat-start" value={startDate} onChange={(iso) => setStartDate(iso || undefined)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setStarting(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!startDate}>
              Salvar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setStarting(true)}>
          <Plus className="h-4 w-4" /> Registrar início do cio
        </Button>
      )}

      {heats.length > 0 && (
        <ul className="space-y-1">
          {heats.slice(0, 6).map((h) => (
            <li key={h.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex-1">
                {fmt(h.startDate)} {h.endDate ? `até ${fmt(h.endDate)}` : "(em andamento)"}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHeat(h)} aria-label="Apagar registro de cio">
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-snug text-muted-foreground">
        Sangramento e inquietação podem fazer parte do cio. Procure o veterinário se houver febre, corrimento com mau cheiro ou sangramento
        muito intenso. A previsão é aproximada.
      </p>
    </div>
  );
}
