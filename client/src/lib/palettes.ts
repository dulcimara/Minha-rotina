import { useEffect, useState } from "react";

/**
 * Paletas de cores do app. Cada uma troca as cores principais (botões,
 * fundos, cartões e degradês) no modo claro e no escuro.
 * Valores em HSL sem "hsl()", como o resto do tema (index.css).
 */

export interface Palette {
  id: string;
  name: string;
  /** cores para a amostra (bolinhas) na escolha */
  swatches: [string, string, string];
  light: Record<string, string>;
  dark: Record<string, string>;
}

function build(
  id: string,
  name: string,
  h: number, // matiz principal
  p: { primary: string; accent: string; hero: [string, string, string]; mic: [string, string]; fgHue?: number },
  swatches: [string, string, string],
): Palette {
  const fg = p.fgHue ?? h;
  return {
    id,
    name,
    swatches,
    light: {
      "--primary": p.primary,
      "--ring": p.primary,
      "--accent": p.accent,
      "--background": `${h} 70% 97%`,
      "--card": `${h} 100% 99%`,
      "--popover": `${h} 80% 98%`,
      "--secondary": `${h} 75% 91%`,
      "--secondary-foreground": `${fg} 38% 28%`,
      "--muted": `${h} 55% 94%`,
      "--muted-foreground": `${fg} 12% 42%`,
      "--border": `${h} 38% 88%`,
      "--card-border": `${h} 42% 91%`,
      "--input": `${h} 22% 79%`,
      "--hero-1": p.hero[0],
      "--hero-2": p.hero[1],
      "--hero-3": p.hero[2],
      "--mic-1": p.mic[0],
      "--mic-2": p.mic[1],
    },
    dark: {
      "--primary": p.primary.replace(/(\d+)%$/, (_m, l) => `${Math.min(70, Number(l) + 8)}%`),
      "--ring": p.primary,
      "--accent": p.accent,
      "--background": `${h} 14% 10%`,
      "--card": `${h} 14% 13%`,
      "--popover": `${h} 14% 15%`,
      "--secondary": `${h} 28% 24%`,
      "--muted": `${h} 14% 19%`,
      "--border": `${h} 12% 22%`,
      "--card-border": `${h} 12% 19%`,
      "--hero-1": `${h} 30% 22%`,
      "--hero-2": `${h} 24% 19%`,
      "--hero-3": `${h} 20% 17%`,
      "--mic-1": p.mic[0],
      "--mic-2": p.mic[1],
    },
  };
}

export const PALETTES: Palette[] = [
  build(
    "rosa",
    "Rosa e lilás",
    340,
    {
      primary: "285 42% 52%",
      accent: "338 78% 70%",
      hero: ["340 90% 92%", "300 60% 92%", "285 55% 88%"],
      mic: ["338 78% 72%", "285 42% 52%"],
      fgHue: 300,
    },
    ["#f4a3c0", "#d8a6e6", "#9b51b5"],
  ),
  build(
    "lavanda",
    "Lavanda",
    262,
    {
      primary: "262 52% 54%",
      accent: "282 62% 70%",
      hero: ["262 80% 93%", "240 60% 93%", "282 55% 90%"],
      mic: ["282 62% 70%", "262 52% 54%"],
    },
    ["#c9b8f5", "#b39ddb", "#6f4fc9"],
  ),
  build(
    "pessego",
    "Pêssego",
    22,
    {
      primary: "10 66% 50%",
      accent: "28 92% 64%",
      hero: ["28 95% 91%", "12 80% 92%", "345 70% 92%"],
      mic: ["28 92% 64%", "10 66% 50%"],
      fgHue: 15,
    },
    ["#ffc9a8", "#f8a07a", "#d4502e"],
  ),
  build(
    "menta",
    "Verde menta",
    162,
    {
      primary: "168 58% 33%",
      accent: "148 48% 52%",
      hero: ["152 60% 90%", "172 50% 90%", "192 55% 91%"],
      mic: ["148 48% 52%", "168 58% 33%"],
    },
    ["#b5ead7", "#6fcf97", "#23826f"],
  ),
  build(
    "ceu",
    "Azul céu",
    212,
    {
      primary: "216 62% 48%",
      accent: "196 78% 54%",
      hero: ["200 85% 92%", "220 70% 93%", "245 60% 93%"],
      mic: ["196 78% 54%", "216 62% 48%"],
    },
    ["#b8dcf7", "#5fb5ea", "#2e64c5"],
  ),
  build(
    "girassol",
    "Girassol",
    42,
    {
      primary: "30 82% 38%",
      accent: "44 94% 54%",
      hero: ["50 95% 88%", "38 90% 89%", "22 85% 91%"],
      mic: ["44 94% 54%", "30 82% 38%"],
      fgHue: 30,
    },
    ["#ffe08a", "#f7b733", "#b2620f"],
  ),
];

export const paletteById = (id?: string) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

const STORAGE_KEY = "minha-rotina:paleta";

const css = (vars: Record<string, string>) =>
  Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");

/** Aplica a paleta no app inteiro (e lembra neste aparelho, para abrir já com as cores certas). */
export function applyPalette(id?: string) {
  const p = paletteById(id);
  let el = document.getElementById("palette-vars") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "palette-vars";
    document.head.appendChild(el);
  }
  el.textContent = `:root { ${css(p.light)} } .dark { ${css(p.dark)} }`;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", `hsl(${p.light["--primary"]})`);
  try {
    localStorage.setItem(STORAGE_KEY, p.id);
  } catch {
    // armazenamento bloqueado: segue sem lembrar
  }
  applyAppIcon(p.id);
  current = p.id;
  window.dispatchEvent(new CustomEvent("palette-change", { detail: p.id }));
}

// ---------------------------------------------------------------
// Logo nas cores da paleta: topo do app, aba do navegador e ícone instalado
// ---------------------------------------------------------------

let current = "rosa";

/** Endereço do ícone do app na cor da paleta (pasta /icons/<paleta>/). */
export function iconUrl(file: "icon-192.png" | "icon-512.png" | "favicon.png" | "apple-touch-icon.png" | "icon-maskable-512.png", id = current) {
  return `/icons/${paletteById(id).id}/${file}`;
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  if (el.getAttribute("href") !== href) el.href = href;
}

let manifestUrl: string | undefined;

/**
 * Troca o ícone da aba e o ícone usado na instalação (Android: manifest; iPhone: apple-touch-icon).
 * O celular guarda o ícone no momento em que o app é instalado.
 */
function applyAppIcon(id: string) {
  setLink("icon", iconUrl("favicon.png", id));
  setLink("apple-touch-icon", iconUrl("apple-touch-icon.png", id));
  if (id === "rosa") {
    setLink("manifest", "/manifest.webmanifest");
    return;
  }
  const origin = window.location.origin;
  fetch("/manifest.webmanifest")
    .then((r) => r.json())
    .then((m: Record<string, unknown>) => {
      const abs = (u: string) => (u.startsWith("http") ? u : origin + u);
      const manifest = {
        ...m,
        id: abs("/"),
        start_url: abs("/"),
        scope: abs("/"),
        icons: [
          { src: abs(iconUrl("icon-192.png", id)), sizes: "192x192", type: "image/png", purpose: "any" },
          { src: abs(iconUrl("icon-512.png", id)), sizes: "512x512", type: "image/png", purpose: "any" },
          { src: abs(iconUrl("icon-maskable-512.png", id)), sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: ((m.screenshots as { src: string }[]) ?? []).map((sc) => ({ ...sc, src: abs(sc.src) })),
        shortcuts: ((m.shortcuts as { url: string }[]) ?? []).map((sc) => ({
          ...sc,
          url: abs(sc.url),
          icons: [{ src: abs(iconUrl("icon-192.png", id)), sizes: "192x192" }],
        })),
      };
      if (manifestUrl) URL.revokeObjectURL(manifestUrl);
      manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
      setLink("manifest", manifestUrl);
    })
    .catch(() => undefined);
}

/** Paleta atual, atualizando a tela quando muda. */
export function usePaletteId(): string {
  const [id, setId] = useState(current);
  useEffect(() => {
    const on = (e: Event) => setId((e as CustomEvent<string>).detail);
    window.addEventListener("palette-change", on);
    setId(current);
    return () => window.removeEventListener("palette-change", on);
  }, []);
  return id;
}

/** Endereço do ícone do app na paleta atual, para usar em <img>. */
export function useAppIcon(file: Parameters<typeof iconUrl>[0] = "icon-192.png"): string {
  return iconUrl(file, usePaletteId());
}

export function cachedPalette(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
