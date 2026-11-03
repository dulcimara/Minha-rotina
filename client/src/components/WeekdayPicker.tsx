import { Repeat } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { WEEKDAY_LETTER, WEEKDAY_SHORT, repeatLabel } from "@/lib/recurrence";

interface WeekdayPickerProps {
  id: string;
  /** dias escolhidos (0 = domingo ... 6 = sábado); vazio = não repete */
  value: number[];
  onChange: (days: number[]) => void;
}

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Todo dia", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Seg a Sex", days: [1, 2, 3, 4, 5] },
  { label: "Fim de semana", days: [0, 6] },
];

/** "Repetir" + bolinhas com os dias da semana (D S T Q Q S S). */
export function WeekdayPicker({ id, value, onChange }: WeekdayPickerProps) {
  const on = value.length > 0;
  const toggle = (d: number) =>
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort());

  return (
    <div className="space-y-3 rounded-xl bg-muted/50 p-4">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-2 font-semibold cursor-pointer">
          <Repeat className="h-4 w-4 text-primary" /> Repetir
        </Label>
        <Switch
          id={id}
          checked={on}
          onCheckedChange={(checked) => onChange(checked ? [new Date().getDay()] : [])}
          data-testid="switch-repeat"
        />
      </div>

      {on && (
        <>
          <div className="flex justify-between gap-1" role="group" aria-label="Dias da semana">
            {WEEKDAY_LETTER.map((letter, d) => {
              const active = value.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggle(d)}
                  aria-pressed={active}
                  aria-label={WEEKDAY_SHORT[d]}
                  className={cn(
                    "h-10 w-10 rounded-full text-sm font-semibold transition-colors",
                    active ? "bg-mic text-white shadow-sm" : "bg-background text-muted-foreground border border-border",
                  )}
                >
                  {letter}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(p.days)}
                className="rounded-full bg-background border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Repete: {repeatLabel(value)}</p>
        </>
      )}
    </div>
  );
}
