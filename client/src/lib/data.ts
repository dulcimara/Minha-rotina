import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

// =============================================================
// Atividades e compromissos
// =============================================================

export interface Activity {
  id: string;
  title: string;
  description?: string;
  /** endereço do compromisso (opcional) */
  address?: string;
  /** telefone para contato (opcional) */
  phone?: string;
  date: Date;
  category: string;
  completed: boolean;
  reminderEnabled: boolean;
  reminderType: "text" | "voice";
  reminderDateTime?: Date;
  reminderMinutesBefore?: number;
  reminderVoiceText?: string;
  reminderVoiceGender?: "male" | "female";
}

export type ActivityInput = Omit<Activity, "id" | "completed">;

interface ActivityRow {
  id: string;
  title: string;
  description: string | null;
  address?: string | null;
  phone?: string | null;
  date: string;
  category: string;
  completed: boolean;
  reminder_enabled: boolean;
  reminder_type: "text" | "voice";
  reminder_date_time: string | null;
  reminder_minutes_before: number | null;
  reminder_voice_text: string | null;
  reminder_voice_gender: "male" | "female" | null;
}

function fromRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    date: new Date(row.date),
    category: row.category,
    completed: row.completed,
    reminderEnabled: row.reminder_enabled,
    reminderType: row.reminder_type,
    reminderDateTime: row.reminder_date_time ? new Date(row.reminder_date_time) : undefined,
    reminderMinutesBefore: row.reminder_minutes_before ?? undefined,
    reminderVoiceText: row.reminder_voice_text ?? undefined,
    reminderVoiceGender: row.reminder_voice_gender ?? undefined,
  };
}

/** Calcula a hora do aviso a partir da hora da atividade e dos minutos de antecedência. */
export function reminderTimeFor(date: Date, minutesBefore: number): Date {
  return new Date(date.getTime() - minutesBefore * 60_000);
}

function toRow(input: ActivityInput) {
  const minutes = input.reminderMinutesBefore ?? 0;
  const reminderAt = input.reminderEnabled
    ? input.reminderDateTime ?? reminderTimeFor(input.date, minutes)
    : null;
  return {
    title: input.title,
    description: input.description || null,
    // Só envia endereço/telefone quando vieram do formulário (evita erro se a coluna ainda não existir).
    ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
    ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
    date: input.date.toISOString(),
    category: input.category,
    reminder_enabled: input.reminderEnabled,
    reminder_type: input.reminderType,
    reminder_date_time: reminderAt ? reminderAt.toISOString() : null,
    reminder_minutes_before: input.reminderEnabled ? minutes : null,
    reminder_voice_text:
      input.reminderEnabled && input.reminderType === "voice" ? input.reminderVoiceText || null : null,
    reminder_voice_gender:
      input.reminderEnabled && input.reminderType === "voice" ? input.reminderVoiceGender || null : null,
  };
}

// O Supabase só devolve as linhas da pessoa logada (regras de segurança no banco).

export async function fetchActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data as ActivityRow[]).map(fromRow);
}

export async function createActivity(input: ActivityInput) {
  const { error } = await supabase.from("activities").insert(toRow(input));
  if (error) throw error;
}

export async function updateActivity(id: string, input: ActivityInput) {
  const { error } = await supabase.from("activities").update(toRow(input)).eq("id", id);
  if (error) throw error;
}

export async function setActivityCompleted(id: string, completed: boolean) {
  const { error } = await supabase.from("activities").update({ completed }).eq("id", id);
  if (error) throw error;
}

export async function deleteActivity(id: string) {
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) throw error;
}

// =============================================================
// Lembretes rápidos
// =============================================================

export interface Reminder {
  id: string;
  text: string;
  createdAt: Date;
}

export async function fetchReminders(limit = 3): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("id, text, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: r.text as string,
    createdAt: new Date(r.created_at as string),
  }));
}

export async function createReminder(text: string) {
  const { error } = await supabase.from("reminders").insert({ text });
  if (error) throw error;
}

export async function deleteReminder(id: string) {
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
}

// =============================================================
// Lista de compras
// =============================================================

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

export async function fetchShoppingItems(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from("shopping_items")
    .select("id, name, checked")
    .order("checked", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ShoppingItem[];
}

export async function addShoppingItems(names: string[]) {
  const rows = names.map((n) => n.trim()).filter(Boolean).map((name) => ({ name }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("shopping_items").insert(rows);
  if (error) throw error;
}

export async function setShoppingItemChecked(id: string, checked: boolean) {
  const { error } = await supabase.from("shopping_items").update({ checked }).eq("id", id);
  if (error) throw error;
}

export async function deleteShoppingItem(id: string) {
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearCheckedShoppingItems() {
  const { error } = await supabase.from("shopping_items").delete().eq("checked", true);
  if (error) throw error;
}

// =============================================================
// Aniversários
// =============================================================

export interface Birthday {
  id: string;
  name: string;
  day: number;
  month: number; // 1 a 12
  birthYear?: number;
  /** ideias de presente (opcional) */
  giftIdeas?: string;
}

export async function fetchBirthdays(): Promise<Birthday[]> {
  // "*" para continuar funcionando mesmo antes de existir a coluna de presentes.
  const { data, error } = await supabase.from("birthdays").select("*").order("month").order("day");
  if (error) throw error;
  return (data ?? []).map((b) => ({
    id: b.id as string,
    name: b.name as string,
    day: b.day as number,
    month: b.month as number,
    birthYear: (b.birth_year as number | null) ?? undefined,
    giftIdeas: (b.gift_ideas as string | null) ?? undefined,
  }));
}

function birthdayRow(input: Omit<Birthday, "id">) {
  return {
    name: input.name.trim(),
    day: input.day,
    month: input.month,
    birth_year: input.birthYear ?? null,
    // Só envia quando preenchido (evita erro se a coluna ainda não existir).
    ...(input.giftIdeas !== undefined ? { gift_ideas: input.giftIdeas.trim() || null } : {}),
  };
}

export async function createBirthday(input: Omit<Birthday, "id">) {
  const { error } = await supabase.from("birthdays").insert(birthdayRow(input));
  if (error) throw error;
}

export async function updateBirthday(id: string, input: Omit<Birthday, "id">) {
  const { error } = await supabase.from("birthdays").update(birthdayRow(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteBirthday(id: string) {
  const { error } = await supabase.from("birthdays").delete().eq("id", id);
  if (error) throw error;
}

/** Próxima data (hoje ou no futuro) em que o aniversário acontece. */
export function nextBirthdayDate(b: Birthday, today = new Date()): Date {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), b.month - 1, b.day);
  if (next < start) next = new Date(today.getFullYear() + 1, b.month - 1, b.day);
  return next;
}

// =============================================================
// Ciclo menstrual
// =============================================================

export interface Cycle {
  id: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

// Datas sem hora são guardadas como "AAAA-MM-DD" e lidas no fuso local.
const toDay = (d: Date) => format(d, "yyyy-MM-dd");
const fromDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export async function fetchCycles(): Promise<Cycle[]> {
  const { data, error } = await supabase
    .from("menstrual_cycles")
    .select("id, start_date, end_date, notes")
    .order("start_date", { ascending: false })
    .limit(24);
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id as string,
    startDate: fromDay(c.start_date as string),
    endDate: c.end_date ? fromDay(c.end_date as string) : undefined,
    notes: (c.notes as string | null) ?? undefined,
  }));
}

export async function startCycle(date: Date, end?: Date) {
  const { error } = await supabase
    .from("menstrual_cycles")
    .insert({ start_date: toDay(date), end_date: end ? toDay(end) : null });
  if (error) throw error;
}

/** Corrige as datas de um registro já salvo (término vazio = ainda em andamento). */
export async function updateCycle(id: string, start: Date, end?: Date) {
  const { error } = await supabase
    .from("menstrual_cycles")
    .update({ start_date: toDay(start), end_date: end ? toDay(end) : null })
    .eq("id", id);
  if (error) throw error;
}

export async function endCycle(id: string, date: Date) {
  const { error } = await supabase
    .from("menstrual_cycles")
    .update({ end_date: toDay(date) })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCycle(id: string) {
  const { error } = await supabase.from("menstrual_cycles").delete().eq("id", id);
  if (error) throw error;
}
