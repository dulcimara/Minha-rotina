import type { User } from "@supabase/supabase-js";
import { differenceInYears, format, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { normalize } from "@/lib/catalog";
import type { Workout } from "@/lib/data";

/**
 * Estimativas de calorias.
 *
 * Gasto nos exercícios: calorias = MET × peso (kg) × horas, com os valores de MET do
 * Compendium of Physical Activities (2024; caminhada, corrida e bicicleta pela velocidade).
 *
 * Necessidade diária: tabela de calorias estimadas por idade, sexo e nível de atividade das
 * Dietary Guidelines for Americans 2020–2025 (USDA/HHS), a mesma usada pelo Manual MSD.
 * São estimativas gerais e não substituem orientação de nutricionista.
 */

export type Sex = "feminino" | "masculino";
export type Level = "sedentario" | "moderado" | "ativo";

export interface BodyProfile {
  birthDate?: string; // AAAA-MM-DD
  sex?: Sex;
  weightKg?: number;
}

export const DEFAULT_WEIGHT = 65; // usado só enquanto a pessoa não informa o peso

export function readProfile(user: User | null | undefined): BodyProfile {
  const m = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const w = Number(m.weight_kg);
  return {
    birthDate: typeof m.birth_date === "string" ? m.birth_date : undefined,
    sex: m.sex === "feminino" || m.sex === "masculino" ? m.sex : undefined,
    weightKg: Number.isFinite(w) && w > 0 ? w : undefined,
  };
}

export async function saveProfile(patch: BodyProfile) {
  const data: Record<string, unknown> = {};
  if ("birthDate" in patch) data.birth_date = patch.birthDate || null;
  if ("sex" in patch) data.sex = patch.sex || null;
  if ("weightKg" in patch) data.weight_kg = patch.weightKg ?? null;
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}

export function ageFrom(birthDate?: string, now = new Date()): number | undefined {
  if (!birthDate) return undefined;
  const d = new Date(birthDate + "T12:00");
  if (Number.isNaN(d.getTime())) return undefined;
  return differenceInYears(now, d);
}

/** Data de nascimento possível (não no futuro, não antes de 1900). */
export function validBirthDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T12:00");
  return !Number.isNaN(d.getTime()) && d <= new Date() && d.getFullYear() >= 1900;
}

// ---------- Gasto nos exercícios ----------

/** MET por atividade (Compendium 2024). */
const MET: Record<string, number> = {
  caminhada: 3.5, // 16060 caminhada em ritmo moderado
  corrida: 8.5, // 12030 corrida ~8 km/h
  musculacao: 3.5, // 02054 musculação, vários exercícios
  bicicleta: 7.0, // 01014 bicicleta, geral
  pilates: 2.8, // 02105
  yoga: 2.3, // 02150 hatha
  danca: 4.8, // 02005 dança aeróbica, moderada
  natacao: 5.8, // 18310 natação em piscina, leve a moderada
  hidroginastica: 5.3, // 02120
  "treino funcional": 6.0, // 02032 circuito com peso do corpo
  crossfit: 7.0, // 02210 treino intervalado de alta intensidade, moderado
  spinning: 9.0, // 01270 aula de bike ergométrica
  futebol: 7.0, // 15610 futebol recreativo
  volei: 3.0, // 15720 vôlei recreativo
  "beach tennis": 4.5, // 15685 tênis em dupla (referência mais próxima)
  lutas: 10.3, // 15430 artes marciais, ritmo moderado
  trilha: 6.0, // 17080 trilha
  alongamento: 2.3, // 02101 alongamento leve
};
const DEFAULT_MET = 4.0; // atividade não listada: esforço moderado

/** Caminhada, corrida e bicicleta: o MET muda com a velocidade (km/h). */
function metBySpeed(activity: string, kmh: number): number | undefined {
  const pick = (table: [number, number][]) => table.find(([max]) => kmh <= max)?.[1] ?? table[table.length - 1][1];
  if (activity === "caminhada") return pick([[3.5, 2.8], [4.5, 3.0], [5.3, 3.5], [6.0, 4.3], [6.8, 5.0], [99, 7.0]]);
  if (activity === "corrida") return pick([[7, 6.0], [8.8, 8.3], [10.5, 9.8], [12, 11.0], [13.7, 11.8], [15, 12.8], [99, 14.5]]);
  if (activity === "bicicleta") return pick([[16, 4.0], [19, 6.8], [22, 8.0], [25, 10.0], [99, 12.0]]);
  return undefined;
}

export function metFor(w: Pick<Workout, "activity" | "minutes" | "distanceKm">): number {
  const key = normalize(w.activity);
  if (w.minutes && w.distanceKm) {
    const bySpeed = metBySpeed(key, w.distanceKm / (w.minutes / 60));
    if (bySpeed) return bySpeed;
  }
  return MET[key] ?? DEFAULT_MET;
}

/** Calorias estimadas de um exercício (sem tempo informado, não dá para estimar). */
export function burned(w: Pick<Workout, "activity" | "minutes" | "distanceKm">, weightKg = DEFAULT_WEIGHT): number | undefined {
  if (!w.minutes) return undefined;
  return Math.round(metFor(w) * weightKg * (w.minutes / 60));
}

// ---------- Necessidade diária ----------

// [idade até, sedentária, moderada, ativa]
const FEMALE: [number, number, number, number][] = [
  [20, 2000, 2200, 2400], [25, 2000, 2200, 2400], [30, 1800, 2000, 2400], [50, 1800, 2000, 2200],
  [60, 1600, 1800, 2200], [200, 1600, 1800, 2000],
];
const MALE: [number, number, number, number][] = [
  [20, 2600, 2800, 3000], [25, 2400, 2800, 3000], [35, 2400, 2600, 3000], [40, 2400, 2600, 2800],
  [45, 2200, 2600, 2800], [55, 2200, 2400, 2800], [60, 2200, 2400, 2600], [65, 2000, 2400, 2600],
  [75, 2000, 2200, 2600], [200, 2000, 2200, 2400],
];

export function dailyNeed(age: number, sex: Sex, level: Level): number | undefined {
  if (age < 19) return undefined; // a tabela de adultos começa aos 19 anos
  const row = (sex === "feminino" ? FEMALE : MALE).find(([max]) => age <= max)!;
  return row[level === "sedentario" ? 1 : level === "moderado" ? 2 : 3];
}

/**
 * Nível de atividade pela média semanal das últimas 4 semanas.
 * Pela definição das Diretrizes, "moderadamente ativa" equivale a caminhar de 2,5 a 5 km por dia
 * (cerca de 150 a 300 minutos por semana); acima disso, "ativa".
 */
export function activityLevel(workouts: Workout[], now = new Date()): { level: Level; weeklyMinutes: number } {
  const from = format(subDays(now, 28), "yyyy-MM-dd");
  const total = workouts.filter((w) => w.day >= from).reduce((s, w) => s + (w.minutes ?? 0), 0);
  const weeklyMinutes = Math.round(total / 4);
  return { level: weeklyMinutes >= 300 ? "ativo" : weeklyMinutes >= 150 ? "moderado" : "sedentario", weeklyMinutes };
}

export function levelLabel(level: Level, sex?: Sex): string {
  const o = sex === "masculino" ? "o" : "a";
  return level === "sedentario" ? `pouco ativ${o}` : level === "moderado" ? `moderadamente ativ${o}` : `ativ${o}`;
}

export const kcal = (n: number) => `${n.toLocaleString("pt-BR")} kcal`;
