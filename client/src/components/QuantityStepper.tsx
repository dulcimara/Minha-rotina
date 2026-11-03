import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  /** quantidade: só número ("2", "1,5") ou vazio */
  value: string;
  /** chamado ao tocar nas setas ou ao terminar de digitar */
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

/** Deixa só o número (com vírgula para meio quilo, por exemplo): "12 caixas" -> "12". */
export function onlyNumber(v: string | undefined): string {
  if (!v) return "";
  if (/^\s*1\/2/.test(v)) return "0,5";
  const m = v.replace(".", ",").match(/\d+(?:,\d{0,2})?/);
  return m ? m[0].replace(/,$/, "") : "";
}

const toNum = (v: string) => (v ? Number(v.replace(",", ".")) : null);
const format = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace(".", ","));

/** Quantidade com setinhas: ▾ diminui, ▴ aumenta; tocar no número permite digitar. */
export function QuantityStepper({ value, onChange, label, className }: QuantityStepperProps) {
  const [text, setText] = useState(onlyNumber(value));
  useEffect(() => setText(onlyNumber(value)), [value]);

  const step = (delta: number) => {
    const n = toNum(text);
    let next: string;
    if (n === null) next = delta > 0 ? "1" : "";
    else {
      const v = Math.max(0, Math.round((n + delta) * 100) / 100);
      next = v === 0 ? "" : format(v);
    }
    setText(next);
    onChange(next);
  };

  const commit = () => {
    const clean = text.replace(/,$/, "");
    if (clean !== text) setText(clean);
    if (clean !== value.trim()) onChange(clean);
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
        // só números (e uma vírgula para quantidades como 1,5)
        onChange={(e) => {
          const v = e.target.value.replace(".", ",").replace(/[^\d,]/g, "");
          const [int, ...dec] = v.split(",");
          setText(dec.length ? `${int},${dec.join("").slice(0, 2)}` : int);
        }}
        inputMode="decimal"
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Qtd"
        aria-label={label}
        // cresce com o número ("2" fica estreito, "120" um pouco mais largo)
        style={{ width: `${Math.min(Math.max(text.length, 3), 6) + 1}ch` }}
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
