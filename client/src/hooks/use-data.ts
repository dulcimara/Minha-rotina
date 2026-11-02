import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchActivities,
  fetchBirthdays,
  fetchCycles,
  fetchReminders,
  fetchShoppingItems,
} from "@/lib/data";

// Chaves dos dados guardados em memória pelo React Query.
export const keys = {
  activities: (u?: string) => ["activities", u],
  reminders: (u?: string) => ["reminders", u],
  shopping: (u?: string) => ["shopping", u],
  birthdays: (u?: string) => ["birthdays", u],
  cycles: (u?: string) => ["cycles", u],
};

export type DataName = keyof typeof keys;

export function useUserId() {
  return useAuth().user?.id;
}

/** Recarrega do Supabase os dados indicados. */
export function refresh(userId: string | undefined, ...names: DataName[]) {
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

export function useShopping() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.shopping(userId), queryFn: fetchShoppingItems, enabled: !!userId });
}

export function useBirthdays() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.birthdays(userId), queryFn: fetchBirthdays, enabled: !!userId });
}

export function useCycles() {
  const userId = useUserId();
  return useQuery({ queryKey: keys.cycles(userId), queryFn: fetchCycles, enabled: !!userId });
}
