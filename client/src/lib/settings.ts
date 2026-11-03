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
}

export const DEFAULT_SETTINGS: AccountSettings = { alertMode: "voice", voiceGender: "female", vibrate: true };

/** As configurações ficam na própria conta (valem em todos os aparelhos). */
export function readSettings(user: User | null | undefined): AccountSettings {
  const meta = (user?.user_metadata ?? {}) as Partial<{ alert_mode: AlertMode; voice_gender: "female" | "male"; vibrate: boolean }>;
  return {
    alertMode: meta.alert_mode ?? DEFAULT_SETTINGS.alertMode,
    voiceGender: meta.voice_gender ?? DEFAULT_SETTINGS.voiceGender,
    vibrate: meta.vibrate ?? DEFAULT_SETTINGS.vibrate,
  };
}

export async function saveSettings(patch: Partial<AccountSettings>) {
  const data: Record<string, unknown> = {};
  if (patch.alertMode) data.alert_mode = patch.alertMode;
  if (patch.voiceGender) data.voice_gender = patch.voiceGender;
  if (patch.vibrate !== undefined) data.vibrate = patch.vibrate;
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}
