import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BellRing, Check, Copy, Download, Maximize2, Mic, MoreVertical, PlusSquare, Share, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dismissBanner, promptInstall, shouldShowBanner, useInstall } from "@/lib/install";
import { cn } from "@/lib/utils";

const BENEFITS = [
  { icon: Maximize2, text: "Abre em tela cheia, com ícone próprio" },
  { icon: BellRing, text: "Avisos na hora certa, mesmo fechado" },
  { icon: Mic, text: "Microfone a um toque" },
];

function AppIcon({ className }: { className?: string }) {
  return <img src="/icon-192.png" alt="" className={cn("drop-shadow-md", className)} />;
}

/** Um passo ilustrado: número, texto e um "pedacinho de tela" mostrando onde tocar. */
function Step({ n, children, mock }: { n: number; children: React.ReactNode; mock: React.ReactNode }) {
  return (
    <li className="rounded-2xl border bg-card p-3 space-y-2.5">
      <p className="flex items-start gap-2.5 text-sm">
        <span className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{n}</span>
        <span className="pt-0.5">{children}</span>
      </p>
      <div className="rounded-xl bg-muted/60 p-2.5" aria-hidden="true">
        {mock}
      </div>
    </li>
  );
}

/** Destaque pulsante para mostrar onde tocar. */
function Tap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center justify-center rounded-lg ring-2 ring-primary bg-primary/10", className)}>
      <span className="absolute inset-0 rounded-lg ring-2 ring-primary animate-ping opacity-40" />
      {children}
    </span>
  );
}

function IOSSteps() {
  return (
    <ol className="space-y-2.5">
      <Step
        n={1}
        mock={
          <div className="flex items-center justify-around rounded-lg bg-background py-2 text-muted-foreground">
            <span>‹</span>
            <span>›</span>
            <Tap className="h-8 w-8 text-primary">
              <Share className="h-4 w-4" />
            </Tap>
            <span className="text-xs">▢</span>
            <span className="text-xs">⧉</span>
          </div>
        }
      >
        Toque em <strong>Compartilhar</strong> <Share className="inline h-4 w-4 -mt-1" />, na barra do Safari (embaixo, ou no topo no iPad).
      </Step>
      <Step
        n={2}
        mock={
          <div className="rounded-lg bg-background divide-y text-sm">
            <div className="px-3 py-2 text-muted-foreground">Copiar</div>
            <div className="px-3 py-2 text-muted-foreground">Adicionar aos Favoritos</div>
            <Tap className="flex w-full justify-between px-3 py-2 font-medium">
              <span>Adicionar à Tela de Início</span>
              <PlusSquare className="h-4 w-4" />
            </Tap>
          </div>
        }
      >
        Role a lista e escolha <strong>Adicionar à Tela de Início</strong>.
      </Step>
      <Step
        n={3}
        mock={
          <div className="rounded-lg bg-background px-3 py-2 flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Cancelar</span>
            <span className="flex-1 flex items-center justify-center gap-2">
              <AppIcon className="h-7 w-7" /> Minha Rotina
            </span>
            <Tap className="px-2 py-0.5 font-semibold text-primary">Adicionar</Tap>
          </div>
        }
      >
        Toque em <strong>Adicionar</strong>. Pronto: o ícone aparece na tela do iPhone.
      </Step>
    </ol>
  );
}

function AndroidManualSteps() {
  return (
    <ol className="space-y-2.5">
      <Step
        n={1}
        mock={
          <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
            <span className="flex-1 truncate rounded-full bg-muted px-3 py-1">minha-rotina-app.netlify.app</span>
            <Tap className="h-7 w-7 text-primary">
              <MoreVertical className="h-4 w-4" />
            </Tap>
          </div>
        }
      >
        No Chrome, toque no menu <strong>⋮</strong>, no canto de cima.
      </Step>
      <Step
        n={2}
        mock={
          <div className="rounded-lg bg-background divide-y text-sm">
            <div className="px-3 py-2 text-muted-foreground">Nova guia</div>
            <Tap className="flex w-full justify-between px-3 py-2 font-medium">
              <span>Instalar app</span>
              <Download className="h-4 w-4" />
            </Tap>
          </div>
        }
      >
        Escolha <strong>Instalar app</strong> (em alguns celulares: <em>Adicionar à tela inicial</em>) e confirme.
      </Step>
    </ol>
  );
}

/** Conteúdo de instalação, adaptado ao aparelho. Usado na janela e no primeiro acesso. */
export function InstallContent({ onInstalled }: { onInstalled?: () => void }) {
  const { installed, canPrompt, platform } = useInstall();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (installed) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3 text-sm font-medium">
        <Check className="h-4 w-4 text-primary" /> O Minha Rotina está instalado neste aparelho. 🎉
      </p>
    );
  }

  if (canPrompt) {
    return (
      <Button
        size="lg"
        className="w-full gap-2 h-12 text-base"
        disabled={busy}
        data-testid="button-install-native"
        onClick={async () => {
          setBusy(true);
          const ok = await promptInstall().finally(() => setBusy(false));
          if (ok) {
            toast({ title: "Instalando o Minha Rotina", description: "Em instantes o ícone aparece na tela do celular." });
            onInstalled?.();
          }
        }}
      >
        <Download className="h-5 w-5" /> Instalar o app
      </Button>
    );
  }

  if (platform === "ios") return <IOSSteps />;

  if (platform === "ios-other-browser") {
    return (
      <div className="space-y-3 text-sm">
        <p>
          No iPhone, a instalação é feita pelo <strong>Safari</strong>. Copie o endereço, abra o Safari, cole e siga os passos.
        </p>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={async () => {
            await navigator.clipboard?.writeText(location.origin).catch(() => undefined);
            toast({ title: "Endereço copiado", description: "Agora abra o Safari e cole na barra de endereço." });
          }}
        >
          <Copy className="h-4 w-4" /> Copiar endereço do app
        </Button>
      </div>
    );
  }

  if (platform === "android") return <AndroidManualSteps />;

  return (
    <p className="text-sm text-muted-foreground">
      No computador, use o Chrome ou o Edge: clique no ícone de instalar <Download className="inline h-4 w-4 -mt-0.5" /> no fim da
      barra de endereço. No celular, abra este mesmo endereço para instalar lá.
    </p>
  );
}

/** Cabeçalho com o ícone do app, no estilo de uma loja de apps. */
function StoreHeader() {
  return (
    <div className="rounded-2xl bg-hero p-4 space-y-3">
      <div className="flex items-center gap-3">
        <AppIcon className="h-16 w-16" />
        <div className="min-w-0">
          <DialogTitle className="font-brand text-xl">Minha Rotina</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Organize o seu dia falando</DialogDescription>
          <p className="text-xs text-muted-foreground mt-0.5">Grátis · sem anúncios · leve</p>
        </div>
      </div>
      <ul className="grid gap-1.5">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-primary shrink-0" /> {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InstallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto" data-testid="dialog-install" onOpenAutoFocus={(e) => e.preventDefault()}>
        <StoreHeader />
        <InstallContent onInstalled={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** Convite na tela inicial: só no primeiro uso; some ao instalar, tocar em Instalar ou fechar. */
export function InstallBanner() {
  const { installed, canPrompt } = useInstall();
  const [hidden, setHidden] = useState(() => !shouldShowBanner());
  const [open, setOpen] = useState(false);
  if (installed || hidden) return null;

  return (
    <>
      <Card className="relative flex items-center gap-3 p-3 pr-10" data-testid="banner-install">
        <AppIcon className="h-12 w-12 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight">Instale o Minha Rotina</p>
          <p className="text-xs text-muted-foreground">Fica na tela do celular e avisa na hora certa.</p>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          data-testid="button-install-banner"
          onClick={async () => {
            // Tocou em instalar: o convite não volta mais (fica em Configurações).
            dismissBanner();
            // Onde o navegador permite, já abre a instalação direto.
            if (canPrompt) {
              if (await promptInstall()) setHidden(true);
              return;
            }
            setOpen(true);
          }}
        >
          Instalar
        </Button>
        <button
          type="button"
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="Agora não"
          onClick={() => {
            dismissBanner();
            setHidden(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </Card>
      <InstallDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setHidden(true);
        }}
      />
    </>
  );
}
