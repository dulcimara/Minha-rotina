import {
  Bell,
  BedDouble,
  Car,
  CreditCard,
  Droplet,
  FileText,
  FlaskConical,
  Glasses,
  House,
  IdCard,
  PawPrint,
  Phone,
  Pill,
  Receipt,
  Ribbon,
  School,
  ShoppingCart,
  Smile,
  Stethoscope,
  Syringe,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Os lembretes prontos guardam um emoji no banco (por compatibilidade). Na tela, cada um
 * vira um ícone de traço nas cores da paleta, no mesmo estilo dos outros ícones do app.
 */
const ICONS: Record<string, LucideIcon> = {
  "🏫": School,
  "🩺": Stethoscope,
  "👓": Glasses,
  "💉": Syringe,
  "🧾": Receipt,
  "💳": CreditCard,
  "📈": TrendingUp,
  "🛒": ShoppingCart,
  "🦷": Smile,
  "🧪": FlaskConical,
  "🎀": Ribbon,
  "🏠": House,
  "📄": FileText,
  "🚗": Car,
  "🐾": PawPrint,
  "💊": Pill,
  "🪪": IdCard,
  "💧": Droplet,
  "🛏️": BedDouble,
  "📞": Phone,
};

/** Ícone do lembrete (sino quando não é um lembrete pronto). */
export function ReminderIcon({ emoji, className }: { emoji?: string; className?: string }) {
  const Icon = (emoji && ICONS[emoji]) || Bell;
  return <Icon className={cn("h-4 w-4 text-accent", className)} aria-hidden="true" />;
}

/** Símbolo do lembrete na lista: sempre num círculo rosinha, nas cores do app. */
export function ReminderGlyph({ emoji, className }: { emoji?: string; className?: string }) {
  return (
    <span className={cn("h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center", className)} aria-hidden="true">
      <ReminderIcon emoji={emoji} />
    </span>
  );
}
