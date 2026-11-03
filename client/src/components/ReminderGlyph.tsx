import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Símbolo do lembrete na lista: sempre num círculo rosinha, nas cores do app.
 * Sem emoji próprio, mostra o sino da paleta (em vez do sino dourado do celular).
 */
export function ReminderGlyph({ emoji, className }: { emoji?: string; className?: string }) {
  return (
    <span className={cn("h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center", className)} aria-hidden="true">
      {emoji ? <span className="text-base leading-none">{emoji}</span> : <Bell className="h-4 w-4 text-accent fill-accent/30" />}
    </span>
  );
}
