import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/NativeSelect";
import { useAuth, displayName } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { disableLock, enableLock, lockConfig, lockSupported, setRelockAfter, unlock, type RelockAfter } from "@/lib/applock";

/** Configurações > Segurança: pedir Face ID / digital / PIN do celular para abrir o app. */
export function LockSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [cfg, setCfg] = useState(() => lockConfig(user?.id));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void lockSupported().then(setSupported);
  }, []);

  if (!user) return null;
  if (supported === false) {
    return (
      <p className="text-sm text-muted-foreground">
        Este aparelho ou navegador não oferece desbloqueio por rosto, digital ou PIN para sites. No celular, use o Chrome
        (Android) ou o Safari / app instalado (iPhone), com uma trava de tela configurada.
      </p>
    );
  }

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) {
        await enableLock({ id: user.id, email: user.email ?? undefined, name: displayName(user) });
        toast({ title: "Trava ligada 🔒", description: "Na próxima vez que abrir, o app vai pedir o seu rosto, digital ou PIN." });
      } else {
        // para desligar, confirma que é a dona do celular
        if (!(await unlock(user.id))) return;
        disableLock(user.id);
        toast({ title: "Trava desligada" });
      }
      setCfg(lockConfig(user.id));
    } catch (err) {
      const name = (err as Error).name;
      toast({
        title: "Não foi possível",
        description: name === "NotAllowedError" ? "O desbloqueio foi cancelado." : (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/50 p-3">
        <div>
          <Label htmlFor="app-lock" className="cursor-pointer">
            Pedir Face ID, digital ou PIN ao abrir
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Usa o desbloqueio do próprio celular. O app não vê nem guarda seu rosto ou digital. Vale só para este aparelho.
          </p>
        </div>
        <Switch id="app-lock" checked={Boolean(cfg)} disabled={busy || supported === null} onCheckedChange={toggle} data-testid="switch-app-lock" />
      </div>
      {cfg && (
        <div className="space-y-1.5">
          <Label htmlFor="relock">Travar de novo depois de sair do app por</Label>
          <NativeSelect
            id="relock"
            value={cfg.relockAfter}
            onChange={(e) => {
              setRelockAfter(user.id, Number(e.target.value) as RelockAfter);
              setCfg(lockConfig(user.id));
            }}
          >
            <option value={0}>Na hora (sempre que sair)</option>
            <option value={1}>1 minuto</option>
            <option value={5}>5 minutos</option>
            <option value={15}>15 minutos</option>
          </NativeSelect>
        </div>
      )}
    </div>
  );
}
