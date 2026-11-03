import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  /** quantidade em texto: "2", "2 kg", "12 rolos" ou vazio */
  value: string;
  /** chamado ao tocar nas setas ou ao terminar de digitar */
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

/** Separa o número do resto: "2 kg" -> { n: 2, unit: " kg" }; "1/2 dúzia" -> sem número inteiro. */
function split(value: string): { n: number | null; unit: string } {
  const m = value.trim().match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return { n: null, unit: value.trim() ? ` ${value.trim()}` : "" };
  return { n: Number(m[1].replace(",", ".")), unit: m[2] };
}

const format = (n: number, unit: string) => {
  const num = Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  return `${num}${unit}`.trim();
};

/** Quantidade com setinhas: ▾ diminui, ▴ aumenta; tocar no número permite digitar. */
export function QuantityStepper({ value, onChange, label, className }: QuantityStepperProps) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const step = (delta: number) => {
    const { n, unit } = split(text);
    let next: string;
    if (n === null) next = delta > 0 ? format(1, unit) : "";
    else {
      const v = Math.max(0, Math.round((n + delta) * 100) / 100);
      next = v === 0 ? "" : format(v, unit);
    }
    setText(next);
    onChange(next);
  };

  const commit = () => {
    if (text.trim() !== value.trim()) onChange(text.trim());
  };

  const empty = !text.trim();

  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center rounded-full border border-input bg-background shadow-sm overflow-hidden",
        className,
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={empty}
        className="flex h-full w-7 items-center justify-center text-primary disabled:text-muted-foreground/40 active:bg-secondary"
        aria-label={`Diminuir ${label.toLowerCase()}`}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Qtd"
        aria-label={label}
        // cresce com o texto ("2" fica estreito, "12 rolos" fica mais largo)
        style={{ width: `${Math.min(Math.max(text.length, 3), 9) + 1}ch` }}
        className="h-full min-w-0 bg-transparent text-center text-sm font-medium outline-none placeholder:text-muted-foreground placeholder:font-normal"
      />
      <button
        type="button"
        onClick={() => step(1)}
        className="flex h-full w-7 items-center justify-center text-primary active:bg-secondary"
        aria-label={`Aumentar ${label.toLowerCase()}`}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    </div>
  );
}
