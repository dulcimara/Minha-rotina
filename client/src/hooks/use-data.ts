import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchActivities,
  fetchBirthdays,
  fetchCycles,
  fetchReminders,
  fetchShoppingItems,
  fetchLists,
  fetchTrips,
} from "@/lib/data";

// Chaves dos dados guardados em memória pelo React Query.
export const keys = {
  activities: (u?: string) => ["activities", u],
  reminders: (u?: string) => ["reminders", u],
  shopping: (u?: string, listId?: string) => (listId ? ["shopping", u, listId] : ["shopping", u]),
  lists: (u?: string) => ["lists", u],
  trips: (u?: string) => ["trips", u],
  birthdays: (u?: string) => ["birthdays", u],
  cycles: (u?: string) => ["cycles", u],
};

export type DataName = keyof typeof keys;

export function useUserId() {
  return useAuth().user?.id;
}

/** Recarrega do Supabase os dados indicados. */
export function refresh(userId: string | undefined, ...names: DataName[]) {
  // "shopping" atualiza a lista de compras e todas as listas personalizadas.
  for (const name of names) queryClient.invalidateQueries({ queryKey: keys[name](userId) });
}

export function useActivities() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.activities(userId), queryFn: fetchActivities, enabled: !!userId });
}

export function useReminders() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.reminders(userId), queryFn: () => fetchReminders(3), enabled: !!userId });
}

/** Itens de uma lista. Sem listId = lista de compras. */
export function useShopping(listId?: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: keys.shopping(userId, listId),
    queryFn: () => fetchShoppingItems(listId),
    enabled: !!userId,
  });
}

export function useLists() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.lists(userId), queryFn: fetchLists, enabled: !!userId });
}

export function useTrips() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.trips(userId), queryFn: () => fetchTrips(), enabled: !!userId });
}

export function useBirthdays() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.birthdays(userId), queryFn: fetchBirthdays, enabled: !!userId });
}

export function useCycles() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.cycles(userId), queryFn: fetchCycles, enabled: !!userId });
}
