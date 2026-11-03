import { addDays, addMonths, differenceInCalendarDays, format } from "date-fns";

/**
 * Calendário Nacional de Vacinação (PNI / Ministério da Saúde) — criança e adolescente, 2026.
 * Fonte: Calendário Nacional de Vacinação por idade (SESA-ES, junho/2026) e Instrução Normativa
 * do Calendário Nacional de Vacinação 2026 do Ministério da Saúde.
 *
 * Só as vacinas de rotina, pela idade mínima de cada dose. Vacinas de campanha (gripe todo ano)
 * e regionais (como dengue) dependem do município e não entram nos avisos.
 */
export interface VaccineMilestone {
  /** idade em meses em que as vacinas podem ser tomadas */
  months: number;
  label: string; // "2 meses", "4 anos"
  vaccines: string[];
}

export const VACCINE_SCHEDULE: VaccineMilestone[] = [
  { months: 0, label: "ao nascer", vaccines: ["BCG", "Hepatite B"] },
  { months: 2, label: "2 meses", vaccines: ["Pentavalente (1ª dose)", "Poliomielite VIP (1ª dose)", "Rotavírus (1ª dose)", "Pneumocócica (1ª dose)"] },
  { months: 3, label: "3 meses", vaccines: ["Meningocócica C (1ª dose)"] },
  { months: 4, label: "4 meses", vaccines: ["Pentavalente (2ª dose)", "Poliomielite VIP (2ª dose)", "Rotavírus (2ª dose)", "Pneumocócica (2ª dose)"] },
  { months: 5, label: "5 meses", vaccines: ["Meningocócica C (2ª dose)"] },
  { months: 6, label: "6 meses", vaccines: ["Pentavalente (3ª dose)", "Poliomielite VIP (3ª dose)", "Gripe (1ª dose, a 2ª 30 dias depois)", "COVID-19 (1ª dose)"] },
  { months: 7, label: "7 meses", vaccines: ["COVID-19 (2ª dose)"] },
  { months: 9, label: "9 meses", vaccines: ["Febre amarela (1ª dose)", "COVID-19 (3ª dose)"] },
  { months: 12, label: "1 ano", vaccines: ["Tríplice viral (1ª dose)", "Pneumocócica (reforço)", "Meningocócica ACWY (reforço)"] },
  { months: 15, label: "1 ano e 3 meses", vaccines: ["DTP (1º reforço)", "Poliomielite VIP (reforço)", "Hepatite A", "Tetra viral (sarampo, caxumba, rubéola e catapora)"] },
  { months: 48, label: "4 anos", vaccines: ["DTP (2º reforço)", "Varicela (2ª dose)", "Febre amarela (reforço)"] },
  { months: 108, label: "9 anos", vaccines: ["HPV (dose única, até 14 anos)"] },
  { months: 132, label: "11 anos", vaccines: ["Meningocócica ACWY (dose única, até 14 anos)"] },
];

export const VACCINE_SOURCE =
  "Calendário Nacional de Vacinação do Ministério da Saúde (2026). Confirme sempre na caderneta e no posto de saúde ou com o pediatra.";

export interface VaccineDue extends VaccineMilestone {
  /** dia em que a criança atinge a idade */
  date: Date;
  /** dia do aviso: uma semana antes */
  alertDate: Date;
  dateKey: string; // AAAA-MM-DD da idade
  alertKey: string; // AAAA-MM-DD do aviso
}

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Menor de 18 anos? */
export function isMinor(birthDate?: string, today = new Date()): boolean {
  if (!birthDate) return false;
  return addMonths(parse(birthDate), 18 * 12) > today;
}

/** Datas de cada etapa do calendário para esta criança. */
export function vaccineDates(birthDate: string): VaccineDue[] {
  const birth = parse(birthDate);
  return VACCINE_SCHEDULE.map((m) => {
    const date = addMonths(birth, m.months);
    const alertDate = addDays(date, -7);
    return { ...m, date, alertDate, dateKey: format(date, "yyyy-MM-dd"), alertKey: format(alertDate, "yyyy-MM-dd") };
  });
}

/** Próximas etapas (a partir de hoje) e as que já passaram, para conferir a caderneta. */
export function vaccineStatus(birthDate?: string, today = new Date()) {
  if (!birthDate || !isMinor(birthDate, today)) return { next: [] as VaccineDue[], past: [] as VaccineDue[] };
  const all = vaccineDates(birthDate);
  return {
    next: all.filter((v) => differenceInCalendarDays(v.date, today) >= 0),
    past: all.filter((v) => differenceInCalendarDays(v.date, today) < 0 && v.months > 0),
  };
}
