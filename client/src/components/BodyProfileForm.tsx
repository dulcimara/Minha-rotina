import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { readProfile, saveProfile, validBirthDate, type Sex } from "@/lib/calories";

/** Data de nascimento, sexo e peso: usados só para estimar calorias. Salva ao mudar. */
export function BodyProfileForm({ compact }: { compact?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const p = readProfile(user);
  const [birth, setBirth] = useState(p.birthDate ?? "");
  const [weight, setWeight] = useState(p.weightKg ? String(p.weightKg).replace(".", ",") : "");

  const save = (patch: Parameters<typeof saveProfile>[0]) =>
    saveProfile(patch).catch((err) => toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" }));

  const setSex = (sex: Sex) => void save({ sex });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bp-birth">Nascimento</Label>
          <Input
            id="bp-birth"
            type="date"
            min="1900-01-01"
            max={new Date().toISOString().slice(0, 10)}
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
            onBlur={() => {
              if (birth !== (p.birthDate ?? "") && (birth === "" || validBirthDate(birth))) void save({ birthDate: birth || undefined });
            }}
            data-testid="input-profile-birth"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-weight">Peso (kg)</Label>
          <Input
            id="bp-weight"
            inputMode="decimal"
            value={weight}
            placeholder="Ex.: 62"
            onChange={(e) => setWeight(e.target.value.replace(/[^\d,.]/g, ""))}
            onBlur={() => {
              const n = Number(weight.replace(",", "."));
              if (weight === "") void save({ weightKg: undefined });
              else if (n >= 25 && n <= 350 && n !== p.weightKg) void save({ weightKg: Math.round(n * 10) / 10 });
            }}
            data-testid="input-profile-weight"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Sexo (para a tabela de calorias)</Label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(["feminino", "masculino"] as Sex[]).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              role="radio"
              aria-checked={p.sex === s}
              variant={p.sex === s ? "default" : "outline"}
              onClick={() => setSex(s)}
            >
              {s === "feminino" ? "Feminino" : "Masculino"}
            </Button>
          ))}
        </div>
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Usados só para estimar as calorias gastas nos exercícios e a sua necessidade diária. Ficam na sua conta e você pode
          apagar quando quiser.
        </p>
      )}
    </div>
  );
}
