import { supabase } from "@/lib/supabase";

/**
 * Notificações com o app fechado (Web Push).
 * A chave pública vem da função "enviar-avisos" do Supabase; cada aparelho
 * inscrito fica na tabela push_subscriptions.
 */

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-avisos`;

export type PushState = "unsupported" | "denied" | "off" | "on" | "needs-install";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function base64ToBytes(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
}

export async function pushState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // No iPhone, só funciona com o app instalado na tela inicial.
    return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Pede permissão, inscreve este aparelho e salva no Supabase. */
export async function enablePush(): Promise<PushState> {
  const state = await pushState();
  if (state === "unsupported" || state === "needs-install" || state === "denied") return state;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const res = await fetch(`${FUNCTION_URL}?acao=chave`);
  if (!res.ok) throw new Error("O servidor de avisos ainda não está ligado (função enviar-avisos no Supabase).");
  const { publicKey } = (await res.json()) as { publicKey: string };

  const reg = await registration();
  if (!reg) return "unsupported";
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToBytes(publicKey) as BufferSource,
    });
  }

  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
  return "on";
}

/** Para de receber notificações neste aparelho. */
export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
  return "off";
}

export const pushHelp: Record<PushState, string> = {
  on: "Ligado neste aparelho. Os avisos chegam mesmo com o app fechado.",
  off: "Desligado neste aparelho.",
  denied: "Bloqueado pelo navegador. Libere as notificações nas configurações do site (cadeado ao lado do endereço).",
  "needs-install": "No iPhone, primeiro instale o app: Safari → Compartilhar → Adicionar à Tela de Início. Depois abra por lá e ligue aqui.",
  unsupported: "Este navegador não recebe notificações. Use o Chrome no Android ou o app instalado no iPhone.",
};
