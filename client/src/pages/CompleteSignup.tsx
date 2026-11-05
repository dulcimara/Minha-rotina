import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInputBR } from "@/components/DateInputBR";
import { useAppIcon } from "@/lib/palettes";
import { supabase } from "@/lib/supabase";
import { validBirthDate } from "@/lib/calories";
import { useAuth } from "@/hooks/use-auth";

/**
 * Quem entra pela primeira vez com o Google não passou pelo formulário de cadastro.
 * Aqui pedimos o que falta (nascimento e aceite da política) antes de abrir o app.
 */
export default function CompleteSignup() {
  const appIcon = useAppIcon();
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as { name?: string; full_name?: string; nickname?: string; birth_date?: string };
  const googleName = (meta.full_name || meta.name || "").trim();

  const [name, setName] = useState(googleName);
  const [nickname, setNickname] = useState(meta.nickname ?? "");
  const [birthDate, setBirthDate] = useState(meta.birth_date ?? "");
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Informe seu nome.");
    if (!validBirthDate(birthDate)) return setError("Informe sua data de nascimento.");
    if (!accepted) return setError("Para continuar, aceite a política de privacidade.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        name: name.trim(),
        // O Google pode atualizar o "nome" a cada entrada; o apelido é só nosso.
        nickname: nickname.trim() || name.trim().split(/\s+/)[0],
        birth_date: birthDate,
        privacy_accepted_at: new Date().toISOString(),
      },
    });
    setSaving(false);
    if (error) setError("Não foi possível salvar. Tente de novo.");
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="text-center space-y-2">
          <img src={appIcon} alt="" className="h-16 w-16 mx-auto" />
          <h1 className="font-brand text-2xl text-foreground">Falta pouco!</h1>
          <p className="text-sm text-muted-foreground">Confira seus dados para terminar o cadastro.</p>
        </div>

        <form onSubmit={submit} className="space-y-4" data-testid="form-complete-signup">
          <div className="space-y-2">
            <Label htmlFor="cs-name">Seu nome *</Label>
            <Input id="cs-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cs-nickname">
              Como quer ser chamada? <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input id="cs-nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex.: Cida" />
            <p className="text-xs text-muted-foreground">É assim que o app vai te chamar nos avisos falados.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cs-birth">Data de nascimento *</Label>
            <DateInputBR id="cs-birth" value={birthDate} onChange={setBirthDate} autoComplete="bday" required />
            <p className="text-xs text-muted-foreground">Usada para estimar as calorias que você precisa por dia.</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              data-testid="checkbox-complete-privacy"
            />
            <span>
              Li e aceito a{" "}
              <a href="/privacidade" target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                política de privacidade
              </a>
              .
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={saving || !name.trim() || !birthDate || !accepted}>
            {saving ? "Aguarde..." : "Começar"}
          </Button>
        </form>

        <button
          type="button"
          className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => void supabase.auth.signOut()}
        >
          Sair e usar outra conta
        </button>
      </Card>
    </div>
  );
}
