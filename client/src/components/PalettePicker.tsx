import { Check } from "lucide-react";
import { PALETTES, applyPalette } from "@/lib/palettes";
import { cn } from "@/lib/utils";

/** Escolha das cores do app: um cartão por paleta, com as três cores e o nome. */
export function PalettePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cores do app">
      {PALETTES.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              applyPalette(p.id); // mostra na hora
              onChange(p.id);
            }}
            data-testid={`palette-${p.id}`}
            className={cn(
              "relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
              active ? "border-primary ring-2 ring-primary/30 bg-secondary/50" : "bg-card hover:bg-muted/60",
            )}
          >
            <span className="flex -space-x-1.5">
              {p.swatches.map((c) => (
                <span key={c} className="h-6 w-6 rounded-full border-2 border-card" style={{ background: c }} />
              ))}
            </span>
            <span className="text-sm font-medium leading-tight">{p.name}</span>
            {active && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}
