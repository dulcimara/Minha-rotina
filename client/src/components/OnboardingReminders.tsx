import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/NativeSelect";
import { Check } from "lucide-react";
import { PRESETS, REPEATS, type Repeat } from "@/lib/lembretes";
import { saveReminder } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ReminderIcon } from "@/components/ReminderGlyph";

export type ReminderPicks = Record<string, { date: string; repeat: Repeat }>;

/** Salva os lembretes escolhidos no primeiro acesso. */
export async function savePicks(picks: ReminderPicks) {
  for (const [title, p] of Object.entries(picks)) {
    const preset = PRESETS.find((x) => x.title === title);
    await saveReminder({ text: title, emoji: preset?.emoji, dueDate: p.date, dueTime: "09:00", repeat: p.repeat, alert: true });
  }
}

/** Passo do primeiro acesso: escolher lembretes prontos, com data e repetição. */
export function OnboardingReminders({ picks, onChange }: { picks: ReminderPicks; onChange: (p: ReminderPicks) => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const toggle = (title: string, repeat: Repeat) => {
    const next = { ...picks };
    if (next[title]) delete next[title];
    else next[title] = { date: today, repeat };
    onChange(next);
  };
  const set = (title: string, patch: Partial<ReminderPicks[string]>) => onChange({ ...picks, [title]: { ...picks[title], ...patch } });
  const chosen = PRESETS.filter((p) => picks[p.title]);

  return (
    <div className="space-y-3 text-sm">
      <p>Toque no que você não quer esquecer. Depois escolha a data e se repete. Dá para mudar tudo depois.</p>
      <div className="flex flex-wrap gap-1.5" data-testid="onboarding-reminder-presets">
        {PRESETS.map((p) => {
          const on = Boolean(picks[p.title]);
          return (
            <button
              key={p.title}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p.title, p.repeat)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted/60",
              )}
            >
              {on ? <Check className="h-3.5 w-3.5" /> : <ReminderIcon emoji={p.emoji} className="h-3.5 w-3.5" />} {p.title}
            </button>
          );
        })}
      </div>

      {chosen.length > 0 && (
        <ul className="space-y-2" data-testid="onboarding-reminder-list">
          {chosen.map((p) => (
            <li key={p.title} className="rounded-xl border bg-card p-2.5 space-y-2">
              <p className="flex items-center gap-1.5 font-medium">
                <ReminderIcon emoji={p.emoji} /> {p.title}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  aria-label={`Data de ${p.title}`}
                  value={picks[p.title].date}
                  onChange={(e) => set(p.title, { date: e.target.value })}
                  className="h-9"
                />
                <NativeSelect
                  aria-label={`Repetição de ${p.title}`}
                  value={picks[p.title].repeat}
                  onChange={(e) => set(p.title, { repeat: e.target.value as Repeat })}
                  className="h-9"
                >
                  {REPEATS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
