import { format } from "date-fns";
import type { DoseTaken, Medication } from "@/lib/data";
import { medicationActiveOn } from "@/lib/data";

export interface DoseSlot {
  med: Medication;
  time: string; // "08:00"
  at: Date;
  day: string;
  taken: boolean;
}

/** Horários a cada X horas a partir da primeira dose: (06:00, 8) -> 06:00, 14:00, 22:00 */
export function timesEvery(first: string, everyHours: number): string[] {
  const [h, m] = first.split(":").map(Number);
  const out: string[] = [];
  for (let t = h * 60 + m; t < h * 60 + m + 24 * 60; t += everyHours * 60) {
    const mm = t % (24 * 60);
    out.push(`${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`);
  }
  return Array.from(new Set(out)).sort();
}

/** Doses de um dia, em ordem de horário. */
export function dosesOn(meds: Medication[], taken: DoseTaken[], date = new Date()): DoseSlot[] {
  const day = format(date, "yyyy-MM-dd");
  const slots: DoseSlot[] = [];
  for (const med of meds) {
    if (!medicationActiveOn(med, day)) continue;
    for (const time of med.times) {
      const [h, m] = time.split(":").map(Number);
      slots.push({
        med,
        time,
        day,
        at: new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m),
        taken: taken.some((t) => t.medicationId === med.id && t.day === day && t.time === time),
      });
    }
  }
  return slots.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name));
}

/** "Por mais 3 dias" · "Uso contínuo" · "Termina hoje" */
export function treatmentLabel(med: Medication, today = format(new Date(), "yyyy-MM-dd")): string {
  if (!med.endDate) return "Uso contínuo";
  if (med.endDate < today) return "Tratamento terminado";
  const [y, m, d] = med.endDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
  return days === 0 ? "Termina hoje" : `Por mais ${days} ${days === 1 ? "dia" : "dias"}`;
}
