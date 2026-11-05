import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * "Entrar com Google" pelo Supabase.
 *
 * O botão só aparece quando o Google está ligado no Supabase
 * (Authentication → Sign In / Providers → Google). Assim, enquanto não estiver
 * configurado, ninguém vê um botão que dá erro.
 */

const CACHE_KEY = "mr-google-login";

async function fetchGoogleEnabled(): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
  if (!url || !key) return false;
  try {
    // Endereço público do Supabase que diz quais formas de entrar estão ligadas.
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return false;
    const data = (await res.json()) as { external?: { google?: boolean } };
    return data.external?.google === true;
  } catch {
    return false;
  }
}

export function useGoogleLoginAvailable(): boolean {
  const [available, setAvailable] = useState(() => {
    try {
      return sessionStorage.getItem(CACHE_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let alive = true;
    void fetchGoogleEnabled().then((on) => {
      if (!alive) return;
      setAvailable(on);
      try {
        sessionStorage.setItem(CACHE_KEY, on ? "1" : "0");
      } catch {
        // navegador sem armazenamento: só não guarda
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  return available;
}

/** Abre a tela do Google; depois de escolher a conta, a pessoa volta para o app já logada. */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      // Sempre deixa escolher a conta (útil quando há mais de um Gmail no celular).
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}

/** Conta criada pelo Google ainda não aceitou a política nem informou o nascimento. */
export function needsSignupCompletion(meta: Record<string, unknown> | undefined): boolean {
  return !meta?.privacy_accepted_at;
}
