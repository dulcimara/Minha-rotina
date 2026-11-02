import { CalendarClock, Cake, Droplet, ShoppingBasket, type LucideIcon } from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type HeaderKind = "activity" | "shopping" | "birthday" | "period";

const KINDS: Record<HeaderKind, { label: string; icon: LucideIcon }> = {
  activity: { label: "Compromisso", icon: CalendarClock },
  shopping: { label: "Lista de compras", icon: ShoppingBasket },
  birthday: { label: "Aniversário", icon: Cake },
  period: { label: "Ciclo menstrual", icon: Droplet },
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
}

/**
 * Cabeçalho das telas de cadastro: mostra de que tipo é o cadastro
 * (compromisso, compras, aniversário ou ciclo) com o ícone em destaque.
 */
export function KindHeader({ kind, label: customLabel, title, heard, description }: KindHeaderProps) {
  const { label: defaultLabel, icon: Icon } = KINDS[kind];
  const label = customLabel ?? defaultLabel;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-hero p-4 pr-10" data-testid={`kind-header-${kind}`}>
      {/* ícone grande e clarinho no fundo, como marca d'água */}
      <Icon className="pointer-events-none absolute -right-3 -bottom-4 h-24 w-24 text-white/50 dark:text-white/5 rotate-[-12deg]" />

      <div className="relative flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-mic text-white flex items-center justify-center shadow-[0_6px_14px_-6px_hsl(320_60%_45%/0.7)]">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 space-y-0.5 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{label}</p>
          <DialogTitle className="text-lg font-display font-semibold leading-snug">{title}</DialogTitle>
          {heard ? (
            <DialogDescription className="text-sm italic text-muted-foreground line-clamp-3">“{heard}”</DialogDescription>
          ) : (
            <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
          )}
        </div>
      </div>
    </div>
  );
}
