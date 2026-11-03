export const CATEGORIES = [
  { value: "saude", label: "Saúde" },
  { value: "familia", label: "Família" },
  { value: "casa", label: "Casa" },
  { value: "trabalho", label: "Trabalho" },
  { value: "autocuidado", label: "Autocuidado" },
  { value: "fitness", label: "Fitness" },
  { value: "lazer", label: "Lazer" },
  { value: "outros", label: "Outros" },
];

export const categoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value.toLowerCase())?.label ?? value;

export const REMINDER_OPTIONS = [
  { value: 0, label: "Na hora" },
  { value: 5, label: "5 minutos antes" },
  { value: 10, label: "10 minutos antes" },
  { value: 15, label: "15 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 120, label: "2 horas antes" },
  { value: 1440, label: "1 dia antes" },
];

export function reminderLabel(minutes: number | undefined): string {
  if (minutes === undefined) return "";
  const known = REMINDER_OPTIONS.find((o) => o.value === minutes);
  if (known) return known.label;
  if (minutes % 1440 === 0) return `${minutes / 1440} dias antes`;
  if (minutes % 60 === 0) return `${minutes / 60} horas antes`;
  return `${minutes} minutos antes`;
}

export const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
