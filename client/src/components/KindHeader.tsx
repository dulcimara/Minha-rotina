import { Bell, CalendarClock, Cake, Clapperboard, Droplet, Dumbbell, Pill, ShoppingBasket, type LucideIcon } from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AppIcon, type AppIconName } from "@/components/AppIcons";

export type HeaderKind = "activity" | "shopping" | "birthday" | "period" | "reminder" | "workout" | "medication" | "movie";

const KINDS: Record<HeaderKind, { label: string; icon: LucideIcon; art: AppIconName }> = {
  activity: { label: "Compromisso", icon: CalendarClock, art: "agenda" },
  shopping: { label: "Lista de compras", icon: ShoppingBasket, art: "listas" },
  birthday: { label: "Aniversário", icon: Cake, art: "aniversarios" },
  period: { label: "Ciclo menstrual", icon: Droplet, art: "ciclo" },
  reminder: { label: "Lembrete", icon: Bell, art: "lembretes" },
  workout: { label: "Exercício", icon: Dumbbell, art: "atividade" },
  medication: { label: "Remédio", icon: Pill, art: "remedios" },
  movie: { label: "Filmes e séries", icon: Clapperboard, art: "filmes" },
};

interface KindHeaderProps {
  kind: HeaderKind;
  /** Troca o rótulo pequeno de cima (ex.: "Agenda do dia") */
  label?: string;
  /** Frase principal, ex.: "Confere pra mim?" ou "Novo compromisso" */
  title: string;
  /** O que a pessoa falou (aparece entre aspas) */
  heard?: string;
  /** Texto de apoio quando não há frase falada */
  description?: string;
  /** Usado fora de uma janela (ex.: tela Agenda) */
  standalone?: boolean;
}

/**
 * Cabeçalho das telas de cadastro: mostra de que tipo é o cadastro
 * (compromisso, compras, aniversário ou ciclo) com o ícone em destaque.
 */
export function KindHeader({ kind, label: customLabel, title, heard, description, standalone }: KindHeaderProps) {
  // Dentro de uma janela usa os títulos acessíveis da janela; fora, títulos comuns.
  const Title = standalone ? "h2" : DialogTitle;
  const Description = standalone ? "p" : DialogDescription;
  const { label: defaultLabel, icon: Icon, art } = KINDS[kind];
  const label = customLabel ?? defaultLabel;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-hero p-4 pr-10" data-testid={`kind-header-${kind}`}>
      {/* ícone grande e clarinho no fundo, como marca d'água */}
      <Icon className="pointer-events-none absolute -right-3 -bottom-4 h-24 w-24 text-white/50 dark:text-white/5 rotate-[-12deg]" />

      <div className="relative flex items-start gap-3">
        <div className="relative shrink-0">
          <AppIcon name={art} className="h-12 w-12 drop-shadow-[0_6px_10px_hsl(320_60%_45%/0.35)]" />
          {/* veio da voz: o balão "entendi" mostra que o app entendeu o que foi falado */}
          {heard && <AppIcon name="entendi" className="absolute -bottom-1.5 -right-1.5 h-6 w-6 ring-2 ring-background rounded-md" />}
        </div>
        <div className="min-w-0 space-y-0.5 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{label}</p>
          <Title className="text-lg font-display font-semibold leading-snug">{title}</Title>
          {heard ? (
            <Description className="text-sm italic text-muted-foreground line-clamp-3">“{heard}”</Description>
          ) : (
            <Description className="text-sm text-muted-foreground">{description}</Description>
          )}
        </div>
      </div>
    </div>
  );
}
