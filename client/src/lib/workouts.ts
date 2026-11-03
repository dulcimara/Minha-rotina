import { addDays, format, startOfWeek, subMonths } from "date-fns";
import type { Workout } from "@/lib/data";

export interface Sport {
  name: string;
  emoji: string;
  /** Pede distância? Em km, ou em metros (natação). */
  distance?: "km" | "m";
}

/** As atividades físicas mais praticadas no Brasil (dá para escrever outra). */
export const SPORTS: Sport[] = [
  { name: "Caminhada", emoji: "🚶‍♀️", distance: "km" },
  { name: "Corrida", emoji: "🏃‍♀️", distance: "km" },
  { name: "Musculação", emoji: "🏋️‍♀️" },
  { name: "Bicicleta", emoji: "🚴‍♀️", distance: "km" },
  { name: "Pilates", emoji: "🤸‍♀️" },
  { name: "Yoga", emoji: "🧘‍♀️" },
  { name: "Dança", emoji: "💃" },
  { name: "Natação", emoji: "🏊‍♀️", distance: "m" },
  { name: "Hidroginástica", emoji: "🌊" },
  { name: "Treino funcional", emoji: "💪" },
  { name: "Crossfit", emoji: "🔥" },
  { name: "Spinning", emoji: "🚲" },
  { name: "Futebol", emoji: "⚽" },
  { name: "Vôlei", emoji: "🏐" },
  { name: "Beach tennis", emoji: "🎾" },
  { name: "Lutas", emoji: "🥊" },
  { name: "Trilha", emoji: "🥾", distance: "km" },
  { name: "Alongamento", emoji: "🙆‍♀️" },
];

export const sportOf = (name: string): Sport =>
  SPORTS.find((s) => s.name.toLowerCase() === name.toLowerCase()) ?? { name, emoji: "⭐", distance: "km" };

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function formatDistance(km: number, unit: "km" | "m" = "km"): string {
  if (unit === "m") return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

/** Só os registros dos últimos 3 meses. */
export function lastThreeMonths(items: Workout[], now = new Date()): Workout[] {
  const from = format(subMonths(now, 3), "yyyy-MM-dd");
  return items.filter((w) => w.day >= from);
}

export interface WeekBar {
  start: Date;
  minutes: number;
  count: number;
}

/** Minutos por semana (segunda a domingo), das últimas 13 semanas. */
export function weeklyMinutes(items: Workout[], now = new Date()): WeekBar[] {
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const weeks: WeekBar[] = Array.from({ length: 13 }, (_, i) => ({ start: addDays(thisWeek, (i - 12) * 7), minutes: 0, count: 0 }));
  for (const w of items) {
    const d = new Date(w.day + "T12:00");
    const idx = Math.floor((startOfWeek(d, { weekStartsOn: 1 }).getTime() - weeks[0].start.getTime()) / (7 * 864e5) + 0.5);
    if (idx >= 0 && idx < weeks.length) {
      weeks[idx].minutes += w.minutes ?? 0;
      weeks[idx].count += 1;
    }
  }
  return weeks;
}

export interface SportTotal {
  name: string;
  count: number;
  minutes: number;
  km: number;
}

export function totalsBySport(items: Workout[]): SportTotal[] {
  const map = new Map<string, SportTotal>();
  for (const w of items) {
    const t = map.get(w.activity) ?? { name: w.activity, count: 0, minutes: 0, km: 0 };
    t.count += 1;
    t.minutes += w.minutes ?? 0;
    t.km += w.distanceKm ?? 0;
    map.set(w.activity, t);
  }
  return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes || b.count - a.count);
}

/** Quantas atividades nesta semana (para o card da tela inicial). */
export function thisWeekCount(items: Workout[], now = new Date()): number {
  const from = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return items.filter((w) => w.day >= from).length;
}
