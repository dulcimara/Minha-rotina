import { format } from "date-fns";
import type { Activity, Birthday, DoseTaken, Medication } from "@/lib/data";
import { occurrencesBetween } from "@/lib/recurrence";
import { dosesOn } from "@/lib/meds";

/**
 * Texto do resumo do dia, falado pelo app:
 * "Bom dia, Cida! Hoje você tem 3 compromissos. Às 9 horas, consulta médica, ..."
 */
export function morningSummary(input: {
  name?: string;
  activities: Activity[];
  birthdays: Birthday[];
  meds: Medication[];
  doses: DoseTaken[];
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const h = now.getHours();
  const hello = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const parts: string[] = [`${hello}${input.name ? `, ${input.name}` : ""}!`];

  const today = occurrencesBetween(input.activities, now, now).filter((o) => !o.completed);
  const hour = (d: Date) => (d.getMinutes() ? `às ${d.getHours()} e ${d.getMinutes()}` : `às ${d.getHours()} horas`);

  if (today.length === 0) parts.push("Hoje você não tem compromissos marcados.");
  else {
    parts.push(`Hoje você tem ${today.length} ${today.length === 1 ? "compromisso" : "compromissos"}.`);
    for (const o of today.slice(0, 5)) {
      parts.push(`${hour(o.date)}, ${o.title}${o.address ? `, no endereço ${o.address}` : ""}.`);
    }
    if (today.length > 5) parts.push(`E mais ${today.length - 5}.`);
  }

  const doses = dosesOn(input.meds, input.doses, now).filter((d) => !d.taken);
  if (doses.length) {
    const first = doses[0];
    parts.push(`Remédios: ${doses.length} ${doses.length === 1 ? "dose" : "doses"} hoje, a próxima às ${first.time}, ${first.med.name}.`);
  }

  const todayKey = { d: now.getDate(), m: now.getMonth() + 1 };
  const bdays = input.birthdays.filter((b) => b.day === todayKey.d && b.month === todayKey.m);
  if (bdays.length) parts.push(`Hoje é aniversário de ${bdays.map((b) => b.name).join(" e ")}. Não esqueça de dar os parabéns!`);

  const soon = input.birthdays.filter((b) => {
    const next = new Date(now.getFullYear(), b.month - 1, b.day);
    const days = Math.round((next.getTime() - new Date(format(now, "yyyy-MM-dd") + "T00:00").getTime()) / 86_400_000);
    return days > 0 && days <= 3;
  });
  if (soon.length) parts.push(`Nos próximos dias: aniversário de ${soon.map((b) => b.name).join(" e ")}.`);

  parts.push("Tenha um ótimo dia!");
  return parts.join(" ");
}
