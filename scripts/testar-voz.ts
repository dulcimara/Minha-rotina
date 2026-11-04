/**
 * Teste rápido do interpretador de voz.
 * Como rodar: npm run testar-voz
 * Cada linha é uma frase falada e o que o app precisa entender. Ao mudar o voice-parser.ts,
 * rode de novo: se algo quebrar, aparece "FALHOU" com o que veio de diferente.
 */
import { parseVoiceCommand } from "../client/src/lib/voice-parser";

// Data fixa para o teste: terça, 03/11/2026, 21h30
const now = new Date(2026, 10, 3, 21, 30);
const dia = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const hora = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const casos: [string, Record<string, unknown>][] = [
  ["dentista amanhã às 15h", { kind: "activity", title: "Dentista", dia: "04/11", hora: "15:00" }],
  ["Dentista amanhã às três da tarde", { kind: "activity", hora: "15:00" }],
  ["reunião na escola sexta-feira às 7 e meia da noite", { kind: "activity", dia: "06/11", hora: "19:30" }],
  ["Me lembra de buscar a Ana na escola todo dia às 17h", { kind: "activity", title: "Buscar a Ana na escola", hora: "17:00" }],
  ["natação da Júlia toda segunda e quarta às 16:30", { kind: "activity", title: "Natação da Júlia" }],
  ["me acorda todo dia 7 da manhã", { kind: "activity", title: "Acordar", hora: "07:00" }],
  ["daqui a 20 minutos tirar o bolo do forno", { kind: "activity", hora: "21:50", minutesBefore: 0 }],
  ["Mamografia dia 15/12 às 10h na Rua das Flores 120", { kind: "activity", title: "Mamografia", address: "Rua das Flores 120", category: "saude" }],
  ["cabeleireiro sábado às 14h telefone 61 99999 1234", { kind: "activity", phone: "61 99999 1234" }],
  ["coloca na lista arroz feijão e detergente", { kind: "shopping", items: "Arroz|Feijão|Detergente" }],
  ["comprar leite, pão e 2 dúzias de ovos", { kind: "shopping", items: "Leite|Pão|2 dúzias de ovos" }],
  ["comprar fralda tamanho G", { kind: "shopping", items: "Fralda tamanho G" }],
  ["o aniversário do João é 5 de agosto, ele quer uma bicicleta", { kind: "birthday", name: "João", giftIdeas: "Bicicleta" }],
  ["minha menstruação começou hoje", { kind: "period_start", dia: "03/11" }],
  ["minha menstruação acabou", { kind: "period_end" }],
  ["tomar amoxicilina de 8 em 8 horas por 7 dias", { kind: "medication", everyHours: 8, days: 7 }],
  ["remédio da Ana dipirona 10 gotas de 6 em 6 horas", { kind: "medication", name: "Dipirona", forName: "Ana" }],
  ["Tomar vitamina D todo dia às 8h", { kind: "medication", name: "Vitamina D", firstTime: "08:00" }],
  ["tomar banho todo dia às 8h", { kind: "activity" }],
  ["corri 5 km", { kind: "workout", activity: "Corrida", distanceKm: 5 }],
  ["assisti o filme Ainda Estou Aqui, nota 5", { kind: "movie", title: "Ainda Estou Aqui", rating: 5 }],
  ["lembrete pagar o cartão todo dia 10", { kind: "reminder", title: "Pagar o cartão", repeat: "mes", dia: "10/11" }],
  ["Pagar a conta de luz todo dia 25", { kind: "reminder", repeat: "mes", dia: "25/11" }],
  ["qual o tempo amanhã", { kind: "unknown" }],
  ["quando é o dentista?", { kind: "unknown" }],
  ["oi", { kind: "unknown" }],
];

let falhas = 0;
for (const [frase, esperado] of casos) {
  const r = parseVoiceCommand(frase, now) as Record<string, unknown>;
  const obtido: Record<string, unknown> = { ...r };
  if (r.date instanceof Date) Object.assign(obtido, { dia: dia(r.date), hora: hora(r.date) });
  if (Array.isArray(r.items)) obtido.items = r.items.join("|");
  const erros = Object.entries(esperado).filter(([k, v]) => obtido[k] !== v);
  if (erros.length) {
    falhas++;
    console.log(`FALHOU  "${frase}"`);
    for (const [k, v] of erros) console.log(`        ${k}: esperado ${JSON.stringify(v)}, veio ${JSON.stringify(obtido[k])}`);
  }
}
console.log(falhas ? `\n${falhas} de ${casos.length} frases com problema` : `Tudo certo: ${casos.length} frases`);
process.exit(falhas ? 1 : 0);
