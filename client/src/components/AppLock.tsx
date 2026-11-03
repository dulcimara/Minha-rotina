import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Lock, ScanFace } from "lucide-react";
import { useAuth, displayName } from "@/hooks/use-auth";
import { lockConfig, markHidden, shouldRelock, unlock } from "@/lib/applock";
import { useAppIcon } from "@/lib/palettes";

const isApple = () => /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent);

/**
 * Tela de bloqueio por cima do app (o app continua rodando por baixo, para os avisos tocarem).
 * Trava ao abrir e quando a pessoa volta depois do tempo escolhido em Configurações.
 */
export function AppLock({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const icon = useAppIcon();
  const [locked, setLocked] = useState(() => Boolean(lockConfig(userId)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // trocou de conta: confere de novo
  useEffect(() => setLocked(Boolean(lockConfig(userId))), [userId]);

  useEffect(() => {
    const onVis = () => {
      if (!userId) return;
      if (document.visibilityState === "hidden") markHidden();
      else if (shouldRelock(userId)) setLocked(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [userId]);

  const tryUnlock = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      if (await unlock(userId)) setLocked(false);
    } catch (err) {
      const name = (err as Error).name;
      setError(
        name === "NotAllowedError"
          ? "Não foi possível confirmar. Toque para tentar de novo."
          : "O desbloqueio do celular não respondeu. Tente de novo ou entre com a senha.",
      );
    } finally {
      setBusy(false);
    }
  }, [userId]);

  // No Android já pede ao abrir; no iPhone o Safari exige um toque antes.
  useEffect(() => {
    if (locked && !isApple()) void tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const Icon = isApple() ? ScanFace : Fingerprint;
  const name = displayName(user);

  return (
    <>
      {children}
      {locked && userId && (
        <div
          className="pointer-events-auto fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-background p-8 text-center"
          role="dialog"
          aria-modal="true"
          aria-label="App travado"
          data-testid="app-lock"
        >
          <img src={icon} alt="" className="h-20 w-20 drop-shadow-[0_10px_18px_rgb(0_0_0/0.15)]" />
          <div className="space-y-1">
            <p className="font-brand text-2xl">Minha Rotina</p>
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> {name ? `Olá, ${name}! ` : ""}O app está travado.
            </p>
          </div>
          <Button size="lg" className="h-14 gap-2 px-8 text-base" onClick={tryUnlock} disabled={busy} data-testid="button-unlock">
            <Icon className="h-6 w-6" /> {busy ? "Confirmando..." : "Desbloquear"}
          </Button>
          {error && <p className="max-w-xs text-sm text-destructive">{error}</p>}
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline"
            onClick={() => {
              if (window.confirm("Sair da conta neste aparelho? Para voltar, entre com e-mail e senha.")) void signOut();
            }}
          >
            Entrar com e-mail e senha
          </button>
        </div>
      )}
    </>
  );
}
