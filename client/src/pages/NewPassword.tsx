import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppIcon } from "@/lib/palettes";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

/**
 * Tela aberta pelo link do e-mail "Esqueci minha senha".
 * O Supabase lê o link e cria uma sessão temporária; aqui a pessoa escolhe a nova senha.
 */
export default function NewPassword() {
  const appIcon = useAppIcon();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const goHome = () => window.location.replace("/");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As duas senhas não estão iguais.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      const m = error.message.toLowerCase();
      setError(
        m.includes("different from the old")
          ? "A nova senha precisa ser diferente da antiga."
          : "Não foi possível trocar a senha. Peça um novo link e tente de novo.",
      );
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="text-center space-y-2">
          <img src={appIcon} alt="" className="h-16 w-16 mx-auto" />
          <h1 className="font-brand text-2xl text-foreground">Nova senha</h1>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Carregando...</p>
        ) : done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm">Pronto! Sua senha foi trocada.</p>
            <Button className="w-full" onClick={goHome}>
              Abrir o app
            </Button>
          </div>
        ) : !session ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Este link expirou ou já foi usado. Volte para a tela de entrada, toque em "Esqueci minha senha" e peça um novo.
            </p>
            <Button className="w-full" onClick={goHome}>
              Voltar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Repita a nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Aguarde..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
