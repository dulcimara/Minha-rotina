import { subDays } from "date-fns";
import type { NewItem, ShoppingTrip } from "@/lib/data";
import { normalize } from "@/lib/catalog";

export interface Suggestion extends NewItem {
  /** em quantas compras recentes o item apareceu */
  times: number;
}

/**
 * Sugere a lista do mês a partir do histórico de compras:
 * olha as compras dos últimos 90 dias e escolhe os itens que aparecem com
 * frequência (em pelo menos 2 compras e 1/3 delas; todos, se houver só 1 ou 2 compras),
 * com a quantidade da compra mais recente. Itens que já estão na lista ficam de fora.
 */
export function suggestFromHistory(
  trips: ShoppingTrip[],
  alreadyInList: string[],
  today = new Date(),
  max = 60,
): Suggestion[] {
  const since = subDays(today, 90);
  const recent = trips.filter((t) => t.doneAt >= since);
  const base = recent.length ? recent : trips.slice(0, 3);
  if (!base.length) return [];

  const minTimes = base.length <= 2 ? 1 : Math.max(2, Math.ceil(base.length / 3));
  const skip = new Set(alreadyInList.map(normalize));
  const counts = new Map<string, Suggestion>();

  // Mais recentes primeiro, para ficar com a quantidade da última compra.
  for (const trip of [...base].sort((a, b) => b.doneAt.getTime() - a.doneAt.getTime())) {
    const seenInTrip = new Set<string>();
    for (const item of trip.items) {
      const key = normalize(item.name);
      if (!key || skip.has(key) || seenInTrip.has(key)) continue;
      seenInTrip.add(key);
      const prev = counts.get(key);
      if (prev) prev.times += 1;
      else counts.set(key, { name: item.name, quantity: item.quantity, times: 1 });
    }
  }

  return Array.from(counts.values())
    .filter((s) => s.times >= minTimes)
    .sort((a, b) => b.times - a.times || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, max);
}
