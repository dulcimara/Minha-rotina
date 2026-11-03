import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BellRing, Check, LogOut, Megaphone, Music, Play, Settings, User, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { displayName, useAuth } from "@/hooks/use-auth";
import { notificationsStatus, requestNotifications, testAlert } from "@/hooks/use-alerts";
import { readSettings, saveSettings, type AlertMode } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const MODES: { value: AlertMode; title: string; text: string; icon: typeof Music }[] = [
  { value: "voice", title: "Som e aviso falado", text: "Um toque curto e a voz diz o compromisso, o horário e o endereço.", icon: Megaphone },
  { value: "sound", title: "Somente som", text: "Toca uma melodia, sem falar nada.", icon: Music },
  { value: "silent", title: "Silencioso", text: "Sem som: só a janela na tela e a notificação.", icon: VolumeX },
];

/** Configurações da conta: como chamar a pessoa e como os avisos tocam. */
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const settings = readSettings(user);
  const meta = (user?.user_metadata ?? {}) as { name?: string; nickname?: string };
  const [name, setName] = useState(meta.name ?? "");
  const [nickname, setNickname] = useState(meta.nickname ?? "");
  const [notif, setNotif] = useState(notificationsStatus());

  const save = (patch: Parameters<typeof saveSettings>[0]) =>
    saveSettings(patch).catch((err) =>
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" }),
    );

  const saveName = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim(), nickname: nickname.trim() || null } });
    if (error) toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Nome salvo!" });
  };

  const nameChanged = name.trim() !== (meta.name ?? "") || nickname.trim() !== (meta.nickname ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        data-testid="dialog-settings"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative overflow-hidden rounded-2xl bg-hero p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-mic text-white flex items-center justify-center">
              <Settings className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Configurações</p>
              <DialogTitle className="text-lg font-display font-semibold">Sua conta</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">{user?.email}</DialogDescription>
            </div>
          </div>
        </div>

        {/* Nome */}
        <section className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Como o app te chama
          </h3>
          <div className="space-y-1.5">
            <Label htmlFor="set-name">Nome *</Label>
            <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-nick">
              Como quer ser chamada <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input id="set-nick" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex.: Cida" />
          </div>
          {nameChanged && (
            <Button size="sm" onClick={saveName} disabled={!name.trim()}>
              Salvar nome
            </Button>
          )}
        </section>

        {/* Avisos */}
        <section className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" /> Avisos dos compromissos
          </h3>
          <div className="grid gap-2" role="radiogroup" aria-label="Tipo de aviso">
            {MODES.map(({ value, title, text, icon: Icon }) => {
              const active = settings.alertMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => save({ alertMode: value })}
                  data-testid={`alert-mode-${value}`}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    active ? "border-primary bg-secondary/60" : "bg-card hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-xl flex items-center justify-center",
                      active ? "bg-mic text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{text}</p>
                  </div>
                  {active && <Check className="h-4 w-4 text-primary mt-1" />}
                </button>
              );
            })}
          </div>

          {settings.alertMode === "voice" && (
            <div className="grid grid-cols-2 gap-2">
              {(["female", "male"] as const).map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={settings.voiceGender === g ? "default" : "outline"}
                  onClick={() => save({ voiceGender: g })}
                >
                  Voz {g === "female" ? "feminina" : "masculina"}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
            <Label htmlFor="set-vibrate" className="cursor-pointer">Vibrar o celular</Label>
            <Switch id="set-vibrate" checked={settings.vibrate} onCheckedChange={(v) => save({ vibrate: v })} />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => testAlert(settings.alertMode, settings.voiceGender, displayName(user))}
            disabled={settings.alertMode === "silent"}
          >
            <Play className="h-4 w-4" /> Ouvir um exemplo
          </Button>

          <div className="rounded-xl bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">Notificações neste aparelho</p>
            {notif === "granted" ? (
              <p className="text-xs text-muted-foreground">✅ Permitidas. O aviso aparece mesmo com o app minimizado.</p>
            ) : notif === "denied" ? (
              <p className="text-xs text-muted-foreground">
                Bloqueadas pelo navegador. Para liberar, abra as configurações do site (o cadeado ao lado do endereço).
              </p>
            ) : notif === "unsupported" ? (
              <p className="text-xs text-muted-foreground">Este navegador não mostra notificações. No iPhone, instale o app na tela inicial.</p>
            ) : (
              <Button size="sm" onClick={async () => setNotif((await requestNotifications()) as typeof notif)}>
                Permitir notificações
              </Button>
            )}
          </div>
        </section>

        <Button variant="ghost" className="w-full gap-2 text-destructive" onClick={() => signOut()} data-testid="button-logout">
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
      </DialogContent>
    </Dialog>
  );
}
