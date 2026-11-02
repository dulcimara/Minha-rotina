import { useCallback, useEffect, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useActivities, useBirthdays } from "@/hooks/use-data";
import { displayName, useAuth } from "@/hooks/use-auth";
import { playChime, vibrate } from "@/lib/alarm-sound";
import { speak } from "@/lib/speech";
import { nextBirthdayDate, type Activity, type Birthday } from "@/lib/data";
import { alertSentence } from "@/lib/alert-text";

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
  spoken: string;
  gender?: "male" | "female";
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
  };
}

function birthdayAlert(b: Birthday, now: Date, name?: string): AlertItem | null {
  if (now.getHours() < BIRTHDAY_HOUR) return null;
  if (!isSameDay(nextBirthdayDate(b, now), now)) return null;
  const age = b.birthYear ? now.getFullYear() - b.birthYear : undefined;
  return {
    key: `bday:${b.id}:${format(now, "yyyy-MM-dd")}`,
    title: `Aniversário de ${b.name} 🎂`,
    subtitle: age ? `Hoje faz ${age} anos` : "É hoje!",
    spoken: `${name ? `${name}, hoje` : "Hoje"} é aniversário de ${b.name}. Não esqueça de dar os parabéns!`,
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
  const { user } = useAuth();
  const name = displayName(user);
  const [queue, setQueue] = useState<AlertItem[]>([]);
  const fired = useRef<Set<string>>(loadFired());
  const snoozed = useRef<{ item: AlertItem; at: number }[]>([]);

  const trigger = useCallback((item: AlertItem) => {
    setQueue((q) => (q.some((i) => i.key === item.key) ? q : [...q, item]));
    // Um toque curto e, logo em seguida, a voz.
    playChime(1);
    vibrate();
    setTimeout(() => speak(item.spoken, item.gender), 900);
    void systemNotification(item);
  }, []);

  const check = useCallback(() => {
    const now = new Date();
    const due: AlertItem[] = [];

    for (const a of activities) {
      const item = activityAlert(a, now, name);
      if (item && !fired.current.has(item.key)) due.push(item);
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
  }, [activities, birthdays, trigger, name]);

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

export async function enableAlerts(): Promise<string> {
  playChime(1);
  let status = notificationsStatus();
  if (status === "default") {
    try {
      status = await Notification.requestPermission();
    } catch {
      // Safari antigo
    }
  }
  try {
    localStorage.setItem("minha-rotina:alertas-ativados", "1");
  } catch {
    // ignora
  }
  speak("Pronto! Os alertas estão ativados.");
  return status;
}

export function alertsWereEnabled(): boolean {
  try {
    return localStorage.getItem("minha-rotina:alertas-ativados") === "1";
  } catch {
    return false;
  }
}
