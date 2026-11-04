import { useCallback, useEffect, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useActivities, useBirthdays, useChildren, useDoses, useMedications, useReminders } from "@/hooks/use-data";
import { dosesOn } from "@/lib/meds";
import { displayName, useAuth } from "@/hooks/use-auth";
import { readSettings, type AlertMode } from "@/lib/settings";
import { playChime, vibrate } from "@/lib/alarm-sound";
import { speak } from "@/lib/speech";
import { nextBirthdayDate, type Activity, type Birthday } from "@/lib/data";
import { alertSentence } from "@/lib/alert-text";
import { occurrencesBetween } from "@/lib/recurrence";
import { isMinor, vaccineDates } from "@/lib/vacinas";

/**
 * Confere a cada 15 segundos se chegou a hora de algum aviso.
 *
 * Limite do protótipo: só funciona com o app ABERTO (na tela ou em segundo
 * plano no navegador). Avisos com o app fechado precisam de notificações
 * enviadas por um servidor — é a próxima etapa.
 */

export interface AlertItem {
  key: string;
  title: string;
  subtitle: string;
  address?: string;
  phone?: string;
  /** aviso de remédio: permite marcar "Tomei" direto no alerta */
  dose?: { medicationId: string; day: string; time: string };
  spoken: string;
  gender?: "male" | "female";
  /** a pessoa escreveu uma frase para este aviso: fala mesmo no modo "só som" */
  customVoice?: boolean;
}

const CHECK_EVERY_MS = 15_000;
const LATE_TOLERANCE_MS = 15 * 60_000; // avisa até 15 min depois (ex.: celular estava bloqueado)
const BIRTHDAY_HOUR = 9;
const STORAGE_KEY = "minha-rotina:avisos-disparados";

function loadFired(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveFired(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set).slice(-300)));
  } catch {
    // modo anônimo ou armazenamento bloqueado: só não lembra entre visitas
  }
}

function activityAlert(a: Activity, now: Date, name?: string): AlertItem | null {
  if (!a.reminderEnabled || a.completed || !a.reminderDateTime) return null;
  const at = a.reminderDateTime.getTime();
  const diff = now.getTime() - at;
  if (diff < 0 || diff > LATE_TOLERANCE_MS) return null;

  const minutesLeft = Math.round((a.date.getTime() - now.getTime()) / 60_000);
  const when =
    minutesLeft <= 0
      ? "É agora!"
      : minutesLeft < 60
        ? `Em ${minutesLeft} ${minutesLeft === 1 ? "minuto" : "minutos"}`
        : `${format(a.date, "EEEE 'às' HH:mm", { locale: ptBR })}`;
  const hour = format(a.date, "HH:mm");

  return {
    key: `act:${a.id}:${at}`,
    title: a.title,
    subtitle: `${when} · ${hour}`,
    address: a.address,
    phone: a.phone,
    spoken:
      a.reminderType === "voice" && a.reminderVoiceText
        ? (name ? `${name}, ` : "") + a.reminderVoiceText
        : alertSentence(a, now, name),
    gender: a.reminderVoiceGender,
    customVoice: a.reminderType === "voice" && Boolean(a.reminderVoiceText),
  };
}

function birthdayAlert(b: Birthday, now: Date, name?: string): AlertItem | null {
  if (now.getHours() < BIRTHDAY_HOUR) return null;
  if (!isSameDay(nextBirthdayDate(b, now), now)) return null;
  const age = b.birthYear ? now.getFullYear() - b.birthYear : undefined;
  return {
    key: `bday:${b.id}:${format(now, "yyyy-MM-dd")}`,
    title: `Aniversário de ${b.name} 🎂`,
    subtitle: (age ? `Hoje faz ${age} anos` : "É hoje!") + (b.giftIdeas ? ` · 🎁 ${b.giftIdeas}` : ""),
    spoken: `${name ? `${name}, hoje` : "Hoje"} é aniversário de ${b.name}. Não esqueça de dar os parabéns!${b.giftIdeas ? ` Ideia de presente: ${b.giftIdeas}.` : ""}`,
  };
}

async function systemNotification(item: AlertItem) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // na tela já aparece a janela do app
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const options = { body: item.subtitle, icon: "/icon-192.png", badge: "/icon-192.png", tag: item.key };
    if (reg) await reg.showNotification(item.title, options);
    else new Notification(item.title, options);
  } catch {
    // alguns navegadores não permitem: segue só com som
  }
}

export function useAlerts() {
  const { data: activities = [] } = useActivities();
  const { data: birthdays = [] } = useBirthdays();
  const { data: meds = [] } = useMedications();
  const { data: dosesTaken = [] } = useDoses();
  const { data: children = [] } = useChildren();
  const { data: reminders = [] } = useReminders();
  const { user } = useAuth();
  const name = displayName(user);
  const settings = readSettings(user);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [queue, setQueue] = useState<AlertItem[]>([]);
  const fired = useRef<Set<string>>(loadFired());
  const snoozed = useRef<{ item: AlertItem; at: number }[]>([]);

  const trigger = useCallback((item: AlertItem) => {
    setQueue((q) => (q.some((i) => i.key === item.key) ? q : [...q, item]));
    // Conforme a configuração da conta: toque + voz, só som, ou silencioso.
    const { alertMode, voiceGender, vibrate: shouldVibrate } = settingsRef.current;
    // Frase escrita para o aviso fala mesmo no modo "só som"; o silencioso é respeitado.
    if (alertMode === "voice" || (alertMode === "sound" && item.customVoice)) {
      playChime(1);
      setTimeout(() => speak(item.spoken, item.gender ?? voiceGender), 900);
    } else if (alertMode === "sound") {
      playChime(3);
    }
    if (shouldVibrate) vibrate();
    void systemNotification(item);
  }, []);

  const check = useCallback(() => {
    const now = new Date();
    const due: AlertItem[] = [];

    // Inclui as repetições de hoje (e de ontem/amanhã, por causa dos avisos com antecedência).
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    for (const a of occurrencesBetween(activities, yesterday, tomorrow)) {
      const item = activityAlert(a, now, name);
      if (item && !fired.current.has(item.key)) due.push(item);
    }
    // Remédios: em cada horário, até 15 min depois
    for (const s of dosesOn(meds, dosesTaken, now)) {
      if (!s.med.reminder || s.taken) continue;
      const diff = now.getTime() - s.at.getTime();
      if (diff < 0 || diff > LATE_TOLERANCE_MS) continue;
      const forWho = children.find((c) => c.id === s.med.childId)?.name;
      const key = `med:${s.med.id}:${s.day}:${s.time}`;
      if (fired.current.has(key)) continue;
      due.push({
        key,
        title: `💊 ${s.med.name}`,
        subtitle: `${s.time}${s.med.dose ? ` · ${s.med.dose}` : ""}${forWho ? ` · para ${forWho}` : ""}${s.med.notes ? ` · ${s.med.notes}` : ""}`,
        spoken: `${name ? `${name}, h` : "H"}ora do remédio${forWho ? ` do ${forWho}` : ""}: ${s.med.name}${s.med.dose ? `, ${s.med.dose}` : ""}.`,
        dose: { medicationId: s.med.id, day: s.day, time: s.time },
      });
    }

    // Lembretes: na data e hora escolhidas
    for (const r of reminders) {
      if (r.doneAt || !r.alert || !r.dueDate) continue;
      const at = new Date(`${r.dueDate}T${r.dueTime || "09:00"}:00`);
      const diff = now.getTime() - at.getTime();
      if (Number.isNaN(diff) || diff < 0 || diff > LATE_TOLERANCE_MS) continue;
      const key = `rem:${r.id}:${r.dueDate}`;
      if (fired.current.has(key)) continue;
      due.push({
        key,
        title: `${r.emoji ?? "🔔"} ${r.text}`,
        subtitle: `Lembrete · ${r.dueTime || "09:00"}${r.notes ? ` · ${r.notes}` : ""}`,
        spoken: r.voiceText
          ? (name ? `${name}, ` : "") + r.voiceText
          : `${name ? `${name}, l` : "L"}embrete: ${r.text}.${r.notes ? ` ${r.notes}.` : ""}`,
        gender: r.voiceText ? r.voiceGender : undefined,
        customVoice: Boolean(r.voiceText),
      });
    }

    // Vacinas dos filhos menores de 18: uma semana antes de atingir a idade, às 9h
    if (now.getHours() >= BIRTHDAY_HOUR) {
      const todayKey = format(now, "yyyy-MM-dd");
      for (const c of children) {
        if (!c.birthDate || !isMinor(c.birthDate, now)) continue;
        for (const v of vaccineDates(c.birthDate)) {
          if (v.alertKey !== todayKey || v.months === 0) continue;
          const key = `vac:${c.id}:${v.months}`;
          if (fired.current.has(key)) continue;
          due.push({
            key,
            title: `💉 Vacinas de ${c.name}`,
            subtitle: `${v.label} em ${format(v.date, "dd/MM")} · ${v.vaccines.join(", ")}`,
            spoken: `${name ? `${name}, ` : ""}daqui a uma semana ${c.name} completa ${v.label} e pode tomar: ${v.vaccines
              .map((x) => x.replace(/\s*\(.*?\)/g, ""))
              .join(", ")}. Leve a caderneta de vacinação ao posto de saúde.`,
          });
        }
      }
    }

    for (const b of birthdays) {
      const item = birthdayAlert(b, now, name);
      if (item && !fired.current.has(item.key)) due.push(item);
    }
    const ready = snoozed.current.filter((s) => s.at <= now.getTime());
    snoozed.current = snoozed.current.filter((s) => s.at > now.getTime());
    for (const s of ready) due.push({ ...s.item, key: `${s.item.key}:adiado:${s.at}` });

    if (due.length) {
      due.forEach((d) => fired.current.add(d.key));
      saveFired(fired.current);
      due.forEach(trigger);
    }
  }, [activities, birthdays, meds, dosesTaken, children, reminders, trigger, name]);

  useEffect(() => {
    check();
    const id = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  const dismiss = () => {
    window.speechSynthesis?.cancel();
    setQueue((q) => q.slice(1));
  };

  const snooze = (minutes = 5) => {
    const current = queue[0];
    if (current) snoozed.current.push({ item: current, at: Date.now() + minutes * 60_000 });
    dismiss();
  };

  return { current: queue[0] ?? null, dismiss, snooze };
}

// ---------------------------------------------------------------
// Permissão de notificações
// ---------------------------------------------------------------

export function notificationsStatus(): "granted" | "denied" | "default" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Pede permissão para notificações neste aparelho. */
export async function requestNotifications(): Promise<string> {
  let status = notificationsStatus();
  if (status === "default") {
    try {
      status = await Notification.requestPermission();
    } catch {
      // Safari antigo
    }
  }
  return status;
}

/** Toca um exemplo do aviso, do jeito escolhido. */
export function testAlert(mode: AlertMode, gender: "female" | "male", name?: string) {
  if (mode === "voice") {
    playChime(1);
    setTimeout(
      () => speak(`${name ? `${name}, d` : "D"}entro de 10 minutos você tem consulta médica, no endereço Rua das Flores, 123.`, gender),
      900,
    );
  } else if (mode === "sound") {
    playChime(3);
  }
}
