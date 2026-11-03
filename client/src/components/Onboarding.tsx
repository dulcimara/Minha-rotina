import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BellPlus, BellRing, Check, Download, Mic, Palette as PaletteIcon, Share, Smartphone } from "lucide-react";
import { displayName, useAuth } from "@/hooks/use-auth";
import { readSettings, saveSettings } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { enablePush, pushHelp, type PushState } from "@/lib/push";
import { PalettePicker } from "@/components/PalettePicker";
import { VOICE_EXAMPLES } from "@/lib/voice-parser";
import { cn } from "@/lib/utils";
import { OnboardingReminders, savePicks, type ReminderPicks } from "@/components/OnboardingReminders";
import { refresh, useUserId } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { InstallContent } from "@/components/InstallApp";

const STEPS = [
  { icon: PaletteIcon, title: "Escolha as suas cores" },
  { icon: BellPlus, title: "Seus lembretes" },
  { icon: Mic, title: "Fale com o app" },
  { icon: BellRing, title: "Avisos na hora certa" },
  { icon: Smartphone, title: "Instale no celular" },
];

/** Boas-vindas em 5 passos, mostradas uma vez por conta. */
export function Onboarding() {
  const { user } = useAuth();
  const done = Boolean((user?.user_metadata as { onboarded_at?: string } | undefined)?.onboarded_at);
  const [open, setOpen] = useState(!done);
  const [step, setStep] = useState(0);
  const [palette, setPalette] = useState(readSettings(user).palette);
  const [push, setPush] = useState<PushState | null>(null);
  const [picks, setPicks] = useState<ReminderPicks>({});
  const [savingPicks, setSavingPicks] = useState(false);
  const userId = useUserId();
  const { toast } = useToast();

  /** Ao sair do passo dos lembretes, cria os escolhidos (uma vez só). */
  const next = async () => {
    if (step === 1 && Object.keys(picks).length) {
      setSavingPicks(true);
      try {
        await savePicks(picks);
        refresh(userId, "reminders");
        toast({ title: `${Object.keys(picks).length} ${Object.keys(picks).length === 1 ? "lembrete criado" : "lembretes criados"}` });
        setPicks({});
      } catch (err) {
        toast({ title: "Não foi possível criar os lembretes", description: (err as Error).message, variant: "destructive" });
        setSavingPicks(false);
        return;
      }
      setSavingPicks(false);
    }
    setStep(step + 1);
  };

  useEffect(() => setOpen(!done), [done]);

  const finish = () => {
    setOpen(false);
    void supabase.auth.updateUser({ data: { onboarded_at: new Date().toISOString() } });
  };

  if (done) return null;
  const name = displayName(user);
  const last = step === STEPS.length - 1;
  const { icon: Icon, title } = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish()}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto" data-testid="dialog-onboarding" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="rounded-2xl bg-hero p-5 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-mic text-white flex items-center justify-center shadow-md">
            <Icon className="h-7 w-7" />
          </div>
          {step === 0 && <p className="text-sm text-muted-foreground">Boas-vindas{name ? `, ${name}` : ""}! 💜</p>}
          <DialogTitle className="text-xl font-display font-semibold">{title}</DialogTitle>
          <DialogDescription className="sr-only">Passo {step + 1} de {STEPS.length}</DialogDescription>
          <div className="flex justify-center gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-primary" : "w-1.5 bg-primary/30")} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Toque numa paleta para ver o app mudar. Dá para trocar depois em Configurações.</p>
            <PalettePicker
              value={palette}
              onChange={(id) => {
                setPalette(id);
                void saveSettings({ palette: id });
              }}
            />
          </div>
        )}

        {step === 1 && <OnboardingReminders picks={picks} onChange={setPicks} />}

        {step === 2 && (
          <div className="space-y-3 text-sm">
            <p>
              Toque no <strong>microfone rosa</strong> no meio da barra de baixo e fale tudo de uma vez. Eu mostro o que entendi para
              você conferir antes de salvar.
            </p>
            <ul className="space-y-1.5">
              {VOICE_EXAMPLES.slice(0, 4).map((ex) => (
                <li key={ex} className="rounded-xl bg-muted/60 px-3 py-2 italic">“{ex}”</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Prefere digitar? Também dá: tudo tem o botão + ou o campo para escrever.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <p>
              Eu aviso dos compromissos, remédios e aniversários com som e falando o seu nome. Para os avisos chegarem mesmo com
              o app fechado, permita as notificações:
            </p>
            {push === "on" ? (
              <p className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3 font-medium">
                <Check className="h-4 w-4 text-primary" /> Notificações ligadas neste aparelho
              </p>
            ) : (
              <Button
                className="w-full gap-2"
                onClick={async () => {
                  try {
                    setPush(await enablePush());
                  } catch {
                    setPush("unsupported");
                  }
                }}
                data-testid="button-onboarding-push"
              >
                <BellRing className="h-4 w-4" /> Permitir notificações
              </Button>
            )}
            {push && push !== "on" && <p className="text-xs text-muted-foreground">{pushHelp[push]}</p>}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <p>Instalado, o Minha Rotina fica na tela do celular como os outros apps: abre em tela cheia e avisa na hora certa.</p>
            <InstallContent />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" onClick={step === 0 ? finish : () => setStep(step - 1)}>
            {step === 0 ? "Pular" : "Voltar"}
          </Button>
          <Button onClick={last ? finish : next} disabled={savingPicks} data-testid="button-onboarding-next">
            {last ? "Começar" : "Continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
