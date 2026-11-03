import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type Mode = "entrar" | "cadastrar";

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  if (m.includes("already registered")) return "Este e-mail já tem cadastro. Use \"Entrar\".";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  return message;
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!name.trim()) throw new Error("Informe seu nome.");
        if (!accepted) throw new Error("Para criar a conta, aceite a política de privacidade.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim(), nickname: nickname.trim() || undefined, privacy_accepted_at: new Date().toISOString() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // Se a confirmação de e-mail estiver ligada no Supabase, não há sessão ainda.
        if (!data.session) {
          setInfo("Conta criada! Enviamos um link para o seu e-mail. Clique nele e depois volte aqui para entrar.");
          setMode("entrar");
        }
      }
    } catch (err) {
      setError(translateError((err as Error).message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="text-center space-y-2">
          <img src="/icon-192.png" alt="" className="h-20 w-20 mx-auto drop-shadow-[0_10px_18px_rgb(120_40_140/0.3)]" />
          <h1 className="font-brand text-3xl text-foreground">Minha Rotina</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "entrar" ? "Entre para ver sua rotina" : "Crie sua conta gratuita"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "cadastrar" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Seu nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Maria Aparecida Souza"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">
                  Como quer ser chamada? <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex.: Cida"
                  autoComplete="nickname"
                />
                <p className="text-xs text-muted-foreground">É assim que o app vai te chamar nos avisos falados.</p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </div>

          {mode === "cadastrar" && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                data-testid="checkbox-privacy"
              />
              <span>
                Li e aceito a{" "}
                <a href="/privacidade" target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                  política de privacidade
                </a>
                .
              </span>
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-primary">{info}</p>}

          <Button type="submit" className="w-full" disabled={loading || (mode === "cadastrar" && (!name.trim() || !accepted))}>
            {loading ? "Aguarde..." : mode === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "entrar" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
          <button
            type="button"
            className="text-primary font-medium underline-offset-4 hover:underline"
            onClick={() => {
              setMode(mode === "entrar" ? "cadastrar" : "entrar");
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "entrar" ? "Cadastre-se" : "Entrar"}
          </button>
        </p>
      </Card>
    </div>
  );
}
