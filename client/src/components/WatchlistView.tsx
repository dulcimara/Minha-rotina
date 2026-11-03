import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { KindHeader } from "@/components/KindHeader";
import { EmptyState } from "@/components/EmptyState";
import { NativeSelect } from "@/components/NativeSelect";
import { Clapperboard, Film, Plus, Star, Trash2, Tv } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useUserId, useWatchlist } from "@/hooks/use-data";
import { deleteWatchItem, saveWatchItem, type WatchItem, type WatchStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

const SERVICES = ["Netflix", "Prime Video", "Disney+", "Max", "Globoplay", "Apple TV+", "YouTube", "Cinema", "TV aberta"];

const STATUS: { value: WatchStatus; label: string }[] = [
  { value: "quero", label: "Quero ver" },
  { value: "assistindo", label: "Assistindo" },
  { value: "assisti", label: "Já vi" },
];

/** Estrelas de 1 a 5: só mostra, ou deixa escolher. */
export function Stars({ value, onChange, size = "h-5 w-5" }: { value?: number; onChange?: (v: number | undefined) => void; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label={value ? `Nota ${value} de 5` : "Sem nota"}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (value ?? 0) >= n;
        const star = <Star className={cn(size, on ? "fill-[#f5b301] text-[#f5b301]" : "text-muted-foreground/50")} />;
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            onClick={() => onChange(value === n ? undefined : n)}
            className="p-0.5"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

function WatchDialog({ item, open, onOpenChange }: { item: WatchItem | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [status, setStatus] = useState<WatchStatus>(item?.status ?? "quero");
  const [rating, setRating] = useState(item?.rating);
  const [review, setReview] = useState(item?.review ?? "");
  const [where, setWhere] = useState(item?.where ?? "");
  const [watchedAt, setWatchedAt] = useState(item?.watchedAt ?? format(new Date(), "yyyy-MM-dd"));
  if (!item) return null;

  const save = async () => {
    try {
      await saveWatchItem(
        { ...item, status, where, rating: status === "assisti" ? rating : item.rating, review, watchedAt: status === "assisti" ? watchedAt : undefined },
        item.id,
      );
      refresh(userId, "watchlist");
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <KindHeader kind="shopping" label={item.kind === "serie" ? "Série" : "Filme"} title={item.title} description={item.where ?? "Onde assistir: não informado"} />
        <div className="grid grid-cols-3 gap-1.5">
          {STATUS.map((s) => (
            <Button key={s.value} type="button" size="sm" variant={status === s.value ? "default" : "outline"} onClick={() => setStatus(s.value)}>
              {s.label}
            </Button>
          ))}
        </div>
        {status === "assisti" && (
          <>
            <div className="space-y-1.5">
              <Label>Sua nota</Label>
              <Stars value={rating} onChange={setRating} size="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-day">Quando assistiu</Label>
              <Input id="w-day" type="date" max={format(new Date(), "yyyy-MM-dd")} value={watchedAt} onChange={(e) => setWatchedAt(e.target.value)} />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="w-review">{status === "assisti" ? "O que achou?" : "Anotação"}</Label>
          <Textarea
            id="w-review"
            rows={3}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={status === "assisti" ? "Ex.: final emocionante, ver com as crianças" : "Ex.: indicação da Ana"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-where">Onde assistir</Label>
          <Input id="w-where" list="servicos" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Netflix, cinema..." />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="gap-1 text-destructive"
            onClick={async () => {
              if (!window.confirm(`Tirar "${item.title}" da lista?`)) return;
              await deleteWatchItem(item.id).catch(() => undefined);
              refresh(userId, "watchlist");
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4" /> Apagar
          </Button>
          <Button onClick={save} data-testid="button-watch-save">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Lista "Filmes e séries": quero ver, assistindo e já vi (com nota). */
export function WatchlistView() {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: items = [], isLoading } = useWatchlist();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"filme" | "serie">("filme");
  const [where, setWhere] = useState("");
  const [open, setOpen] = useState<{ item: WatchItem | null; key: number }>({ item: null, key: 0 });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await saveWatchItem({ title, kind, where, status: "quero" });
      setTitle("");
      refresh(userId, "watchlist");
    } catch (err) {
      toast({ title: "Não foi possível adicionar", description: (err as Error).message, variant: "destructive" });
    }
  };

  const groups = STATUS.map((s) => ({ ...s, items: items.filter((i) => i.status === s.value) })).filter((g) => g.items.length);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <form onSubmit={add} className="space-y-2">
          <div className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do filme ou série" data-testid="input-watch-title" />
            <Button type="submit" size="icon" className="shrink-0" disabled={!title.trim()}>
              <Plus className="h-5 w-5" />
              <span className="sr-only">Adicionar</span>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-2 gap-1">
              <Button type="button" size="sm" variant={kind === "filme" ? "default" : "outline"} onClick={() => setKind("filme")} className="gap-1">
                <Film className="h-4 w-4" /> Filme
              </Button>
              <Button type="button" size="sm" variant={kind === "serie" ? "default" : "outline"} onClick={() => setKind("serie")} className="gap-1">
                <Tv className="h-4 w-4" /> Série
              </Button>
            </div>
            <NativeSelect value={where} onChange={(e) => setWhere(e.target.value)} aria-label="Onde assistir">
              <option value="">Onde assistir?</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </NativeSelect>
          </div>
        </form>
        <datalist id="servicos">
          {SERVICES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Clapperboard} title="Nenhum filme ou série ainda" description="Anote o que quer ver; depois de assistir, dê uma nota e escreva o que achou." />
      ) : (
        groups.map((g) => (
          <section key={g.value} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {g.label} ({g.items.length})
            </h3>
            <Card className="px-4 py-1 divide-y">
              {g.items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setOpen((o) => ({ item: i, key: o.key + 1 }))}
                  className="w-full flex items-center gap-3 py-2.5 text-left"
                  data-testid={`watch-${i.id}`}
                >
                  <span className="h-9 w-9 shrink-0 rounded-xl bg-secondary flex items-center justify-center text-primary">
                    {i.kind === "serie" ? <Tv className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{i.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {[i.kind === "serie" ? "Série" : "Filme", i.where, i.watchedAt && format(new Date(i.watchedAt + "T12:00"), "d MMM yyyy", { locale: ptBR })]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {i.review && <span className="block text-xs italic text-foreground/70 line-clamp-1">“{i.review}”</span>}
                  </span>
                  {i.status === "assisti" ? (
                    i.rating ? <Stars value={i.rating} size="h-3.5 w-3.5" /> : <span className="text-xs text-primary">dar nota</span>
                  ) : null}
                </button>
              ))}
            </Card>
          </section>
        ))
      )}

      <WatchDialog key={open.key} item={open.item} open={!!open.item} onOpenChange={(o) => !o && setOpen((x) => ({ ...x, item: null }))} />
    </div>
  );
}
