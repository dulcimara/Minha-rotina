/**
 * Catálogo com 150 itens de supermercado muito comprados no Brasil, por seção.
 *
 * Não existe um ranking público oficial com exatamente 150 itens; esta lista foi
 * montada a partir de pesquisas de consumo (Abimapi: pão e macarrão em mais de 94%
 * dos lares; levantamento da VR por notas fiscais: hortifrúti, leites e iogurtes,
 * grãos entre os mais comprados; categorias de consumo massivo da Kantar) e dos
 * itens da cesta básica. Serve para sugerir itens ao montar a lista de compras.
 */
const RAW: { section: string; items: string[] }[] = [
  { section: "Mercearia", items: ["Arroz", "Feijão", "Macarrão", "Açúcar", "Café", "Óleo de soja", "Sal", "Farinha de trigo", "Farinha de mandioca", "Fubá", "Aveia", "Molho de tomate", "Extrato de tomate", "Maionese", "Ketchup", "Mostarda", "Azeite", "Vinagre", "Milho em conserva", "Ervilha em conserva", "Atum em lata", "Sardinha em lata", "Leite condensado", "Creme de leite", "Achocolatado", "Biscoito recheado", "Biscoito cream cracker", "Biscoito de maizena", "Macarrão instantâneo", "Tempero pronto", "Caldo de galinha", "Gelatina", "Fermento em pó", "Chá", "Granola", "Pipoca de micro-ondas", "Amendoim", "Chocolate", "Cereal matinal", "Mel"] },
  { section: "Hortifrúti", items: ["Banana", "Maçã", "Laranja", "Limão", "Mamão", "Melancia", "Uva", "Abacaxi", "Manga", "Tomate", "Batata", "Cebola", "Alho", "Cenoura", "Alface", "Abobrinha", "Pimentão", "Chuchu", "Pepino", "Brócolis", "Couve", "Batata-doce", "Mandioca", "Abóbora", "Cheiro-verde"] },
  { section: "Padaria e matinais", items: ["Pão francês", "Pão de forma", "Bolo pronto", "Torrada", "Pão de queijo"] },
  { section: "Laticínios e frios", items: ["Leite", "Manteiga", "Margarina", "Queijo muçarela", "Requeijão", "Iogurte", "Presunto", "Queijo minas", "Queijo ralado", "Ovos", "Bebida láctea", "Peito de peru"] },
  { section: "Carnes", items: ["Frango", "Peito de frango", "Carne moída", "Linguiça", "Salsicha", "Bife de alcatra", "Acém", "Costela", "Carne suína", "Peixe", "Hambúrguer", "Nuggets", "Bacon"] },
  { section: "Bebidas", items: ["Água mineral", "Refrigerante", "Suco de caixinha", "Suco em pó", "Cerveja", "Água com gás", "Energético"] },
  { section: "Congelados", items: ["Pizza congelada", "Lasanha congelada", "Batata frita congelada", "Sorvete", "Polpa de fruta", "Legumes congelados"] },
  { section: "Limpeza", items: ["Detergente", "Sabão em pó", "Sabão líquido", "Amaciante", "Água sanitária", "Desinfetante", "Esponja", "Sabão em barra", "Limpador multiuso", "Saco de lixo", "Papel toalha", "Álcool", "Limpa-vidros", "Inseticida", "Pano de chão", "Papel alumínio", "Filme plástico"] },
  { section: "Higiene e beleza", items: ["Papel higiênico", "Sabonete", "Creme dental", "Escova de dentes", "Xampu", "Condicionador", "Desodorante", "Absorvente", "Fio dental", "Aparelho de barbear", "Hidratante", "Algodão", "Cotonete", "Protetor solar", "Lenço de papel", "Enxaguante bucal"] },
  { section: "Bebê", items: ["Fralda", "Lenço umedecido", "Pomada para assadura", "Leite em pó", "Papinha"] },
  { section: "Pet", items: ["Ração para cachorro", "Ração para gato", "Areia para gato", "Petisco para pet"] },
];

const byName = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

/** Catálogo em ordem alfabética: as seções e, dentro de cada uma, os itens. */
export const CATALOG: { section: string; items: string[] }[] = RAW.map((s) => ({ section: s.section, items: [...s.items].sort(byName) })).sort(
  (a, b) => byName(a.section, b.section),
);

export const CATALOG_ITEMS: string[] = CATALOG.flatMap((s) => s.items);

/** Seção do catálogo de um item (para organizar a lista como no mercado). */
export function sectionOf(name: string): string | undefined {
  const n = normalize(name);
  for (const s of CATALOG) if (s.items.some((i) => normalize(i) === n)) return s.section;
  return undefined;
}

export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/**
 * Sugestões para o campo de item enquanto a pessoa digita.
 * Junta o catálogo com o que ela já comprou; primeiro o que começa com o texto,
 * depois o que tem uma palavra começando com ele, depois o que só contém.
 */
export function suggestItems(query: string, extra: string[] = [], limit = 6): string[] {
  const q = normalize(query);
  if (q.length < 1) return [];
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const n of [...extra, ...CATALOG_ITEMS]) {
    const k = normalize(n);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    pool.push(n);
  }
  const rank = (n: string) => {
    const k = normalize(n);
    if (k === q) return -1;
    if (k.startsWith(q)) return 0;
    if (k.split(/[\s-]+/).some((w) => w.startsWith(q))) return 1;
    if (k.includes(q)) return 2;
    return 9;
  };
  return pool
    .map((n) => ({ n, r: rank(n) }))
    .filter((x) => x.r < 9)
    .sort((a, b) => a.r - b.r || byName(a.n, b.n))
    .slice(0, limit)
    .map((x) => x.n);
}
