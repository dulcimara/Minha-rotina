import { useMemo, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { History } from "lucide-react";
import { normalize, suggestItems } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Itens que a pessoa já comprou antes (aparecem com o reloginho). */
  history: string[];
  /** Itens que já estão na lista agora. */
  inList: string[];
  placeholder?: string;
}

/**
 * Campo de item com autocompletar: enquanto digita, mostra as opções do catálogo
 * e do histórico de compras. Tocar numa opção preenche o campo.
 */
export function ItemAutocomplete({ value, onChange, history, inList, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Com vírgula a pessoa está digitando vários itens: sugere só para o último.
  const parts = value.split(",");
  const current = parts[parts.length - 1].trimStart();
  const historySet = useMemo(() => new Set(history.map(normalize)), [history]);
  const inListSet = useMemo(() => new Set(inList.map(normalize)), [inList]);
  const options = useMemo(() => {
    const list = suggestItems(current, history);
    // Se o que foi digitado já é exatamente a opção, não precisa sugerir.
    return list.length === 1 && normalize(list[0]) === normalize(current) ? [] : list;
  }, [current, history]);
  const show = open && options.length > 0;

  const pick = (opt: string) => {
    parts[parts.length - 1] = (parts.length > 1 ? " " : "") + opt;
    onChange(parts.join(","));
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative flex-1 min-w-0">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="sentences"
        role="combobox"
        aria-expanded={show}
        aria-controls="item-sugestoes"
        aria-autocomplete="list"
        data-testid="input-item"
      />
      {show && (
        <ul
          id="item-sugestoes"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
          data-testid="item-suggestions"
        >
          {options.map((opt, i) => {
            const already = inListSet.has(normalize(opt));
            return (
              <li key={opt} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  // mousedown para não perder o foco do campo antes do clique
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(opt)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm",
                    i === active ? "bg-secondary" : "hover:bg-muted",
                  )}
                >
                  <Highlight text={opt} query={current} />
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {already && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">na lista</span>}
                    {historySet.has(normalize(opt)) && <History className="h-3.5 w-3.5" aria-label="já comprou antes" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Deixa em negrito o pedaço que a pessoa digitou (ignorando acentos). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = normalize(query);
  const idx = q ? normalize(text).indexOf(q) : -1;
  if (idx < 0) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <strong className="font-semibold text-primary">{text.slice(idx, idx + q.length)}</strong>
      {text.slice(idx + q.length)}
    </span>
  );
}
