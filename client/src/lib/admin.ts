import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

/**
 * Área de gestão: números do app vindos de funções do banco (etapa 12) que só
 * respondem para quem está na tabela "admins". O app nunca lê os dados das pessoas
 * diretamente: recebe só totais e uma lista curta de cadastradas.
 */

export interface AdminStats {
  generated_at: string;
  users: {
    total: number;
    confirmed: number;
    new_7d: number;
    new_30d: number;
    active_1d: number;
    active_7d: number;
    active_30d: number;
    onboarded: number;
    push: number;
  };
  days: { day: string; signups: number; active: number }[];
  areas: { area: string; people: number; items: number }[];
  palettes: Record<string, number>;
}

export interface AdminUser {
  name: string;
  email: string;
  created_at: string;
  last_seen: string | null;
  confirmed: boolean;
  items: number;
}

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false; // etapa 12 ainda não rodada
  return data === true;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw new Error(/acesso_negado/.test(error.message) ? "Acesso restrito à administradora do app." : error.message);
  return data as AdminStats;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_users");
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminUser[];
}

const DAY_KEY = "minha-rotina:dia-registrado";

/** Marca que a pessoa abriu o app hoje (uma vez por dia; só a data, nada do que ela fez). */
export async function recordActiveDay(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const mark = `${userId}:${today}`;
  try {
    if (localStorage.getItem(DAY_KEY) === mark) return;
  } catch {
    /* sem armazenamento: registra mesmo assim (o banco ignora repetidos) */
  }
  const { error } = await supabase.from("user_days").upsert({ day: today }, { onConflict: "user_id,day", ignoreDuplicates: true });
  if (!error) {
    try {
      localStorage.setItem(DAY_KEY, mark);
    } catch {
      /* ignora */
    }
  }
}
