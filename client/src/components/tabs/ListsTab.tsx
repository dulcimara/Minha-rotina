import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { KindHeader } from "@/components/KindHeader";
import { EmptyState } from "@/components/EmptyState";
import { CatalogDialog } from "@/components/CatalogDialog";
import {
  BookOpen,
  CheckCheck,
  Hourglass,
  ListChecks,
  Mic,
  Pencil,
  Plus,
  Receipt,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { keys, refresh, useLists, useShopping, useTrips, useUserId } from "@/hooks/use-data";
import {
  addShoppingItems,
  clearCheckedShoppingItems,
  createList,
  deleteList,
  deleteShoppingItem,
  recordShoppingTrip,
  setAllItemsChecked,
  setShoppingItemChecked,
  updateList,
  updateShoppingItem,
  type CustomList,
  type ShoppingItem,
} from "@/lib/data";
import { CATALOG_ITEMS } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface ListsTabProps {
  /** lista aberta: undefined = lista de compras */
  listId?: string;
  onSelectList: (listId: string | undefined) => void;
  onVoice: () => void;
}

const fail = (toast: ReturnType<typeof useToast>["toast"], title: string) => (err: unknown) =>
  toast({ title, description: (err as Error).message, variant: "destructive" });

// ---------------------------------------------------------------
// Nova lista / editar lista
// ---------------------------------------------------------------

function ListDialog({
  open,
  onOpenChange,
  list,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  list?: CustomList | null;
  onSaved: (list?: CustomList) => void;
}) {
  const { toast } = useToast();
  const userId = useUserId();
  const [name, setName] = useState(list?.name ?? "");
  const [temporary, setTemporary] = useState(list?.temporary ?? false);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (list) {
        await updateList(list.id, { name: name.trim(), temporary });
        onSaved();
      } else {
        onSaved(await createList(name, temporary));
      }
      refresh(userId, "lists");
      onOpenChange(false);
    } catch (err) {
      fail(toast, "Não foi possível salvar a lista")(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <KindHeader
          kind="shopping"
          label="Lista"
          title={list ? "Editar lista" : "Nova lista"}
          description="Farmácia, viagem, festa, tarefas da casa... o que você precisar."
        />
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="list-name">Nome da lista *</Label>
            <Input id="list-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Farmácia" autoFocus />
          </div>
          <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/50 p-3">
            <div>
              <Label htmlFor="list-temp" className="font-semibold">Lista temporária</Label>
              <p className="text-xs text-muted-foreground">Quando tudo estiver marcado, o app oferece apagar a lista.</p>
            </div>
            <Switch id="list-temp" checked={temporary} onCheckedChange={setTemporary} />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
              {list ? "Salvar" : "Criar lista"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------
// "Compras feitas": escolhe o dia e guarda no histórico
// ---------------------------------------------------------------

function TripDialog({
  open,
  onOpenChange,
  bought,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bought: ShoppingItem[];
}) {
  const { toast } = useToast();
  const userId = useUserId();
  const [day, setDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const [y, m, d] = day.split("-").map(Number);
      await recordShoppingTrip(bought, new Date(y, m - 1, d));
      refresh(userId, "shopping", "trips");
      toast({ title: "Compras registradas! 🛒", description: `${bought.length} itens guardados no histórico.` });
      onOpenChange(false);
    } catch (err) {
      fail(toast, "Não foi possível registrar as compras")(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <KindHeader
          kind="shopping"
          title="Compras feitas!"
          description={`Vou guardar ${bought.length} ${bought.length === 1 ? "item comprado" : "itens comprados"} no seu histórico e tirar da lista.`}
        />
        <div className="space-y-1.5">
          <Label htmlFor="trip-day">Dia das compras</Label>
          <Input id="trip-day" type="date" max={format(new Date(), "yyyy-MM-dd")} value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">Os itens não marcados continuam na lista para a próxima vez.</p>
        <DialogFooter>
          <Button className="w-full" onClick={save} disabled={saving || !day} data-testid="button-trip-save">
            Registrar compras
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------
// Itens de uma lista (compras ou personalizada)
// ---------------------------------------------------------------

function ItemRow({
  item,
  onToggle,
  onQuantity,
  onRemove,
  showQuantity,
}: {
  item: ShoppingItem;
  onToggle: (checked: boolean) => void;
  onQuantity: (q: string) => void;
  onRemove: () => void;
  showQuantity: boolean;
}) {
  const [qty, setQty] = useState(item.quantity ?? "");
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Checkbox
        checked={item.checked}
        onCheckedChange={(c) => onToggle(!!c)}
        className="h-5 w-5"
        data-testid={`checkbox-item-${item.id}`}
      />
      <span className={cn("flex-1 min-w-0 break-words", item.checked && "line-through text-muted-foreground")}>{item.name}</span>
      {showQuantity && (
        <Input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={() => qty !== (item.quantity ?? "") && onQuantity(qty)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="Qtd"
          aria-label={`Quantidade de ${item.name}`}
          className="h-8 w-24 px-2 text-center text-sm"
        />
      )}
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground p-1" title="Apagar">
        <X className="h-4 w-4" />
        <span className="sr-only">Apagar {item.name}</span>
      </button>
    </div>
  );
}

function ListItems({
  listId,
  list,
  isShopping,
  onVoice,
  onListDeleted,
}: {
  listId?: string;
  list?: CustomList;
  isShopping: boolean;
  onVoice: () => void;
  onListDeleted: () => void;
}) {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: items = [], isLoading } = useShopping(listId);
  const { data: trips = [] } = useTrips();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [tripKey, setTripKey] = useState(0);
  const [showTrips, setShowTrips] = useState(false);
  const cacheKey = keys.shopping(userId, listId);

  const patchCache = (fn: (old: ShoppingItem[]) => ShoppingItem[]) =>
    queryClient.setQueryData<ShoppingItem[]>(cacheKey, (old) => (old ? fn(old) : old));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    // Vários itens de uma vez: "arroz, feijão, leite"
    const names = name.split(/,|;|\n/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setName("");
    setQty("");
    try {
      await addShoppingItems(
        names.map((n, i) => ({ name: n.charAt(0).toUpperCase() + n.slice(1), quantity: i === 0 && names.length === 1 ? qty : undefined })),
        listId,
      );
      refresh(userId, "shopping");
    } catch (err) {
      fail(toast, "Não foi possível adicionar")(err);
    }
  };

  const toggle = (item: ShoppingItem, checked: boolean) => {
    patchCache((old) => old.map((i) => (i.id === item.id ? { ...i, checked } : i)));
    setShoppingItemChecked(item.id, checked).catch((err) => {
      refresh(userId, "shopping");
      fail(toast, "Não foi possível atualizar")(err);
    });
  };

  const setAll = (checked: boolean) => {
    patchCache((old) => old.map((i) => ({ ...i, checked })));
    setAllItemsChecked(checked, listId).catch((err) => {
      refresh(userId, "shopping");
      fail(toast, "Não foi possível atualizar")(err);
    });
  };

  const remove = (item: ShoppingItem) => {
    patchCache((old) => old.filter((i) => i.id !== item.id));
    deleteShoppingItem(item.id).catch((err) => {
      refresh(userId, "shopping");
      fail(toast, "Não foi possível apagar")(err);
    });
  };

  const quantity = (item: ShoppingItem, q: string) => {
    patchCache((old) => old.map((i) => (i.id === item.id ? { ...i, quantity: q || undefined } : i)));
    updateShoppingItem(item.id, { quantity: q }).catch(fail(toast, "Não foi possível salvar a quantidade"));
  };

  const pending = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);
  const allDone = items.length > 0 && pending.length === 0;

  const share = async () => {
    const title = isShopping ? "🛒 Lista de compras" : `📝 ${list?.name ?? "Lista"}`;
    const message = `${title}\n\n${pending.map((i) => `• ${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ text: message });
      else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    } catch {
      // cancelado
    }
  };

  const removeList = async () => {
    if (!list || !window.confirm(`Apagar a lista "${list.name}" e todos os itens?`)) return;
    try {
      await deleteList(list.id);
      refresh(userId, "lists", "shopping");
      onListDeleted();
    } catch (err) {
      fail(toast, "Não foi possível apagar a lista")(err);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isShopping ? "Ex.: arroz, leite" : "Novo item"}
            list={isShopping ? "catalogo-itens" : undefined}
            data-testid="input-item"
          />
          {isShopping && (
            <Input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qtd"
              aria-label="Quantidade"
              className="w-24 px-2 text-center"
            />
          )}
          <Button type="submit" size="icon" className="shrink-0" disabled={!name.trim()}>
            <Plus className="h-5 w-5" />
            <span className="sr-only">Adicionar</span>
          </Button>
        </form>
        {isShopping && (
          <datalist id="catalogo-itens">
            {CATALOG_ITEMS.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        )}
        <div className="flex flex-wrap gap-2">
          {isShopping && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCatalogOpen(true)} data-testid="button-open-catalog">
              <BookOpen className="h-4 w-4" /> Catálogo
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onVoice}>
            <Mic className="h-4 w-4" /> Falar
          </Button>
          {items.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAll(!allDone)} data-testid="button-check-all">
              <CheckCheck className="h-4 w-4" /> {allDone ? "Desmarcar todos" : "Marcar todos"}
            </Button>
          )}
        </div>
      </Card>

      {list?.temporary && allDone && (
        <Card className="p-4 flex items-center gap-3 bg-hero border-0">
          <Hourglass className="h-5 w-5 text-primary shrink-0" />
          <p className="flex-1 text-sm">Tudo feito nesta lista temporária! Quer apagá-la?</p>
          <Button size="sm" onClick={removeList}>Apagar</Button>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={isShopping ? ShoppingCart : ListChecks}
          title="Lista vazia"
          description={isShopping ? "O que está faltando em casa? Digite, fale ou escolha no catálogo." : "Adicione o primeiro item acima."}
        />
      ) : (
        <>
          {pending.length > 0 && (
            <Card className="px-4 py-1 divide-y">
              {pending.map((i) => (
                <ItemRow
                  key={i.id}
                  item={i}
                  showQuantity={isShopping}
                  onToggle={(c) => toggle(i, c)}
                  onQuantity={(q) => quantity(i, q)}
                  onRemove={() => remove(i)}
                />
              ))}
            </Card>
          )}

          {done.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {isShopping ? "No carrinho" : "Feitos"} ({done.length})
                </h3>
                {!isShopping && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    onClick={() => clearCheckedShoppingItems(listId).then(() => refresh(userId, "shopping"), fail(toast, "Não foi possível limpar"))}
                  >
                    <Trash2 className="h-4 w-4" /> Limpar
                  </Button>
                )}
              </div>
              <Card className="px-4 py-1 divide-y opacity-80">
                {done.map((i) => (
                  <ItemRow
                    key={i.id}
                    item={i}
                    showQuantity={isShopping}
                    onToggle={(c) => toggle(i, c)}
                    onQuantity={(q) => quantity(i, q)}
                    onRemove={() => remove(i)}
                  />
                ))}
              </Card>
            </section>
          )}

          <div className="grid gap-2">
            {isShopping && done.length > 0 && (
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setTripKey((k) => k + 1);
                  setTripOpen(true);
                }}
                data-testid="button-shopping-done"
              >
                <ShoppingBag className="h-4 w-4" /> Compras feitas
              </Button>
            )}
            {pending.length > 0 && (
              <Button variant="outline" className="w-full gap-2" onClick={share}>
                <Share2 className="h-4 w-4" /> Enviar lista (WhatsApp...)
              </Button>
            )}
          </div>
        </>
      )}

      {isShopping && trips.length > 0 && (
        <Card className="p-4">
          <button className="w-full flex items-center justify-between" onClick={() => setShowTrips((v) => !v)}>
            <h3 className="font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Histórico de compras
            </h3>
            <span className="text-xs text-muted-foreground">{showTrips ? "Esconder" : `${trips.length} registros`}</span>
          </button>
          {showTrips && (
            <div className="mt-2 divide-y">
              {trips.map((t) => (
                <div key={t.id} className="py-2">
                  <p className="text-sm font-medium">
                    {format(t.doneAt, "EEEE, d 'de' MMMM", { locale: ptBR })} · {t.items.length} itens
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {t.items.map((i) => (i.quantity ? `${i.name} (${i.quantity})` : i.name)).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {list && (
        <Button variant="ghost" className="w-full gap-2 text-destructive" onClick={removeList}>
          <Trash2 className="h-4 w-4" /> Apagar esta lista
        </Button>
      )}

      {isShopping && (
        <CatalogDialog
          open={catalogOpen}
          onOpenChange={setCatalogOpen}
          inList={items.map((i) => i.name)}
          onAdd={(names) =>
            addShoppingItems(names).then(() => refresh(userId, "shopping"), fail(toast, "Não foi possível adicionar"))
          }
        />
      )}
      {isShopping && <TripDialog key={tripKey} open={tripOpen} onOpenChange={setTripOpen} bought={done} />}
    </div>
  );
}

// ---------------------------------------------------------------
// Aba Listas
// ---------------------------------------------------------------

export function ListsTab({ listId, onSelectList, onVoice }: ListsTabProps) {
  const { data: lists = [] } = useLists();
  const [dialog, setDialog] = useState<{ open: boolean; key: number; list: CustomList | null }>({
    open: false,
    key: 0,
    list: null,
  });
  const current = lists.find((l) => l.id === listId);
  const isShopping = !current;

  const chip = (active: boolean) =>
    cn(
      "shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors border",
      active ? "bg-mic text-white border-transparent shadow-sm" : "bg-card text-muted-foreground hover:bg-secondary",
    );

  return (
    <div className="space-y-4">
      {/* Escolha da lista */}
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button className={chip(isShopping)} onClick={() => onSelectList(undefined)} data-testid="chip-list-shopping">
          <ShoppingCart className="h-4 w-4" /> Compras
        </button>
        {lists.map((l) => (
          <button key={l.id} className={chip(l.id === listId)} onClick={() => onSelectList(l.id)}>
            {l.temporary ? <Hourglass className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
            {l.name}
          </button>
        ))}
        <button
          className={cn(chip(false), "border-dashed")}
          onClick={() => setDialog((d) => ({ open: true, key: d.key + 1, list: null }))}
          data-testid="button-new-list"
        >
          <Plus className="h-4 w-4" /> Nova lista
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {isShopping ? <ShoppingCart className="h-5 w-5 text-primary" /> : <ListChecks className="h-5 w-5 text-primary" />}
          {isShopping ? "Lista de compras" : current.name}
          {current?.temporary && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">temporária</span>
          )}
        </h2>
        {current && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDialog((d) => ({ open: true, key: d.key + 1, list: current }))}
            title="Editar lista"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Editar lista</span>
          </Button>
        )}
      </div>

      <ListItems
        key={listId ?? "compras"}
        listId={listId}
        list={current}
        isShopping={isShopping}
        onVoice={onVoice}
        onListDeleted={() => onSelectList(undefined)}
      />

      <ListDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        list={dialog.list}
        onSaved={(created) => created && onSelectList(created.id)}
      />
    </div>
  );
}
