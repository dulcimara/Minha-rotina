import { useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KindHeader } from "@/components/KindHeader";
import { Check, Plus, Search } from "lucide-react";
import { CATALOG, normalize } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface CatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** nomes que já estão na lista (aparecem marcados) */
  inList: string[];
  onAdd: (names: string[]) => void;
}

/** Catálogo com os 150 itens mais comuns: toque para escolher e "Adicionar". */
export function CatalogDialog({ open, onOpenChange, inList, onAdd }: CatalogDialogProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const already = new Set(inList.map(normalize));
  const q = normalize(query);

  const toggle = (name: string) =>
    setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const sections = CATALOG.map((s) => ({
    ...s,
    items: q ? s.items.filter((i) => normalize(i).includes(q)) : s.items,
  })).filter((s) => s.items.length);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPicked([]);
          setQuery("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-3">
        <div className="shrink-0">
          <KindHeader kind="shopping" title="Escolha no catálogo" description="Os itens mais comprados, por seção do mercado." />
        </div>

        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar item..." className="pl-9" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1">
          {sections.map((s) => (
            <section key={s.section}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">{s.section}</h4>
              <div className="flex flex-wrap gap-1.5">
                {s.items.map((name) => {
                  const inside = already.has(normalize(name));
                  const on = picked.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={inside}
                      onClick={() => toggle(name)}
                      aria-pressed={on}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                        on && "bg-mic text-white border-transparent",
                        !on && !inside && "bg-background hover:bg-secondary",
                        inside && "opacity-50 cursor-default bg-muted",
                      )}
                    >
                      {on || inside ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {name}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground">Nada encontrado. Você pode digitar o item direto na lista.</p>
          )}
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!picked.length}
            onClick={() => {
              onAdd(picked);
              setPicked([]);
              setQuery("");
              onOpenChange(false);
            }}
            data-testid="button-catalog-add"
          >
            {picked.length ? `Adicionar ${picked.length} ${picked.length === 1 ? "item" : "itens"}` : "Escolha os itens"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
