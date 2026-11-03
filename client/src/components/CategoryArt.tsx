import { cn } from "@/lib/utils";

/**
 * Pequenas ilustrações (SVG) de cada categoria de compromisso.
 * Fundo suave com a cor da categoria e um desenho simples por cima.
 */

interface Palette {
  bg: string;
  main: string;
  soft: string;
  accent: string;
}

const PALETTES: Record<string, Palette> = {
  saude: { bg: "#ffe4ea", main: "#e8486f", soft: "#ffb3c4", accent: "#ffffff" },
  familia: { bg: "#fff1d6", main: "#e89a1c", soft: "#ffd27a", accent: "#7a4b12" },
  casa: { bg: "#ddf5e6", main: "#2f9e64", soft: "#9ddcb6", accent: "#ffffff" },
  trabalho: { bg: "#e1ecff", main: "#3b6fd8", soft: "#a8c4ff", accent: "#ffffff" },
  autocuidado: { bg: "#fde4f3", main: "#d6519f", soft: "#f7b1d9", accent: "#ffe08a" },
  fitness: { bg: "#ffe8dc", main: "#ea6a2c", soft: "#ffbf9a", accent: "#ffffff" },
  lazer: { bg: "#efe4ff", main: "#8b5cd6", soft: "#cfb6ff", accent: "#ffd166" },
  outros: { bg: "#ece8f1", main: "#7b6d8d", soft: "#cbc2d6", accent: "#ffffff" },
};

function Drawing({ category, p }: { category: string; p: Palette }) {
  switch (category) {
    case "saude": // coração com cruz de saúde
      return (
        <>
          <path d="M24 38s-11-6.6-11-14.3C13 19.3 16 16.5 19.4 16.5c2 0 3.6 1 4.6 2.6 1-1.6 2.6-2.6 4.6-2.6 3.4 0 6.4 2.8 6.4 7.2C35 31.4 24 38 24 38z" fill={p.main} />
          <rect x="21.6" y="20.5" width="4.8" height="12" rx="1.2" fill={p.accent} />
          <rect x="18" y="24.1" width="12" height="4.8" rx="1.2" fill={p.accent} />
          <circle cx="36" cy="13" r="2" fill={p.soft} />
        </>
      );
    case "familia": // dois adultos e uma criança
      return (
        <>
          <circle cx="16" cy="17" r="4.5" fill={p.main} />
          <path d="M8.5 35c0-5.2 3.4-9 7.5-9s7.5 3.8 7.5 9z" fill={p.main} />
          <circle cx="32" cy="17" r="4.5" fill={p.soft} />
          <path d="M24.5 35c0-5.2 3.4-9 7.5-9s7.5 3.8 7.5 9z" fill={p.soft} />
          <circle cx="24" cy="25" r="3.4" fill={p.accent} />
          <path d="M18.8 37.5c0-4 2.3-6.8 5.2-6.8s5.2 2.8 5.2 6.8z" fill={p.accent} />
        </>
      );
    case "casa": // casinha
      return (
        <>
          <path d="M10 23.5 24 12l14 11.5" fill="none" stroke={p.main} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 22v14.5h20V22L24 14z" fill={p.main} />
          <rect x="20.5" y="27" width="7" height="9.5" rx="1.5" fill={p.accent} />
          <rect x="31" y="13" width="3.4" height="6" rx="1" fill={p.soft} />
        </>
      );
    case "trabalho": // maleta
      return (
        <>
          <path d="M19 17v-2.2a2.3 2.3 0 0 1 2.3-2.3h5.4a2.3 2.3 0 0 1 2.3 2.3V17" fill="none" stroke={p.main} strokeWidth="2.6" />
          <rect x="10" y="17" width="28" height="19" rx="3.5" fill={p.main} />
          <rect x="10" y="24" width="28" height="3" fill={p.soft} />
          <rect x="21.5" y="22.5" width="5" height="6" rx="1.2" fill={p.accent} />
        </>
      );
    case "autocuidado": // flor
      return (
        <>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx="24" cy="15.5" rx="4.6" ry="7" fill={deg % 144 === 0 ? p.main : p.soft} transform={`rotate(${deg} 24 23)`} />
          ))}
          <circle cx="24" cy="23" r="4.4" fill={p.accent} />
          <path d="M24 31v7" stroke={p.main} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case "fitness": // haltere
      return (
        <>
          <rect x="15" y="22.2" width="18" height="3.6" rx="1.8" fill={p.soft} />
          <rect x="9" y="16" width="5.5" height="16" rx="2.2" fill={p.main} />
          <rect x="33.5" y="16" width="5.5" height="16" rx="2.2" fill={p.main} />
          <rect x="13.5" y="18.5" width="3.5" height="11" rx="1.5" fill={p.main} opacity=".75" />
          <rect x="31" y="18.5" width="3.5" height="11" rx="1.5" fill={p.main} opacity=".75" />
        </>
      );
    case "lazer": // sol e ondas
      return (
        <>
          <circle cx="24" cy="21" r="7" fill={p.accent} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <rect key={deg} x="23" y="8.5" width="2" height="4" rx="1" fill={p.accent} transform={`rotate(${deg} 24 21)`} />
          ))}
          <path d="M9 32c3 0 3-2.4 6-2.4s3 2.4 6 2.4 3-2.4 6-2.4 3 2.4 6 2.4 3-2.4 6-2.4" fill="none" stroke={p.main} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M11 37.5c3 0 3-2.4 6-2.4s3 2.4 6 2.4 3-2.4 6-2.4 3 2.4 6 2.4" fill="none" stroke={p.soft} strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
    default: // calendário com estrela
      return (
        <>
          <rect x="11" y="14" width="26" height="23" rx="4" fill={p.main} />
          <rect x="11" y="14" width="26" height="6.5" rx="3" fill={p.soft} />
          <rect x="16.5" y="10.5" width="2.6" height="7" rx="1.3" fill={p.main} />
          <rect x="28.9" y="10.5" width="2.6" height="7" rx="1.3" fill={p.main} />
          <path d="m24 23.5 1.7 3.5 3.8.5-2.8 2.6.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z" fill={p.accent} />
        </>
      );
  }
}

export function CategoryArt({ category, className }: { category: string; className?: string }) {
  const key = category.toLowerCase() in PALETTES ? category.toLowerCase() : "outros";
  const p = PALETTES[key];
  return (
    <svg viewBox="0 0 48 48" className={cn("h-12 w-12 shrink-0 rounded-2xl", className)} aria-hidden="true" data-testid={`art-${key}`}>
      <rect width="48" height="48" rx="14" fill={p.bg} />
      <Drawing category={key} p={p} />
    </svg>
  );
}

export const ART_CATEGORIES = Object.keys(PALETTES);
