import { onlyNumber } from "@/components/QuantityStepper";
import { nextDue, type Repeat } from "@/lib/lembretes";
import { supabase } from "@/lib/supabase";

/** Id da pessoa logada (da sessão guardada no aparelho). */
export async function myId(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id;
}
import { format } from "date-fns";

/** Data sem hora no formato do banco: "AAAA-MM-DD". */
const toDay = (d: Date) => format(d, "yyyy-MM-dd");

// =============================================================
// Atividades e compromissos
// =============================================================

export interface Activity {
  id: string;
  /** dona do compromisso (diferente de mim = compartilhado comigo) */
  ownerId?: string;
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
  /** filho para quem é o compromisso (opcional) */
  childId?: string;
  /** dias da semana em que repete (0 = domingo ... 6 = sábado); vazio = não repete */
  repeatDays?: number[];
  /** dias (AAAA-MM-DD) em que uma atividade recorrente foi marcada como feita */
  completedDates?: string[];
}

export type ActivityInput = Omit<Activity, "id" | "completed" | "completedDates">;

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
  repeat_days?: number[] | null;
  child_id?: string | null;
  user_id?: string;
  completed_dates?: string[] | null;
  reminder_voice_text: string | null;
  reminder_voice_gender: "male" | "female" | null;
}

function fromRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    ownerId: row.user_id,
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
    repeatDays: row.repeat_days?.length ? row.repeat_days : undefined,
    childId: row.child_id ?? undefined,
    completedDates: row.completed_dates ?? [],
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
    // Só envia quando o formulário informou (evita erro se a coluna ainda não existir).
    ...(input.repeatDays !== undefined ? { repeat_days: input.repeatDays.length ? input.repeatDays : null } : {}),
    ...(input.childId !== undefined ? { child_id: input.childId || null } : {}),
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

/** Marca/desmarca um dia de uma atividade recorrente como feito. */
export async function setOccurrenceCompleted(id: string, day: string, completed: boolean, current: string[]) {
  const next = completed ? Array.from(new Set([...current, day])) : current.filter((d) => d !== day);
  const { error } = await supabase.from("activities").update({ completed_dates: next }).eq("id", id);
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
  /** dona do lembrete (diferente de mim = compartilhado comigo) */
  ownerId?: string;
  text: string;
  emoji?: string;
  dueDate?: string; // AAAA-MM-DD
  dueTime: string; // HH:MM
  repeat: Repeat;
  alert: boolean;
  notes?: string;
  /** frase lida em voz alta na hora do aviso (vazio = aviso padrão) */
  voiceText?: string;
  voiceGender?: "male" | "female";
  doneAt?: Date;
  createdAt: Date;
}

const toReminder = (r: Record<string, unknown>): Reminder => ({
  id: r.id as string,
  ownerId: (r.user_id as string | undefined) ?? undefined,
  text: r.text as string,
  emoji: (r.emoji as string | null) ?? undefined,
  dueDate: (r.due_date as string | null) ?? undefined,
  dueTime: (r.due_time as string | null) ?? "09:00",
  repeat: ((r.repeat as Repeat | null) ?? "nao") as Repeat,
  alert: r.alert !== false,
  notes: (r.notes as string | null) ?? undefined,
  voiceText: (r.voice_text as string | null) ?? undefined,
  voiceGender: (r.voice_gender as "male" | "female" | null) ?? undefined,
  doneAt: r.done_at ? new Date(r.done_at as string) : undefined,
  createdAt: new Date(r.created_at as string),
});

/** Lembretes pendentes e os feitos nos últimos 30 dias. */
export async function fetchReminders(): Promise<Reminder[]> {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .or(`done_at.is.null,done_at.gte.${since}`)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) {
    // etapa 10 ainda não rodada: as colunas novas não existem
    if (error.code === "42703" || error.code === "PGRST100") {
      const old = await supabase.from("reminders").select("id, text, created_at");
      return (old.data ?? []).map((r) => toReminder(r as Record<string, unknown>));
    }
    throw error;
  }
  return (data ?? []).map((r) => toReminder(r as Record<string, unknown>));
}

export async function saveReminder(
  input: Omit<Reminder, "id" | "createdAt" | "doneAt">,
  id?: string,
): Promise<{ voiceSaved: boolean }> {
  const row = {
    text: input.text.trim(),
    emoji: input.emoji || null,
    due_date: input.dueDate || null,
    due_time: input.dueTime || "09:00",
    repeat: input.repeat,
    alert: input.alert,
    notes: input.notes?.trim() || null,
  };
  const voiceText = input.alert ? input.voiceText?.trim().slice(0, 300) || null : null;
  const voice = { voice_text: voiceText, voice_gender: voiceText ? input.voiceGender ?? "female" : null };
  const write = (data: Record<string, unknown>) =>
    id ? supabase.from("reminders").update(data).eq("id", id) : supabase.from("reminders").insert(data);

  const { error } = await write({ ...row, ...voice });
  if (!error) return { voiceSaved: true };
  // Etapa 13 ainda não rodada: salva o resto e avisa que a frase ficou de fora.
  if (isMissingColumn(error)) {
    const retry = await write(row);
    if (retry.error) throw retry.error;
    return { voiceSaved: !voiceText };
  }
  throw error;
}

/** Erro de coluna que ainda não existe no banco (SQL novo não rodado). */
function isMissingColumn(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST204";
}

/** Marca como feito. Se repete, avança para a próxima data e continua pendente. */
export async function completeReminder(r: Reminder): Promise<string | undefined> {
  const next = r.dueDate ? nextDue(r.dueDate, r.repeat) : undefined;
  const { error } = next
    ? await supabase.from("reminders").update({ due_date: next }).eq("id", r.id)
    : await supabase.from("reminders").update({ done_at: new Date().toISOString() }).eq("id", r.id);
  if (error) throw error;
  return next;
}

export async function reopenReminder(id: string) {
  const { error } = await supabase.from("reminders").update({ done_at: null }).eq("id", id);
  if (error) throw error;
}

export async function deleteReminder(id: string) {
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
}

// =============================================================
// Listas: a lista de compras (sem list_id) e as listas personalizadas
// =============================================================

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  quantity?: string;
  listId?: string;
}

export interface CustomList {
  id: string;
  name: string;
  temporary: boolean;
}

export interface NewItem {
  name: string;
  quantity?: string;
}

/** Itens de uma lista. Sem listId = lista de compras. */
export async function fetchShoppingItems(listId?: string, ownerId?: string): Promise<ShoppingItem[]> {
  let query = supabase.from("shopping_items").select("*");
  query = listId ? query.eq("list_id", listId) : query.is("list_id", null);
  // Só os itens da dona da lista (a minha, ou a de quem compartilhou comigo)
  const owner = ownerId ?? (await myId());
  if (owner) query = query.eq("user_id", owner);
  let { data, error } = await query.order("checked", { ascending: true }).order("created_at", { ascending: true });
  // Antes de rodar o SQL da etapa 5 a coluna list_id não existe: mostra a lista mesmo assim.
  if (error && !listId && error.code === "42703") {
    ({ data, error } = await supabase.from("shopping_items").select("*").order("checked").order("created_at"));
  }
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    checked: r.checked as boolean,
    quantity: (r.quantity as string | null) ?? undefined,
    listId: (r.list_id as string | null) ?? undefined,
  }));
}

export async function addShoppingItems(items: (string | NewItem)[], listId?: string, ownerId?: string) {
  const rows = items
    .map((i) => (typeof i === "string" ? { name: i } : i))
    .map((i) => ({ name: i.name.trim(), quantity: onlyNumber(i.quantity) || undefined }))
    .filter((i) => i.name)
    .map((i) => ({
      name: i.name,
      ...(i.quantity ? { quantity: i.quantity } : {}),
      ...(listId ? { list_id: listId } : {}),
      ...(ownerId ? { user_id: ownerId } : {}), // lista compartilhada: o item fica na conta da dona
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("shopping_items").insert(rows);
  if (error) throw error;
}

export async function updateShoppingItem(id: string, patch: { name?: string; quantity?: string }) {
  const row: Record<string, string | null> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.quantity !== undefined) row.quantity = onlyNumber(patch.quantity) || null;
  const { error } = await supabase.from("shopping_items").update(row).eq("id", id);
  if (error) throw error;
}

export async function setShoppingItemChecked(id: string, checked: boolean) {
  const { error } = await supabase.from("shopping_items").update({ checked }).eq("id", id);
  if (error) throw error;
}

/** Marca (ou desmarca) todos os itens de uma lista. */
export async function setAllItemsChecked(checked: boolean, listId?: string, ownerId?: string) {
  let q = supabase.from("shopping_items").update({ checked });
  q = listId ? q.eq("list_id", listId) : q.is("list_id", null);
  const owner = ownerId ?? (await myId());
  if (owner) q = q.eq("user_id", owner);
  const { error } = await q;
  if (error) throw error;
}

export async function deleteShoppingItem(id: string) {
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearCheckedShoppingItems(listId?: string, ownerId?: string) {
  let q = supabase.from("shopping_items").delete().eq("checked", true);
  q = listId ? q.eq("list_id", listId) : q.is("list_id", null);
  const owner = ownerId ?? (await myId());
  if (owner) q = q.eq("user_id", owner);
  const { error } = await q;
  if (error) throw error;
}

// ---------- Listas personalizadas ----------

export async function fetchLists(): Promise<CustomList[]> {
  const me = await myId();
  let q = supabase.from("lists").select("id, name, temporary");
  if (me) q = q.eq("user_id", me); // as compartilhadas comigo vêm por fetchSharedLists
  const { data, error } = await q.order("created_at");
  if (error) {
    if (error.code === "42P01") return []; // tabela ainda não criada (etapa 5)
    throw error;
  }
  return (data ?? []) as CustomList[];
}

export async function createList(name: string, temporary: boolean): Promise<CustomList> {
  const { data, error } = await supabase
    .from("lists")
    .insert({ name: name.trim(), temporary })
    .select("id, name, temporary")
    .single();
  if (error) throw error;
  return data as CustomList;
}

export async function updateList(id: string, patch: { name?: string; temporary?: boolean }) {
  const { error } = await supabase.from("lists").update(patch).eq("id", id);
  if (error) throw error;
}

/** Apaga a lista e todos os itens dela. */
export async function deleteList(id: string) {
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Histórico de compras ----------

export interface ShoppingTrip {
  id: string;
  doneAt: Date;
  items: NewItem[];
}

export async function fetchTrips(limit = 24): Promise<ShoppingTrip[]> {
  const { data, error } = await supabase
    .from("shopping_trips")
    .select("id, done_at, items")
    .order("done_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((t) => {
    const [y, m, d] = (t.done_at as string).split("-").map(Number);
    return { id: t.id as string, doneAt: new Date(y, m - 1, d), items: (t.items as NewItem[]) ?? [] };
  });
}

/**
 * "Compras feitas": guarda o dia e os itens comprados (marcados) no histórico
 * e tira esses itens da lista. O que não foi comprado continua na lista.
 */
export async function recordShoppingTrip(bought: ShoppingItem[], doneAt = new Date()) {
  const items = bought.map((i) => ({ name: i.name, ...(i.quantity ? { quantity: i.quantity } : {}) }));
  const { error } = await supabase.from("shopping_trips").insert({ done_at: toDay(doneAt), items });
  if (error) throw error;
  if (bought.length) {
    const { error: delError } = await supabase.from("shopping_items").delete().in("id", bought.map((i) => i.id));
    if (delError) throw delError;
  }
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

// =============================================================
// Filhos
// =============================================================

export interface Child {
  id: string;
  name: string;
  birthDate?: string; // AAAA-MM-DD
  school?: string;
  schoolGrade?: string;
  pediatrician?: string;
  pediatricianPhone?: string;
  allergies?: string;
  clothingSize?: string;
  shoeSize?: string;
  diaperSize?: string;
  notes?: string;
}

const CHILD_FIELDS: [keyof Child, string][] = [
  ["name", "name"],
  ["birthDate", "birth_date"],
  ["school", "school"],
  ["schoolGrade", "school_grade"],
  ["pediatrician", "pediatrician"],
  ["pediatricianPhone", "pediatrician_phone"],
  ["allergies", "allergies"],
  ["clothingSize", "clothing_size"],
  ["shoeSize", "shoe_size"],
  ["diaperSize", "diaper_size"],
  ["notes", "notes"],
];

export async function fetchChildren(): Promise<Child[]> {
  const { data, error } = await supabase.from("children").select("*").order("birth_date", { ascending: true });
  if (error) {
    if (error.code === "42P01") return []; // etapa 6 ainda não rodada
    throw error;
  }
  return (data ?? []).map((r) => {
    const c: Record<string, unknown> = { id: r.id };
    for (const [k, col] of CHILD_FIELDS) if (r[col] != null && r[col] !== "") c[k] = r[col];
    return c as unknown as Child;
  });
}

function childRow(input: Omit<Child, "id">) {
  const row: Record<string, unknown> = {};
  for (const [k, col] of CHILD_FIELDS) {
    const v = (input as Partial<Child>)[k];
    row[col] = typeof v === "string" ? v.trim() || null : v ?? null;
  }
  return row;
}

export async function saveChild(input: Omit<Child, "id">, id?: string) {
  const { error } = id
    ? await supabase.from("children").update(childRow(input)).eq("id", id)
    : await supabase.from("children").insert(childRow(input));
  if (error) throw error;
}

export async function deleteChild(id: string) {
  const { error } = await supabase.from("children").delete().eq("id", id);
  if (error) throw error;
}

// =============================================================
// Remédios
// =============================================================

export interface Medication {
  id: string;
  name: string;
  dose?: string;
  times: string[]; // "08:00"
  startDate: string; // AAAA-MM-DD
  endDate?: string;
  reminder: boolean;
  childId?: string;
  notes?: string;
}

export interface DoseTaken {
  medicationId: string;
  day: string;
  time: string;
}

export async function fetchMedications(): Promise<Medication[]> {
  const { data, error } = await supabase.from("medications").select("*").order("created_at");
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    dose: (r.dose as string | null) ?? undefined,
    times: ((r.times as string[] | null) ?? []).slice().sort(),
    startDate: r.start_date as string,
    endDate: (r.end_date as string | null) ?? undefined,
    reminder: r.reminder as boolean,
    childId: (r.child_id as string | null) ?? undefined,
    notes: (r.notes as string | null) ?? undefined,
  }));
}

export async function saveMedication(input: Omit<Medication, "id">, id?: string) {
  const row = {
    name: input.name.trim(),
    dose: input.dose?.trim() || null,
    times: [...input.times].sort(),
    start_date: input.startDate,
    end_date: input.endDate || null,
    reminder: input.reminder,
    child_id: input.childId || null,
    notes: input.notes?.trim() || null,
  };
  const { error } = id
    ? await supabase.from("medications").update(row).eq("id", id)
    : await supabase.from("medications").insert(row);
  if (error) throw error;
}

export async function deleteMedication(id: string) {
  const { error } = await supabase.from("medications").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchDoses(sinceDay: string): Promise<DoseTaken[]> {
  const { data, error } = await supabase
    .from("medication_doses")
    .select("medication_id, day, time")
    .gte("day", sinceDay);
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((d) => ({ medicationId: d.medication_id as string, day: d.day as string, time: d.time as string }));
}

export async function setDoseTaken(medicationId: string, day: string, time: string, taken: boolean) {
  const { error } = taken
    ? await supabase.from("medication_doses").upsert({ medication_id: medicationId, day, time }, { onConflict: "medication_id,day,time" })
    : await supabase.from("medication_doses").delete().match({ medication_id: medicationId, day, time });
  if (error) throw error;
}

/** Remédio ativo num dia (entre o início e o fim do tratamento). */
export const medicationActiveOn = (m: Medication, day: string) => m.startDate <= day && (!m.endDate || m.endDate >= day);

// =============================================================
// Diário do ciclo
// =============================================================

export interface CycleDay {
  day: string; // AAAA-MM-DD
  flow?: string;
  symptoms: string[];
  mood?: string;
  notes?: string;
}

export async function fetchCycleDays(sinceDay: string): Promise<CycleDay[]> {
  const { data, error } = await supabase.from("cycle_days").select("*").gte("day", sinceDay).order("day");
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    day: r.day as string,
    flow: (r.flow as string | null) ?? undefined,
    symptoms: (r.symptoms as string[] | null) ?? [],
    mood: (r.mood as string | null) ?? undefined,
    notes: (r.notes as string | null) ?? undefined,
  }));
}

export async function saveCycleDay(d: CycleDay) {
  const empty = !d.flow && !d.symptoms.length && !d.mood && !d.notes?.trim();
  const { error } = empty
    ? await supabase.from("cycle_days").delete().eq("day", d.day)
    : await supabase
        .from("cycle_days")
        .upsert(
          { day: d.day, flow: d.flow ?? null, symptoms: d.symptoms, mood: d.mood ?? null, notes: d.notes?.trim() || null },
          { onConflict: "user_id,day" },
        );
  if (error) throw error;
}

// =============================================================
// Privacidade: baixar e apagar os dados
// =============================================================

const ALL_TABLES = [
  "activities",
  "reminders",
  "shopping_items",
  "lists",
  "shopping_trips",
  "birthdays",
  "menstrual_cycles",
  "cycle_days",
  "children",
  "medications",
  "medication_doses",
  "push_subscriptions",
  "watchlist",
  "workouts",
];

/** Junta todos os dados da pessoa num arquivo JSON (direito de acesso, LGPD art. 18). */
export async function exportMyData(): Promise<Blob> {
  const { data: userData } = await supabase.auth.getUser();
  const out: Record<string, unknown> = {
    exportado_em: new Date().toISOString(),
    conta: { email: userData.user?.email, criada_em: userData.user?.created_at, perfil: userData.user?.user_metadata },
  };
  const me = userData.user?.id ?? "";
  for (const table of [...ALL_TABLES, "shares"]) {
    // só os meus dados (sem o que outras pessoas compartilharam comigo)
    const { data, error } = await supabase.from(table).select("*").eq(table === "shares" ? "owner_id" : "user_id", me);
    out[table] = error ? `indisponível (${error.message})` : data;
  }
  return new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
}

/** Apaga a conta e todos os dados (função delete_my_account no banco). */
export async function deleteMyAccount() {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
  await supabase.auth.signOut();
}

// =============================================================
// Filmes e séries
// =============================================================

export type WatchStatus = "quero" | "assistindo" | "assisti";

export interface WatchItem {
  id: string;
  ownerId?: string;
  title: string;
  kind: "filme" | "serie";
  where?: string;
  status: WatchStatus;
  rating?: number; // 1 a 5
  review?: string;
  watchedAt?: string; // AAAA-MM-DD
}

export async function fetchWatchlist(): Promise<WatchItem[]> {
  const { data, error } = await supabase.from("watchlist").select("*").order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    ownerId: r.user_id as string,
    title: r.title as string,
    kind: r.kind as "filme" | "serie",
    where: (r.where_to_watch as string | null) ?? undefined,
    status: r.status as WatchStatus,
    rating: (r.rating as number | null) ?? undefined,
    review: (r.review as string | null) ?? undefined,
    watchedAt: (r.watched_at as string | null) ?? undefined,
  }));
}

export async function saveWatchItem(input: Omit<WatchItem, "id">, id?: string) {
  const row = {
    title: input.title.trim(),
    kind: input.kind,
    where_to_watch: input.where?.trim() || null,
    status: input.status,
    rating: input.rating ?? null,
    review: input.review?.trim() || null,
    watched_at: input.watchedAt || null,
  };
  const { error } = id
    ? await supabase.from("watchlist").update(row).eq("id", id)
    : await supabase.from("watchlist").insert(row);
  if (error) throw error;
}

export async function deleteWatchItem(id: string) {
  const { error } = await supabase.from("watchlist").delete().eq("id", id);
  if (error) throw error;
}

// =============================================================
// Atividade física
// =============================================================

export interface Workout {
  id: string;
  activity: string;
  day: string; // AAAA-MM-DD
  minutes?: number;
  distanceKm?: number;
  notes?: string;
}

export async function fetchWorkouts(): Promise<Workout[]> {
  const since = new Date();
  since.setDate(since.getDate() - 400);
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .gte("day", since.toISOString().slice(0, 10))
    .order("day", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01") return []; // etapa 9 ainda não rodada
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    activity: r.activity as string,
    day: r.day as string,
    minutes: (r.duration_min as number | null) ?? undefined,
    distanceKm: r.distance_km == null ? undefined : Number(r.distance_km),
    notes: (r.notes as string | null) ?? undefined,
  }));
}

export async function saveWorkout(input: Omit<Workout, "id">, id?: string) {
  const row = {
    activity: input.activity.trim(),
    day: input.day,
    duration_min: input.minutes ?? null,
    distance_km: input.distanceKm ?? null,
    notes: input.notes?.trim() || null,
  };
  const { error } = id
    ? await supabase.from("workouts").update(row).eq("id", id)
    : await supabase.from("workouts").insert(row);
  if (error) throw error;
}

export async function deleteWorkout(id: string) {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

// =============================================================
// Compartilhamento
// =============================================================

export type ShareArea = "listas" | "lembretes" | "agenda" | "filmes";
export type SharePermission = "ler" | "editar";

export interface Share {
  id: string;
  ownerId: string;
  ownerName?: string;
  memberId: string;
  memberEmail: string;
  memberName?: string;
  area: ShareArea;
  /** vazio = a área inteira; "compras" = lista de compras; senão, o id do item */
  itemKey?: string;
  itemLabel?: string;
  permission: SharePermission;
}

/** O que eu compartilhei e o que compartilharam comigo. */
export async function fetchShares(): Promise<Share[]> {
  const { data, error } = await supabase.from("shares").select("*").order("created_at");
  if (error) {
    if (error.code === "42P01") return []; // etapa 11 ainda não rodada
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    ownerId: r.owner_id as string,
    ownerName: (r.owner_name as string | null) ?? undefined,
    memberId: r.member_id as string,
    memberEmail: r.member_email as string,
    memberName: (r.member_name as string | null) ?? undefined,
    area: r.area as ShareArea,
    itemKey: (r.item_key as string | null) ?? undefined,
    itemLabel: (r.item_label as string | null) ?? undefined,
    permission: r.permission as SharePermission,
  }));
}

export async function shareWith(email: string, area: ShareArea, permission: SharePermission, itemKey?: string, itemLabel?: string) {
  const { error } = await supabase.rpc("share_with", {
    p_email: email,
    p_area: area,
    p_item_key: itemKey ?? "",
    p_item_label: itemLabel ?? "",
    p_permission: permission,
  });
  if (error) {
    if (/pessoa_nao_encontrada/.test(error.message))
      throw new Error("Não achamos ninguém com esse e-mail no app. A pessoa precisa ter conta (com o e-mail confirmado).");
    if (/mesma_pessoa/.test(error.message)) throw new Error("Esse é o seu próprio e-mail.");
    if (/function .*share_with|Could not find the function/i.test(error.message))
      throw new Error("O compartilhamento ainda não foi ativado no banco (falta rodar o SQL da etapa 11).");
    throw error;
  }
}

export async function updateSharePermission(id: string, permission: SharePermission) {
  const { error } = await supabase.from("shares").update({ permission }).eq("id", id);
  if (error) throw error;
}

/** Para de compartilhar (dona) ou sai do compartilhamento (convidada). */
export async function deleteShare(id: string) {
  const { error } = await supabase.from("shares").delete().eq("id", id);
  if (error) throw error;
}

export interface SharedList {
  id: string;
  name: string;
  ownerId: string;
}

/** Listas de outras pessoas que foram compartilhadas comigo. */
export async function fetchSharedLists(): Promise<SharedList[]> {
  const me = await myId();
  if (!me) return [];
  const { data, error } = await supabase.from("lists").select("id, name, user_id").neq("user_id", me).order("created_at");
  if (error) return [];
  return (data ?? []).map((r) => ({ id: r.id as string, name: r.name as string, ownerId: r.user_id as string }));
}
