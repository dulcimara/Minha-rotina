import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const toBR = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

/** "dd/mm/aaaa" completo e válido -> "aaaa-mm-dd"; senão, undefined. */
export function brToIso(v: string): string | undefined {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return undefined;
  return `${y}-${mo}-${d}`;
}

/**
 * Data sempre no formato brasileiro dd/mm/aaaa (o campo de data do celular às vezes
 * aparece como mm/dd/aaaa). As barras entram sozinhas enquanto a pessoa digita.
 * Recebe e devolve "aaaa-mm-dd" (vazio enquanto a data estiver incompleta).
 */
export function DateInputBR({
  value,
  onChange,
  id,
  className,
  onBlur,
  autoComplete = "off",
  ...rest
}: {
  autoComplete?: string;
  value?: string;
  onChange: (iso: string) => void;
  id?: string;
  className?: string;
  onBlur?: () => void;
  required?: boolean;
  "data-testid"?: string;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(toBR(value));
  useEffect(() => {
    if (brToIso(text) !== value) setText(toBR(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const invalid = text.length === 10 && !brToIso(text);

  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete={autoComplete}
      placeholder="dd/mm/aaaa"
      maxLength={10}
      value={text}
      aria-invalid={invalid || undefined}
      className={cn(invalid && "border-destructive", className)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
        const masked = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
        setText(masked);
        onChange(brToIso(masked) ?? "");
      }}
      onBlur={onBlur}
      {...rest}
    />
  );
}
