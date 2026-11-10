import livro from "./proverbios.json";

/**
 * Versículo do dia: sorteado de Provérbios (Almeida Revista e Corrigida, 1911, domínio público).
 * O texto vem junto com o app (proverbios.json), então não há busca na internet
 * e o versículo não some quando um serviço externo sai do ar.
 */
export interface Verse {
  ref: string; // "Provérbios 3:5"
  text: string;
}

interface Capitulo {
  numero: number;
  versiculos: string[];
}

const capitulos = livro.capitulos as Capitulo[];

const todos: Verse[] = capitulos.flatMap((c) =>
  c.versiculos.map((text, i) => ({ ref: `${livro.livro} ${c.numero}:${i + 1}`, text })),
);

// Passo coprimo com o total de versículos (915): cada dia cai num versículo diferente
// e a ordem não segue o livro. Mudar o passo muda a sequência dos dias.
const PASSO = 397;

/** Mesmo versículo o dia todo; muda à meia-noite (horário local). */
export function versiculoDoDia(hoje: Date = new Date()): Verse {
  const dia = Math.floor(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) / 86_400_000);
  const n = todos.length;
  const indice = (((dia % n) + n) % n * PASSO) % n;
  return todos[indice];
}
