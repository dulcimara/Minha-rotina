import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/EmptyState";
import { Mic, Plus, Share2, ShoppingCart, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { keys, refresh, useShopping, useUserId } from "@/hooks/use-data";
import {
  addShoppingItems,
  clearCheckedShoppingItems,
  deleteShoppingItem,
  setShoppingItemChecked,
  type ShoppingItem,
} from "@/lib/data";
import { cn } from "@/lib/utils";

interface ShoppingTabProps {
  onVoice: () => void;
}

export function ShoppingTab({ onVoice }: ShoppingTabProps) {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: items = [], isLoading } = useShopping();
  const [text, setText] = useState("");

  const fail = (title: string) => (err: unknown) =>
    toast({ title, description: (err as Error).message, variant: "destructive" });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    // Vários itens de uma vez: "arroz, feijão, leite"
    const names = text.split(/,|;|\n/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setText("");
    try {
      await addShoppingItems(names.map((n) => n.charAt(0).toUpperCase() + n.slice(1)));
      refresh(userId, "shopping");
    } catch (err) {
      fail("Não foi possível adicionar")(err);
    }
  };

  const toggle = (item: ShoppingItem, checked: boolean) => {
    // Risca na hora, sem esperar o servidor.
    queryClient.setQueryData<ShoppingItem[]>(keys.shopping(userId), (old) =>
      old?.map((i) => (i.id === item.id ? { ...i, checked } : i)),
    );
    setShoppingItemChecked(item.id, checked).catch((err) => {
      refresh(userId, "shopping");
      fail("Não foi possível atualizar")(err);
    });
  };

  const remove = (item: ShoppingItem) => {
    queryClient.setQueryData<ShoppingItem[]>(keys.shopping(userId), (old) => old?.filter((i) => i.id !== item.id));
    deleteShoppingItem(item.id).catch((err) => {
      refresh(userId, "shopping");
      fail("Não foi possível apagar")(err);
    });
  };

  const clearChecked = async () => {
    try {
      await clearCheckedShoppingItems();
      refresh(userId, "shopping");
    } catch (err) {
      fail("Não foi possível limpar")(err);
    }
  };

  const pending = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  const share = async () => {
    const message = `🛒 Lista de compras\n\n${pending.map((i) => `• ${i.name}`).join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ text: message });
      else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    } catch {
      // a pessoa cancelou o compartilhamento
    }
  };

  const Row = ({ item }: { item: ShoppingItem }) => (
    <div className="flex items-center gap-3 py-2.5">
      <Checkbox
        checked={item.checked}
        onCheckedChange={(c) => toggle(item, !!c)}
        className="h-5 w-5"
        data-testid={`checkbox-shopping-${item.id}`}
      />
      <span className={cn("flex-1", item.checked && "line-through text-muted-foreground")}>{item.name}</span>
      <button onClick={() => remove(item)} className="text-muted-foreground hover:text-foreground p-1" title="Apagar">
        <X className="h-4 w-4" />
        <span className="sr-only">Apagar {item.name}</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> Lista de compras
          </h2>
          <Button size="sm" variant="outline" onClick={onVoice} className="gap-1">
            <Mic className="h-4 w-4" /> Falar
          </Button>
        </div>
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: arroz, feijão, leite"
            data-testid="input-shopping"
          />
          <Button type="submit" size="icon" disabled={!text.trim()}>
            <Plus className="h-5 w-5" />
            <span className="sr-only">Adicionar</span>
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">Separe vários itens com vírgula, ou diga: “coloca leite e ovos na lista”.</p>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Lista vazia" description="O que está faltando em casa? Adicione acima ou pelo microfone." />
      ) : (
        <>
          {pending.length > 0 && (
            <Card className="px-4 py-1 divide-y">
              {pending.map((i) => (
                <Row key={i.id} item={i} />
              ))}
            </Card>
          )}

          {pending.length > 0 && (
            <Button variant="outline" className="w-full gap-2" onClick={share}>
              <Share2 className="h-4 w-4" /> Enviar lista (WhatsApp...)
            </Button>
          )}

          {done.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Já comprados ({done.length})</h3>
                <Button variant="ghost" size="sm" onClick={clearChecked} className="gap-1 text-muted-foreground">
                  <Trash2 className="h-4 w-4" /> Limpar
                </Button>
              </div>
              <Card className="px-4 py-1 divide-y opacity-80">
                {done.map((i) => (
                  <Row key={i.id} item={i} />
                ))}
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
