import { useEffect, useState } from "react";

/**
 * Instalação do app (PWA).
 * - Android/Chrome/Edge: o navegador dispara "beforeinstallprompt"; guardamos o evento e
 *   mostramos a janela nativa de instalação quando a pessoa toca em "Instalar o app".
 * - iPhone/iPad: a Apple não permite instalar por botão; mostramos o passo a passo do Safari.
 */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export type Platform = "android" | "ios" | "ios-other-browser" | "desktop";

let deferred: InstallPrompt | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installedNow = true;
    deferred = null;
    notify();
  });
}

export function platform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return /crios|fxios|edgios|gsa\//i.test(ua) ? "ios-other-browser" : "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/** Já está aberto como app instalado (tela cheia, sem barra do navegador)? */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Abre a janela nativa de instalação. Retorna true se a pessoa instalou. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  deferred = null;
  if (outcome === "accepted") installedNow = true;
  notify();
  return outcome === "accepted";
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return {
    installed: installedNow || isStandalone(),
    canPrompt: deferred !== null,
    platform: platform(),
  };
}

// Banner da tela inicial: depois de fechado, volta só em 7 dias.
const KEY = "minha-rotina:instalar-dispensado";
export function bannerDismissed(): boolean {
  try {
    const t = Number(localStorage.getItem(KEY));
    return Boolean(t) && Date.now() - t < 7 * 864e5;
  } catch {
    return false;
  }
}
export function dismissBanner() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* sem armazenamento: o banner volta na próxima vez */
  }
}
