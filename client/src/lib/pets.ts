import { addDays, addMonths, differenceInCalendarDays, differenceInDays, format } from "date-fns";
import { supabase } from "@/lib/supabase";

// =============================================================
// Pets: tipos, regras de vacina e de cio, e acesso ao banco.
// Regras de saúde ficam aqui (e não nas telas) para ser fácil de revisar e atualizar.
// =============================================================

export const PET_ESPECIES = [
  { value: "cachorro", label: "Cachorro" },
  { value: "gato", label: "Gato" },
  { value: "outro", label: "Outro" },
] as const;
export type Especie = (typeof PET_ESPECIES)[number]["value"];

export const PET_SEXO = [
  { value: "macho", label: "Macho" },
  { value: "femea", label: "Fêmea" },
  { value: "nao_sei", label: "Não sei" },
] as const;
export type SexoPet = (typeof PET_SEXO)[number]["value"];

export interface Pet {
  id: string;
  name: string;
  species: Especie;
  sex?: SexoPet;
  birthDate?: string; // AAAA-MM-DD
  neutered?: boolean;
  neuteredOn?: string; // AAAA-MM-DD
  breed?: string;
  weightKg?: number;
  notes?: string;
}

export interface PetVaccine {
  id: string;
  petId: string;
  vaccine: string;
  doseDate: string; // AAAA-MM-DD
  nextDate?: string; // AAAA-MM-DD
  batch?: string;
}

export interface PetHeat {
  id: string;
  petId: string;
  startDate: string; // AAAA-MM-DD
  endDate?: string; // AAAA-MM-DD
  notes?: string;
}

// ---------------------------------------------------------------
// Vacinas
// ---------------------------------------------------------------

/** Vacinas mais usadas por espécie. "Outra" permite digitar qualquer uma. */
export const VACCINE_CATALOG: Record<Especie, string[]> = {
  cachorro: ["V8 ou V10 (polivalente)", "Antirrábica", "Gripe canina", "Giárdia"],
  gato: ["V3, V4 ou V5 (polivalente)", "Antirrábica", "Leucemia felina (FeLV)"],
  outro: ["Antirrábica"],
};

export const PET_VACCINE_SOURCES =
  "Antirrábica: anual, conforme o Ministério da Saúde. Polivalentes e demais vacinas: protocolo definido pelo médico-veterinário, conforme as diretrizes WSAVA 2024 para cães e gatos.";

export const PET_HEALTH_DISCLAIMER =
  "Este registro ajuda a lembrar datas, mas não substitui o médico-veterinário. Confirme sempre o protocolo com a clínica.";

const WEEKS_16_IN_DAYS = 112;

/**
 * Sugere a data da próxima dose.
 * - Filhote (menos de 16 semanas) na série polivalente: reforço em 21 dias (diretriz: reforços a cada 3 a 4 semanas).
 * - Demais casos: reforço anual.
 * Sempre editável pela usuária, porque o veterinário pode definir outro intervalo.
 */
export function suggestNextDose(pet: Pick<Pet, "birthDate">, vaccine: string, doseDate: string): string {
  const dose = parseIso(doseDate);
  const isRabies = /antirr[aá]bica/i.test(vaccine);
  const isPuppySeries = !isRabies && !!pet.birthDate && differenceInDays(dose, parseIso(pet.birthDate)) < WEEKS_16_IN_DAYS;
  return toIso(isPuppySeries ? addDays(dose, 21) : addMonths(dose, 12));
}

/** Vacinas com data de reforço nos próximos dias (ou atrasadas), da mais próxima para a mais distante. */
export function dueVaccines(vaccines: PetVaccine[], today = new Date(), windowDays = 30) {
  return vaccines
    .filter((v) => v.nextDate)
    .map((v) => ({ ...v, days: differenceInCalendarDays(parseIso(v.nextDate as string), today) }))
    .filter((v) => v.days <= windowDays)
    .sort((a, b) => a.days - b.days);
}

// ---------------------------------------------------------------
// Cio
// ---------------------------------------------------------------

/** Só fêmeas que não foram castradas entram no controle de cio. */
export function hasHeatTracking(pet: Pick<Pet, "sex" | "neutered">): boolean {
  return pet.sex === "femea" && pet.neutered !== true;
}

const DEFAULT_HEAT_INTERVAL_DAYS = 180; // média usada enquanto não há histórico suficiente
const MIN_PLAUSIBLE_INTERVAL = 60;
const MAX_PLAUSIBLE_INTERVAL = 400;

/**
 * Previsão do próximo cio para cadelas: média dos intervalos entre os últimos cios registrados.
 * Gatas entram no cio em temporadas com episódios curtos e frequentes, por isso não há previsão para elas.
 */
export function heatForecast(pet: Pick<Pet, "species">, heats: PetHeat[], today = new Date()) {
  if (pet.species !== "cachorro" && pet.species !== "outro") return undefined;
  const starts = heats.map((h) => parseIso(h.startDate)).sort((a, b) => a.getTime() - b.getTime());
  if (!starts.length) return undefined;

  const intervals = starts
    .slice(1)
    .map((d, i) => differenceInDays(d, starts[i]))
    .filter((n) => n >= MIN_PLAUSIBLE_INTERVAL && n <= MAX_PLAUSIBLE_INTERVAL)
    .slice(-4);
  const avg = intervals.length
    ? Math.round(intervals.reduce((s, n) => s + n, 0) / intervals.length)
    : DEFAULT_HEAT_INTERVAL_DAYS;

  const next = addDays(starts[starts.length - 1], avg);
  return {
    nextDate: toIso(next),
    days: differenceInCalendarDays(next, today),
    intervalDays: avg,
    basedOnHistory: intervals.length > 0,
  };
}

/** Cio em andamento: começou nos últimos 21 dias e ainda não tem data de fim. */
export function openHeat(heats: PetHeat[], today = new Date()): PetHeat | undefined {
  return heats
    .filter((h) => !h.endDate && differenceInCalendarDays(today, parseIso(h.startDate)) <= 21)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

// ---------------------------------------------------------------
// Datas e idade
// ---------------------------------------------------------------

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function petAge(birthDate?: string, today = new Date()): string | undefined {
  if (!birthDate) return undefined;
  const days = differenceInDays(today, parseIso(birthDate));
  if (days < 0) return undefined;
  const months = Math.floor(days / 30.44);
  if (months < 1) return `${days} dias`;
  if (months < 24) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} anos`;
}

// ---------------------------------------------------------------
// Banco de dados
// ---------------------------------------------------------------

const MISSING_TABLE = "42P01"; // etapa 14 ainda não rodada no Supabase

function clean(v: string | undefined | null) {
  const t = typeof v === "string" ? v.trim() : v;
  return t === "" || t === undefined ? null : t;
}

function toPet(r: Record<string, unknown>): Pet {
  return {
    id: r.id as string,
    name: r.name as string,
    species: (r.species as Especie) ?? "cachorro",
    sex: (r.sex as SexoPet | null) ?? undefined,
    birthDate: (r.birth_date as string | null) ?? undefined,
    neutered: (r.neutered as boolean | null) ?? undefined,
    neuteredOn: (r.neutered_on as string | null) ?? undefined,
    breed: (r.breed as string | null) ?? undefined,
    weightKg: r.weight_kg == null ? undefined : Number(r.weight_kg),
    notes: (r.notes as string | null) ?? undefined,
  };
}

export async function fetchPets(): Promise<Pet[]> {
  const { data, error } = await supabase.from("pets").select("*").order("created_at", { ascending: true });
  if (error) {
    if (error.code === MISSING_TABLE) return [];
    throw error;
  }
  return (data ?? []).map(toPet);
}

export async function savePet(input: Omit<Pet, "id">, id?: string) {
  const row = {
    name: clean(input.name),
    species: input.species,
    sex: input.sex ?? null,
    birth_date: clean(input.birthDate),
    neutered: input.neutered ?? null,
    neutered_on: input.neutered ? clean(input.neuteredOn) : null,
    breed: clean(input.breed),
    weight_kg: input.weightKg ?? null,
    notes: clean(input.notes),
  };
  const { error } = id
    ? await supabase.from("pets").update(row).eq("id", id)
    : await supabase.from("pets").insert(row);
  if (error) throw error;
}

export async function deletePet(id: string) {
  const { error } = await supabase.from("pets").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPetVaccines(): Promise<PetVaccine[]> {
  const { data, error } = await supabase.from("pet_vaccines").select("*").order("dose_date", { ascending: false });
  if (error) {
    if (error.code === MISSING_TABLE) return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    petId: r.pet_id,
    vaccine: r.vaccine,
    doseDate: r.dose_date,
    nextDate: r.next_date ?? undefined,
    batch: r.batch ?? undefined,
  }));
}

export async function savePetVaccine(input: Omit<PetVaccine, "id">, id?: string) {
  const row = {
    pet_id: input.petId,
    vaccine: clean(input.vaccine),
    dose_date: input.doseDate,
    next_date: input.nextDate || null,
    batch: clean(input.batch),
  };
  const { error } = id
    ? await supabase.from("pet_vaccines").update(row).eq("id", id)
    : await supabase.from("pet_vaccines").insert(row);
  if (error) throw error;
}

export async function deletePetVaccine(id: string) {
  const { error } = await supabase.from("pet_vaccines").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPetHeats(): Promise<PetHeat[]> {
  const { data, error } = await supabase.from("pet_heats").select("*").order("start_date", { ascending: false });
  if (error) {
    if (error.code === MISSING_TABLE) return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    petId: r.pet_id,
    startDate: r.start_date,
    endDate: r.end_date ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

export async function savePetHeat(input: Omit<PetHeat, "id">, id?: string) {
  const row = {
    pet_id: input.petId,
    start_date: input.startDate,
    end_date: input.endDate || null,
    notes: clean(input.notes),
  };
  const { error } = id
    ? await supabase.from("pet_heats").update(row).eq("id", id)
    : await supabase.from("pet_heats").insert(row);
  if (error) throw error;
}

export async function deletePetHeat(id: string) {
  const { error } = await supabase.from("pet_heats").delete().eq("id", id);
  if (error) throw error;
}
