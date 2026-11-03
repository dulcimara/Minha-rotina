import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Como o app avisa na hora de um compromisso:
 * - "voice": um toque curto e a voz falando o aviso ("Cida, dentro de 10 minutos...")
 * - "sound": só o som (melodia), sem falar
 * - "silent": sem som; só a janela na tela e a notificação
 */
export type AlertMode = "voice" | "sound" | "silent";

export interface AccountSettings {
  alertMode: AlertMode;
  voiceGender: "female" | "male";
  vibrate: boolean;
  /** resumo da manhã: notificação no horário escolhido */
  morningSummary: boolean;
  morningTime: string; // "07:00"
  /** aviso 2 dias antes da menstruação prevista (opcional, aparece na tela bloqueada) */
  cycleAlert: boolean;
  /** mostrar o período fértil estimado no ciclo */
  showFertile: boolean;
  /** paleta de cores do app */
  palette: string;
  /** versículo do dia (Provérbios) no topo do app */
  showVerse: boolean;
}

export const DEFAULT_SETTINGS: AccountSettings = {
  alertMode: "voice",
  voiceGender: "female",
  vibrate: true,
  morningSummary: false,
  morningTime: "07:00",
  cycleAlert: false,
  showFertile: false,
  palette: "rosa",
  showVerse: true,
};

// Nome de cada configuração dentro da conta (user_metadata)
const META: Record<keyof AccountSettings, string> = {
  alertMode: "alert_mode",
  voiceGender: "voice_gender",
  vibrate: "vibrate",
  morningSummary: "morning_summary",
  morningTime: "morning_time",
  cycleAlert: "cycle_alert",
  showFertile: "show_fertile",
  palette: "palette",
  showVerse: "show_verse",
};

/** As configurações ficam na própria conta (valem em todos os aparelhos). */
export function readSettings(user: User | null | undefined): AccountSettings {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const [k, col] of Object.entries(META)) if (meta[col] !== undefined && meta[col] !== null) out[k] = meta[col];
  return out as unknown as AccountSettings;
}

export async function saveSettings(patch: Partial<AccountSettings>) {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) data[META[k as keyof AccountSettings]] = v;
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}
