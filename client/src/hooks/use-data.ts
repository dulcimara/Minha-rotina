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
  fetchChildren,
  fetchMedications,
  fetchDoses,
  fetchCycleDays,
  fetchWatchlist, fetchWorkouts,
} from "@/lib/data";
import { format, subDays } from "date-fns";

// Chaves dos dados guardados em memória pelo React Query.
export const keys = {
  activities: (u?: string) => ["activities", u],
  reminders: (u?: string) => ["reminders", u],
  shopping: (u?: string, listId?: string) => (listId ? ["shopping", u, listId] : ["shopping", u]),
  lists: (u?: string) => ["lists", u],
  trips: (u?: string) => ["trips", u],
  birthdays: (u?: string) => ["birthdays", u],
  cycles: (u?: string) => ["cycles", u],
  children: (u?: string) => ["children", u],
  medications: (u?: string) => ["medications", u],
  doses: (u?: string) => ["doses", u],
  cycleDays: (u?: string) => ["cycleDays", u],
  watchlist: (u?: string) => ["watchlist", u],
  workouts: (u?: string) => ["workouts", u],
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

export function useChildren() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.children(userId), queryFn: fetchChildren, enabled: !!userId });
}

export function useMedications() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.medications(userId), queryFn: fetchMedications, enabled: !!userId });
}

/** Doses tomadas dos últimos 2 dias. */
export function useDoses() {
  const userId = useUserId();
  return useQuery({
    queryKey: keys.doses(userId),
    queryFn: () => fetchDoses(format(subDays(new Date(), 2), "yyyy-MM-dd")),
    enabled: !!userId,
  });
}

/** Diário do ciclo dos últimos 12 meses. */
export function useCycleDays() {
  const userId = useUserId();
  return useQuery({
    queryKey: keys.cycleDays(userId),
    queryFn: () => fetchCycleDays(format(subDays(new Date(), 370), "yyyy-MM-dd")),
    enabled: !!userId,
  });
}

export function useWatchlist() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.watchlist(userId), queryFn: fetchWatchlist, enabled: !!userId });
}

export function useWorkouts() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.workouts(userId), queryFn: fetchWorkouts, enabled: !!userId });
}
