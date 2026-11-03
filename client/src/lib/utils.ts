import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "segunda-feira, 2 de novembro" -> "Segunda-feira, 2 de novembro" */
export const upperFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
