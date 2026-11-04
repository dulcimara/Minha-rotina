/**
 * Estatísticas de uso com o Google Analytics 4 — só com o consentimento da pessoa.
 *
 * Regras (LGPD):
 * - Só carrega o Google Analytics se a pessoa disser sim (Configurações > Estatísticas de uso).
 * - Nunca envia nome, e-mail, id da conta ou o conteúdo do que ela cadastrou.
 * - Nada de saúde: ciclo, remédios, vacinas e filhos não geram eventos para o Google
 *   (esses números aparecem só na área de gestão, dentro do nosso banco).
 * - Sem anúncios e sem "Google Signals".
 *
 * O código de medição (G-XXXXXXX) vem da variável VITE_GA_ID no Netlify. Sem ela, nada é enviado.
 */

const GA_ID = (import.meta.env.VITE_GA_ID as string | undefined)?.trim();

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let loaded = false;

export const analyticsAvailable = () => Boolean(GA_ID);

/** Liga o Google Analytics (uma vez) se houver código e consentimento. */
export function startAnalytics(consent: boolean) {
  if (!GA_ID || !consent || loaded || typeof window === "undefined") return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.gtag = function gtag() {
    // o gtag espera o objeto "arguments", não um array
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, {
    send_page_view: false, // as telas são enviadas por trackScreen, sem endereço completo
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: `${window.location.origin}/`,
  });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

/** Desliga: para de enviar e apaga os cookies do Google Analytics deste aparelho. */
export function stopAnalytics() {
  if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_")) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
  loaded = false;
  window.gtag = undefined;
}

// Áreas que nunca vão para o Google (dados de saúde e de crianças)
const PRIVATE = new Set(["ciclo", "remedios", "filhos", "vacinas", "period_start", "period_end", "medication"]);

export type AnalyticsEvent =
  | "tela"
  | "usou_voz"
  | "criou_compromisso"
  | "criou_lembrete"
  | "item_lista"
  | "compras_feitas"
  | "compartilhou"
  | "instalou_app"
  | "cadastro"
  | "primeiro_acesso_concluido";

/** Envia um evento simples, sem dados pessoais. Sem consentimento, não faz nada. */
export function track(event: AnalyticsEvent, params: Record<string, string | number> = {}) {
  if (!loaded || !window.gtag) return;
  const values = Object.values(params).map(String);
  if (values.some((v) => PRIVATE.has(v))) return;
  window.gtag("event", event, params);
}

/** Troca de aba/tela (o ciclo nunca é enviado). */
export function trackScreen(screen: string) {
  if (PRIVATE.has(screen)) return;
  track("tela", { tela: screen });
}
