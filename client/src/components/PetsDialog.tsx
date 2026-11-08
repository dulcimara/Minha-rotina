import { useState, type FormEvent } from "react";
import { differenceInYears } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInputBR } from "@/components/DateInputBR";
import { NativeSelect } from "@/components/NativeSelect";
import { AppIcon } from "@/components/AppIcons";
import { formatPhone } from "@/lib/utils";
import { ChevronDown, ChevronUp, Pencil, Phone, Plus, Stethoscope, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, usePets, useUserId } from "@/hooks/use-data";
import { deletePet, savePet, type Pet, type Sex } from "@/lib/data";

const SPECIES = ["Cachorro", "Gato", "Pássaro", "Peixe", "Outro"];

function petAge(birthDate?: string): string | undefined {
  if (!birthDate) return undefined;
  const [y, m, d] = birthDate.split("-").map(Number);
  const years = differenceInYears(new Date(), new Date(y, m - 1, d));
  return years >= 1 ? `${years} ${years === 1 ? "ano" : "anos"}` : "menos de 1 ano";
}

function PetForm({ pet, onDone }: { pet?: Pet; onDone: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [p, setP] = useState<Omit<Pet, "id">>(() => ({ name: "", ...(pet ?? {}) }));
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Pet) => (e: { target: { value: string } }) => setP({ ...p, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!p.name.trim()) return;
    setSaving(true);
    try {
      await savePet(p, pet?.id);
      refresh(userId, "pets");
      toast({ title: pet ? "Dados atualizados!" : `${p.name} foi cadastrado(a)!` });
      onDone();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof Pet, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pet-${k}`}>{label}</Label>
      <Input id={`pet-${k}`} value={((p as Partial<Pet>)[k] as string) ?? ""} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl bg-muted/40 p-3">
      {field("name", "Nome *", { autoFocus: true, placeholder: "Ex.: Thor" })}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pet-species">Espécie</Label>
          <NativeSelect id="pet-species" value={p.species ?? ""} onChange={set("species")}>
            <option value="">Escolha</option>
            {SPECIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </NativeSelect>
        </div>
        {field("breed", "Raça", { placeholder: "Ex.: Labrador" })}
      </div>
      <div className="space-y-2">
        <Label>Sexo</Label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Sexo do pet">
          {(["feminino", "masculino"] as const).map((s: Sex) => (
            <Button
              key={s}
              type="button"
              role="radio"
              aria-checked={p.sex === s}
              variant={p.sex === s ? "default" : "outline"}
              onClick={() => setP({ ...p, sex: s })}
            >
              {s === "feminino" ? "Fêmea" : "Macho"}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pet-birthDate">Data de nascimento</Label>
          <DateInputBR id="pet-birthDate" value={p.birthDate} onChange={(iso) => setP({ ...p, birthDate: iso || undefined })} />
        </div>
        {field("vet", "Veterinário(a)", { placeholder: "Dr. Paulo" })}
      </div>
      {field("vetPhone", "Telefone da clínica", { type: "tel", inputMode: "tel", placeholder: "(61) 9..." })}
      <div className="space-y-1.5">
        <Label htmlFor="pet-allergies">Alergias e cuidados</Label>
        <Textarea id="pet-allergies" rows={2} value={p.allergies ?? ""} onChange={set("allergies")} placeholder="Ex.: não pode comer frango" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pet-notes">Observações</Label>
        <Textarea id="pet-notes" rows={2} value={p.notes ?? ""} onChange={set("notes")} placeholder="Vacinas, banho, ração..." />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={saving || !p.name.trim()} data-testid="button-pet-save">Salvar</Button>
      </div>
    </form>
  );
}

function PetCard({ pet, onEdit }: { pet: Pet; onEdit: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const age = petAge(pet.birthDate);
  const sub = [pet.species, pet.breed, age].filter(Boolean).join(" · ");

  return (
    <div className="rounded-xl border bg-card p-3">
      <button type="button" className="w-full flex items-center gap-3 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <AppIcon name="pets" className="h-12 w-12" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{pet.name}</p>
          <p className="text-xs text-muted-foreground">{sub || "Toque para ver os dados"}</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t pt-3 text-sm">
          {pet.sex && <p>{pet.sex === "feminino" ? "Fêmea" : "Macho"}</p>}
          {pet.vet && (
            <p className="flex items-start gap-2">
              <Stethoscope className="h-4 w-4 mt-0.5 text-primary shrink-0" /> {pet.vet}
            </p>
          )}
          {pet.vetPhone && (
            <p className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <a href={`tel:${pet.vetPhone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">{formatPhone(pet.vetPhone)}</a>
            </p>
          )}
          {pet.allergies && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">⚠️ {pet.allergies}</p>}
          {pet.notes && <p className="text-muted-foreground whitespace-pre-line">{pet.notes}</p>}
          <div className="flex justify-end gap-1 pt-1">
            <Button variant="ghost" size="sm" className="gap-1" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive"
              onClick={async () => {
                if (!window.confirm(`Apagar o cadastro de ${pet.name}?`)) return;
                try {
                  await deletePet(pet.id);
                  refresh(userId, "pets");
                } catch (err) {
                  toast({ title: "Não foi possível apagar", description: (err as Error).message, variant: "destructive" });
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Apagar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Janela "Meus pets" (aberta pelo botão de patinha no topo). */
export function PetsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: pets = [] } = usePets();
  const [editing, setEditing] = useState<Pet | "new" | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setEditing(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-pets">
        <div className="flex items-center gap-3 rounded-2xl bg-hero p-4">
          <AppIcon name="pets" className="h-14 w-14" />
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Família</p>
            <DialogTitle className="text-lg font-display font-semibold">Meus pets</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Veterinário, vacinas e cuidados do seu bichinho.
            </DialogDescription>
          </div>
        </div>

        {editing ? (
          <PetForm pet={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        ) : (
          <>
            <Button onClick={() => setEditing("new")} className="w-full gap-1" data-testid="button-new-pet">
              <Plus className="h-4 w-4" /> Adicionar pet
            </Button>
            {pets.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum pet cadastrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {pets.map((p) => (
                  <PetCard key={p.id} pet={p} onEdit={() => setEditing(p)} />
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
