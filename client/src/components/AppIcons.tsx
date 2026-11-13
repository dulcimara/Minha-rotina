import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Família de ícones do Minha Rotina: um ícone por área do app, sempre o mesmo.
 * As cores vêm da paleta escolhida (--mic-1 e --mic-2), então mudam junto com o tema.
 * O microfone fica de fora: ele é só o botão de falar.
 */
export type AppIconName = "agenda" | "listas" | "ciclo" | "remedios" | "filhos" | "pets" | "aniversarios" | "filmes" | "atividade" | "lembretes" | "entendi";

const HEART = "M0 22 C-30 -4 -40 -28 -22 -40 C-10 -48 0 -40 0 -30 C0 -40 10 -48 22 -40 C40 -28 30 -4 0 22 Z";
const SPARK = "M404 78 l10 26 26 10 -26 10 -10 26 -10 -26 -26 -10 26 -10z";

function glyph(name: AppIconName, ink: string, sh: string): ReactNode {
  const fillInk = `url(#${ink})`;
  const shadow = `url(#${sh})`;
  switch (name) {
    case "agenda":
      return (
        <>
          <g filter={shadow}>
            <rect x="112" y="128" width="288" height="272" rx="56" fill="#fff" />
            <path d="M112 184 a56 56 0 0 1 56 -56 h176 a56 56 0 0 1 56 56 v26 h-288 z" fill="#fff" />
          </g>
          <path d="M112 184 a56 56 0 0 1 56 -56 h176 a56 56 0 0 1 56 56 v26 h-288 z" fill={fillInk} opacity="0.22" />
          <rect x="178" y="96" width="26" height="70" rx="13" fill="#fff" />
          <rect x="308" y="96" width="26" height="70" rx="13" fill="#fff" />
          <path transform="translate(256 318) scale(1.9)" d={HEART} fill={fillInk} />
          <path d={SPARK} fill="#fff" />
        </>
      );
    case "listas":
      return (
        <>
          <g filter={shadow}>
            <rect x="136" y="104" width="240" height="310" rx="44" fill="#fff" />
          </g>
          <rect x="206" y="84" width="100" height="46" rx="20" fill="#fff" />
          <rect x="206" y="84" width="100" height="46" rx="20" fill={fillInk} opacity="0.3" />
          <g stroke={fillInk} strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M180 196 l18 18 32 -34" />
            <path d="M180 282 l18 18 32 -34" />
          </g>
          <g stroke={fillInk} strokeOpacity="0.3" strokeWidth="20" strokeLinecap="round">
            <line x1="254" y1="200" x2="330" y2="200" />
            <line x1="254" y1="286" x2="330" y2="286" />
            <line x1="184" y1="360" x2="330" y2="360" />
          </g>
        </>
      );
    case "ciclo":
      return (
        <>
          <g filter={shadow}>
            <path d="M256 84 C256 84 380 226 380 300 a124 124 0 0 1 -248 0 C132 226 256 84 256 84z" fill="#fff" />
          </g>
          <path transform="translate(256 318) scale(1.5)" d={HEART} fill={fillInk} />
        </>
      );
    case "remedios":
      return (
        <>
          <g filter={shadow} transform="rotate(-40 256 256)">
            <rect x="116" y="196" width="280" height="120" rx="60" fill="#fff" />
          </g>
          <path transform="rotate(-40 256 256)" d="M256 196 h80 a60 60 0 0 1 0 120 h-80z" fill={fillInk} />
          <circle cx="372" cy="388" r="22" fill="#fff" />
          <path d={SPARK} fill="#fff" />
        </>
      );
    case "pets":
      return (
        <>
          <g filter={shadow}>
            <ellipse cx="256" cy="326" rx="96" ry="78" fill="#fff" />
            <ellipse cx="140" cy="238" rx="34" ry="44" fill="#fff" transform="rotate(-20 140 238)" />
            <ellipse cx="206" cy="172" rx="34" ry="44" fill="#fff" transform="rotate(-8 206 172)" />
            <ellipse cx="306" cy="172" rx="34" ry="44" fill="#fff" transform="rotate(8 306 172)" />
            <ellipse cx="372" cy="238" rx="34" ry="44" fill="#fff" transform="rotate(20 372 238)" />
          </g>
          <ellipse cx="256" cy="326" rx="96" ry="78" fill={fillInk} opacity="0.22" />
          <path d={SPARK} fill="#fff" />
        </>
      );
    case "filhos":
      return (
        <>
          <g filter={shadow}>
            <circle cx="256" cy="276" r="148" fill="#fff" />
          </g>
          <path d="M256 128 c-26 -36 10 -64 34 -44" fill="none" stroke="#fff" strokeWidth="18" strokeLinecap="round" />
          <circle cx="204" cy="262" r="16" fill={fillInk} />
          <circle cx="308" cy="262" r="16" fill={fillInk} />
          <circle cx="176" cy="314" r="20" fill={fillInk} opacity="0.25" />
          <circle cx="336" cy="314" r="20" fill={fillInk} opacity="0.25" />
          <path d="M222 322 q34 32 68 0" fill="none" stroke={fillInk} strokeWidth="16" strokeLinecap="round" />
        </>
      );
    case "aniversarios":
      return (
        <>
          <g filter={shadow}>
            <rect x="120" y="236" width="272" height="170" rx="34" fill="#fff" />
          </g>
          <path d="M120 290 q34 34 68 0 t68 0 t68 0 t68 0" fill="none" stroke={fillInk} strokeWidth="20" strokeLinecap="round" />
          <g fill="#fff">
            <rect x="176" y="160" width="20" height="64" rx="10" />
            <rect x="246" y="150" width="20" height="74" rx="10" />
            <rect x="316" y="160" width="20" height="64" rx="10" />
          </g>
          <g fill="#ffe08a">
            <ellipse cx="186" cy="138" rx="12" ry="18" />
            <ellipse cx="256" cy="126" rx="12" ry="18" />
            <ellipse cx="326" cy="138" rx="12" ry="18" />
          </g>
        </>
      );
    case "filmes":
      return (
        <>
          <g filter={shadow}>
            <rect x="116" y="196" width="280" height="206" rx="36" fill="#fff" />
          </g>
          <g transform="rotate(-14 116 196)">
            <rect x="116" y="128" width="280" height="56" rx="16" fill="#fff" />
            <g fill={fillInk}>
              <path d="M150 128 h40 l-28 56 h-40z" />
              <path d="M230 128 h40 l-28 56 h-40z" />
              <path d="M310 128 h40 l-28 56 h-40z" />
            </g>
          </g>
          <path transform="translate(256 300)" d="M0 -52 L15 -16 54 -16 23 8 34 46 0 24 -34 46 -23 8 -54 -16 -15 -16z" fill={fillInk} />
        </>
      );
    case "atividade":
      // haltere inclinado com brilho
      return (
        <>
          <g transform="rotate(-30 256 256)">
            <g filter={shadow}>
              <rect x="150" y="238" width="212" height="36" rx="18" fill="#fff" />
              <rect x="96" y="166" width="62" height="180" rx="26" fill="#fff" />
              <rect x="354" y="166" width="62" height="180" rx="26" fill="#fff" />
              <rect x="62" y="200" width="44" height="112" rx="20" fill="#fff" />
              <rect x="406" y="200" width="44" height="112" rx="20" fill="#fff" />
            </g>
            <rect x="96" y="166" width="62" height="180" rx="26" fill={fillInk} opacity="0.85" />
            <rect x="354" y="166" width="62" height="180" rx="26" fill={fillInk} opacity="0.85" />
          </g>
          <path d={SPARK} fill="#fff" />
        </>
      );
    case "lembretes":
      // sininho com laço de "não esquecer"
      return (
        <>
          <g filter={shadow}>
            <path d="M256 104 c-66 0 -112 50 -112 116 v62 c0 22 -10 42 -26 56 l-10 10 c-8 8 -2 22 10 22 h276 c12 0 18 -14 10 -22 l-10 -10 c-16 -14 -26 -34 -26 -56 v-62 c0 -66 -46 -116 -112 -116z" fill="#fff" />
          </g>
          <circle cx="256" cy="98" r="18" fill="#fff" />
          <path d="M214 392 a42 42 0 0 0 84 0z" fill={fillInk} />
          <path d="M190 236 h132" stroke={fillInk} strokeWidth="20" strokeLinecap="round" opacity="0.35" />
          <path d={SPARK} fill="#fff" />
          <circle cx="112" cy="132" r="14" fill="#fff" opacity="0.85" />
        </>
      );
    case "entendi":
      return (
        <>
          <g filter={shadow}>
            <path
              d="M256 104 c95 0 164 58 164 136 s-69 136 -164 136 c-20 0 -39 -3 -57 -8 l-74 38 18 -68 c-32 -25 -51 -60 -51 -98 c0 -78 69 -136 164 -136z"
              fill="#fff"
            />
          </g>
          <path d="M190 242 l46 44 92 -94" fill="none" stroke={fillInk} strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M406 70 l10 26 26 10 -26 10 -10 26 -10 -26 -26 -10 26 -10z" fill="#fff" />
        </>
      );
  }
}

/** Ícone ilustrado em "azulejo" com o degradê da paleta. */
export function AppIcon({ name, className, title }: { name: AppIconName; className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const bg = `bg${id}`;
  const glow = `gl${id}`;
  const ink = `ink${id}`;
  const sh = `sh${id}`;
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("h-12 w-12 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "hsl(var(--mic-1))" }} />
          <stop offset="1" style={{ stopColor: "hsl(var(--mic-2))" }} />
        </linearGradient>
        <radialGradient id={glow} cx="0.3" cy="0.2" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ink} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "hsl(var(--mic-1))", filter: "saturate(1.3)" }} />
          <stop offset="1" style={{ stopColor: "hsl(var(--mic-2))" }} />
        </linearGradient>
        <filter id={sh} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${bg})`} />
      <rect width="512" height="512" rx="116" fill={`url(#${glow})`} />
      {glyph(name, ink, sh)}
    </svg>
  );
}
