import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  BellRing,
  Check,
  Download,
  Droplet,
  FileText,
  LogOut,
  Megaphone,
  Music,
  Palette as PaletteIcon,
  Play,
  Settings,
  Smartphone,
  Sunrise,
  Trash2,
  User,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { displayName, useAuth } from "@/hooks/use-auth";
import { testAlert } from "@/hooks/use-alerts";
import { useActivities, useBirthdays, useDoses, useMedications } from "@/hooks/use-data";
import { readSettings, saveSettings, type AlertMode } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { disablePush, enablePush, pushHelp, pushState, type PushState } from "@/lib/push";
import { deleteMyAccount, exportMyData } from "@/lib/data";
import { morningSummary } from "@/lib/morning";
import { speak } from "@/lib/speech";
import { PalettePicker } from "@/components/PalettePicker";
import { cn } from "@/lib/utils";

const MODES: { value: AlertMode; title: string; text: string; icon: typeof Music }[] = [
  { value: "voice", title: "Som e aviso falado", text: "Um toque curto e a voz diz o compromisso, o horário e o endereço.", icon: Megaphone },
  { value: "sound", title: "Somente som", text: "Toca uma melodia, sem falar nada.", icon: Music },
  { value: "silent", title: "Silencioso", text: "Sem som: só a janela na tela e a notificação.", icon: VolumeX },
];

function Section({ icon: Icon, title, children }: { icon: typeof Music; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h3>
      {children}
    </section>
  );
}

function ToggleRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/50 p-3">
      <div>
        <Label htmlFor={id} className="cursor-pointer">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Configurações da conta. */
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const settings = readSettings(user);
  const meta = (user?.user_metadata ?? {}) as { name?: string; nickname?: string };
  const [name, setName] = useState(meta.name ?? "");
  const [nickname, setNickname] = useState(meta.nickname ?? "");
  const [push, setPush] = useState<PushState>("off");
  const [busy, setBusy] = useState(false);
  const { data: activities = [] } = useActivities();
  const { data: birthdays = [] } = useBirthdays();
  const { data: meds = [] } = useMedications();
  const { data: doses = [] } = useDoses();

  useEffect(() => {
    if (open) void pushState().then(setPush);
  }, [open]);

  const fail = (err: unknown) =>
    toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
  const save = (patch: Parameters<typeof saveSettings>[0]) => saveSettings(patch).catch(fail);

  const saveName = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim(), nickname: nickname.trim() || null } });
    if (error) fail(error);
    else toast({ title: "Nome salvo!" });
  };
  const nameChanged = name.trim() !== (meta.name ?? "") || nickname.trim() !== (meta.nickname ?? "");

  const togglePush = async (on: boolean) => {
    setBusy(true);
    try {
      setPush(on ? await enablePush() : await disablePush());
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    try {
      const blob = await exportMyData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `minha-rotina-meus-dados.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      fail(err);
    }
  };

  const removeAccount = async () => {
    const typed = window.prompt(
      "Isso apaga sua conta e TODOS os seus dados (compromissos, listas, ciclo, remédios...). Não dá para desfazer.\n\nPara confirmar, digite APAGAR:",
    );
    if (typed?.trim().toUpperCase() !== "APAGAR") return;
    try {
      await deleteMyAccount();
      toast({ title: "Conta apagada", description: "Seus dados foram removidos." });
    } catch (err) {
      fail(err);
    }
  };

  const summaryText = () =>
    morningSummary({ name: displayName(user), activities, birthdays, meds, doses });

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

        <Section icon={User} title="Como o app te chama">
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
        </Section>

        <Section icon={PaletteIcon} title="Cores do app">
          <PalettePicker value={settings.palette} onChange={(palette) => save({ palette })} />
        </Section>

        <Section icon={BellRing} title="Avisos dos compromissos">
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
                  <div className={cn("h-9 w-9 shrink-0 rounded-xl flex items-center justify-center", active ? "bg-mic text-white" : "bg-muted text-muted-foreground")}>
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
                <Button key={g} type="button" variant={settings.voiceGender === g ? "default" : "outline"} onClick={() => save({ voiceGender: g })}>
                  Voz {g === "female" ? "feminina" : "masculina"}
                </Button>
              ))}
            </div>
          )}
          <ToggleRow id="set-vibrate" label="Vibrar o celular" checked={settings.vibrate} onChange={(v) => save({ vibrate: v })} />
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => testAlert(settings.alertMode, settings.voiceGender, displayName(user))}
            disabled={settings.alertMode === "silent"}
          >
            <Play className="h-4 w-4" /> Ouvir um exemplo
          </Button>
        </Section>

        <Section icon={Smartphone} title="Avisos com o app fechado">
          <ToggleRow
            id="set-push"
            label="Receber notificações neste aparelho"
            hint={pushHelp[push]}
            checked={push === "on"}
            onChange={(v) => !busy && void togglePush(v)}
          />
          <p className="text-xs text-muted-foreground">
            Com o app fechado o celular toca o som de notificação dele; a voz fala quando o app está aberto.
          </p>
        </Section>

        <Section icon={Sunrise} title="Resumo da manhã">
          <ToggleRow
            id="set-morning"
            label="Receber o resumo do dia"
            hint="Uma notificação no horário escolhido; ao tocar, o app lê o seu dia em voz alta."
            checked={settings.morningSummary}
            onChange={(v) => save({ morningSummary: v })}
          />
          {settings.morningSummary && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="set-morning-time">Horário</Label>
                <Input
                  id="set-morning-time"
                  type="time"
                  defaultValue={settings.morningTime}
                  onBlur={(e) => e.target.value && e.target.value !== settings.morningTime && save({ morningTime: e.target.value })}
                />
              </div>
              <Button variant="outline" className="gap-2" onClick={() => speak(summaryText(), settings.voiceGender)}>
                <Play className="h-4 w-4" /> Ouvir agora
              </Button>
            </div>
          )}
        </Section>

        <Section icon={Droplet} title="Ciclo">
          <ToggleRow
            id="set-cycle-alert"
            label="Avisar 2 dias antes da menstruação prevista"
            hint="O aviso aparece com texto discreto (“Lembrete do ciclo”), inclusive na tela bloqueada."
            checked={settings.cycleAlert}
            onChange={(v) => save({ cycleAlert: v })}
          />
          <ToggleRow
            id="set-fertile"
            label="Mostrar período fértil estimado"
            hint="Estimativa pela média dos ciclos. Não serve como método para evitar gravidez."
            checked={settings.showFertile}
            onChange={(v) => save({ showFertile: v })}
          />
        </Section>

        <Section icon={FileText} title="Seus dados">
          <a href="/privacidade" target="_blank" rel="noreferrer" className="block text-sm text-primary underline-offset-4 hover:underline">
            Política de privacidade
          </a>
          <Button variant="outline" className="w-full gap-2" onClick={download} data-testid="button-export">
            <Download className="h-4 w-4" /> Baixar meus dados
          </Button>
          <Button variant="outline" className="w-full gap-2 text-destructive" onClick={removeAccount} data-testid="button-delete-account">
            <Trash2 className="h-4 w-4" /> Apagar minha conta e meus dados
          </Button>
        </Section>

        <Button variant="ghost" className="w-full gap-2" onClick={() => signOut()} data-testid="button-logout">
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
      </DialogContent>
    </Dialog>
  );
}
