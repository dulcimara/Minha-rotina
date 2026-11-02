import { supabase } from "@/lib/supabase";

// ---------- Tipos usados nas telas ----------

export interface Activity {
  id: string;
  title: string;
  description?: string;
  date: Date;
  category: string;
  completed: boolean;
  reminderEnabled: boolean;
  reminderType: "text" | "voice";
  reminderDateTime?: Date;
  reminderVoiceText?: string;
  reminderVoiceGender?: "male" | "female";
}

export type ActivityInput = Omit<Activity, "id" | "completed">;

export interface Reminder {
  id: string;
  text: string;
  createdAt: Date;
}

// ---------- Conversão entre o banco (snake_case) e o app ----------

interface ActivityRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  category: string;
  completed: boolean;
  reminder_enabled: boolean;
  reminder_type: "text" | "voice";
  reminder_date_time: string | null;
  reminder_voice_text: string | null;
  reminder_voice_gender: "male" | "female" | null;
}

function fromRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    date: new Date(row.date),
    category: row.category,
    completed: row.completed,
    reminderEnabled: row.reminder_enabled,
    reminderType: row.reminder_type,
    reminderDateTime: row.reminder_date_time ? new Date(row.reminder_date_time) : undefined,
    reminderVoiceText: row.reminder_voice_text ?? undefined,
    reminderVoiceGender: row.reminder_voice_gender ?? undefined,
  };
}

function toRow(input: ActivityInput) {
  return {
    title: input.title,
    description: input.description || null,
    date: input.date.toISOString(),
    category: input.category,
    reminder_enabled: input.reminderEnabled,
    reminder_type: input.reminderType,
    reminder_date_time:
      input.reminderEnabled && input.reminderDateTime ? input.reminderDateTime.toISOString() : null,
    reminder_voice_text:
      input.reminderEnabled && input.reminderType === "voice" ? input.reminderVoiceText || null : null,
    reminder_voice_gender:
      input.reminderEnabled && input.reminderType === "voice" ? input.reminderVoiceGender || null : null,
  };
}

// ---------- Atividades ----------
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

// ---------- Lembretes rápidos ----------

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
