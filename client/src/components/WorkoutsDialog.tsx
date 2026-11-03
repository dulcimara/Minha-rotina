import { useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { AppIcon } from "@/components/AppIcons";
import { useToast } from "@/hooks/use-toast";
import { refresh, useUserId, useWorkouts } from "@/hooks/use-data";
import { deleteWorkout, saveWorkout, type Workout } from "@/lib/data";
import {
  SPORTS,
  formatDistance,
  formatMinutes,
  lastThreeMonths,
  sportOf,
  totalsBySport,
  weeklyMinutes,
  type WeekBar,
} from "@/lib/workouts";
import { cn } from "@/lib/utils";

const GOAL = 150; // minutos por semana recomendados pela OMS para adultos

/** Barras de minutos por semana, com a linha da recomendação da OMS. */
function WeeklyChart({ weeks }: { weeks: WeekBar[] }) {
  const W = 340;
  const H = 150;
  const top = 18;
  const bottom = 22;
  const plotH = H - top - bottom;
  const max = Math.max(GOAL * 1.15, ...weeks.map((w) => w.minutes));
  const slot = W / weeks.length;
  const barW = Math.min(18, slot - 6);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const peak = weeks.reduce((a, b) => (b.minutes > a.minutes ? b : a), weeks[0]);
  const last = weeks[weeks.length - 1];

  return (
    <figure className="space-y-1.5">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Minutos de atividade física por semana nos últimos 3 meses">
        {/* linha de base */}
        <line x1="0" x2={W} y1={top + plotH} y2={top + plotH} className="stroke-border" strokeWidth="1" />
        {/* recomendação da OMS */}
        <line x1="0" x2={W} y1={y(GOAL)} y2={y(GOAL)} className="stroke-muted-foreground/60" strokeWidth="1" strokeDasharray="4 4" />
        <text x={W} y={y(GOAL) - 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
          meta 150 min
        </text>
        {weeks.map((w, i) => {
          const x = i * slot + (slot - barW) / 2;
          const h = Math.max(0, top + plotH - y(w.minutes));
          const showLabel = w.minutes > 0 && (w === peak || w === last);
          const newMonth = i === 0 || w.start.getMonth() !== weeks[i - 1].start.getMonth();
          return (
            <g key={i}>
              <title>
                {`Semana de ${format(w.start, "d 'de' MMM", { locale: ptBR })}: ${w.minutes ? formatMinutes(w.minutes) : "nada registrado"}${w.count ? ` em ${w.count} ${w.count === 1 ? "atividade" : "atividades"}` : ""}`}
              </title>
              {/* área de toque maior que a barra */}
              <rect x={i * slot} y={top} width={slot} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x} ${top + plotH} v${-(h - Math.min(4, h))} q0 -${Math.min(4, h)} ${Math.min(4, h)} -${Math.min(4, h)} h${barW - 2 * Math.min(4, h)} q${Math.min(4, h)} 0 ${Math.min(4, h)} ${Math.min(4, h)} v${h - Math.min(4, h)} z`}
                  className={w.minutes >= GOAL ? "fill-primary" : "fill-primary/55"}
                />
              )}
              {showLabel && (
                <text x={x + barW / 2} y={y(w.minutes) - 4} textAnchor="middle" className="fill-foreground text-[9px] font-semibold">
                  {w.minutes}
                </text>
              )}
              {newMonth && (
                <text x={i * slot + 2} y={H - 6} className="fill-muted-foreground text-[9px]">
                  {format(w.start, "MMM", { locale: ptBR })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> semana com 150 min ou mais
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/55" /> abaixo da meta
        </span>
      </figcaption>
    </figure>
  );
}

function WorkoutForm({ initial, onDone }: { initial?: Workout; onDone: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const known = initial ? SPORTS.some((s) => s.name === initial.activity) : true;
  const [activity, setActivity] = useState(initial?.activity ?? "");
  const [other, setOther] = useState(known ? "" : initial?.activity ?? "");
  const [isOther, setIsOther] = useState(!known);
  const [day, setDay] = useState(initial?.day ?? format(new Date(), "yyyy-MM-dd"));
  const [minutes, setMinutes] = useState(initial?.minutes ? String(initial.minutes) : "");
  const name = isOther ? other.trim() : activity;
  const sport = name ? sportOf(name) : undefined;
  const unit = sport?.distance;
  const [distance, setDistance] = useState(
    initial?.distanceKm != null ? String(unit === "m" ? Math.round(initial.distanceKm * 1000) : initial.distanceKm).replace(".", ",") : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const dist = distance ? Number(distance.replace(",", ".")) : undefined;
    setSaving(true);
    try {
      await saveWorkout(
        {
          activity: name,
          day,
          minutes: minutes ? Math.round(Number(minutes)) : undefined,
          distanceKm: unit && dist != null && !Number.isNaN(dist) ? (unit === "m" ? dist / 1000 : dist) : undefined,
          notes,
        },
        initial?.id,
      );
      refresh(userId, "workouts");
      toast({ title: initial ? "Atividade atualizada" : `${sportOf(name).emoji} ${name} registrada!` });
      onDone();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Qual atividade?</Label>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Atividade">
          {SPORTS.map((s) => {
            const on = !isOther && activity === s.name;
            return (
              <button
                key={s.name}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setActivity(s.name);
                  setIsOther(false);
                }}
                className={cn(
                  "rounded-xl border px-1.5 py-2 text-center text-xs leading-tight transition-colors",
                  on ? "border-primary bg-primary/10 font-semibold text-foreground" : "border-border hover:bg-muted/60",
                )}
              >
                <span className="block text-xl leading-none mb-1">{s.emoji}</span>
                {s.name}
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={isOther}
            onClick={() => setIsOther(true)}
            className={cn(
              "rounded-xl border px-1.5 py-2 text-center text-xs leading-tight transition-colors",
              isOther ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted/60",
            )}
          >
            <span className="block text-xl leading-none mb-1">⭐</span>
            Outra
          </button>
        </div>
        {isOther && <Input autoFocus value={other} onChange={(e) => setOther(e.target.value)} placeholder="Qual? Ex.: Remo, Patinação" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="wk-day">Quando</Label>
          <Input id="wk-day" type="date" max={format(new Date(), "yyyy-MM-dd")} value={day} onChange={(e) => setDay(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wk-min">Quanto tempo (min)</Label>
          <Input id="wk-min" type="number" inputMode="numeric" min={1} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Ex.: 40" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[15, 30, 45, 60, 90].map((m) => (
          <Button key={m} type="button" size="sm" variant={minutes === String(m) ? "default" : "outline"} className="h-7 px-2.5" onClick={() => setMinutes(String(m))}>
            {formatMinutes(m)}
          </Button>
        ))}
      </div>

      {unit && (
        <div className="space-y-1.5">
          <Label htmlFor="wk-dist">Distância ({unit === "m" ? "metros" : "km"}) · opcional</Label>
          <Input
            id="wk-dist"
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value.replace(/[^\d,.]/g, ""))}
            placeholder={unit === "m" ? "Ex.: 800" : "Ex.: 5,2"}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="wk-notes">Observação · opcional</Label>
        <Input id="wk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: com a Ana no parque" />
      </div>

      <Button type="submit" className="w-full" disabled={!name || saving} data-testid="button-workout-save">
        {initial ? "Salvar alterações" : "Registrar"}
      </Button>
    </form>
  );
}

export function WorkoutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const userId = useUserId();
  const { toast } = useToast();
  const { data: all = [] } = useWorkouts();
  const [editing, setEditing] = useState<{ key: number; item?: Workout } | null>(null);

  const recent = useMemo(() => lastThreeMonths(all), [all]);
  const weeks = useMemo(() => weeklyMinutes(recent), [recent]);
  const bySport = useMemo(() => totalsBySport(recent), [recent]);
  const totalMin = recent.reduce((s, w) => s + (w.minutes ?? 0), 0);
  const totalKm = recent.reduce((s, w) => s + (w.distanceKm ?? 0), 0);
  const maxSport = Math.max(1, ...bySport.map((s) => s.minutes || s.count));

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setEditing(null);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto" data-testid="dialog-workouts" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="rounded-2xl bg-hero p-4 flex items-center gap-3">
          <AppIcon name="atividade" className="h-14 w-14" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Atividade física</p>
            <DialogTitle className="text-lg font-display font-semibold leading-snug">
              {editing ? (editing.item ? "Editar atividade" : "O que você fez?") : "Seu movimento"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editing ? "Escolha a atividade e quanto tempo durou." : "Registre e acompanhe os últimos 3 meses."}
            </DialogDescription>
          </div>
        </div>

        {editing ? (
          <>
            <Button variant="ghost" size="sm" className="-mt-1 w-fit gap-1 px-2" onClick={() => setEditing(null)}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <WorkoutForm key={editing.key} initial={editing.item} onDone={() => setEditing(null)} />
          </>
        ) : (
          <div className="space-y-5">
            <Button className="w-full gap-2" onClick={() => setEditing({ key: Date.now() })} data-testid="button-workout-add">
              <Plus className="h-4 w-4" /> Registrar atividade
            </Button>

            {recent.length === 0 ? (
              <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">
                Nenhuma atividade nos últimos 3 meses. Registre a primeira e o gráfico aparece aqui. 💪
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { v: String(recent.length), l: recent.length === 1 ? "atividade" : "atividades" },
                    { v: formatMinutes(totalMin), l: "em movimento" },
                    { v: totalKm ? formatDistance(totalKm) : "—", l: "percorridos" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl bg-muted/60 p-2.5">
                      <p className="text-lg font-semibold leading-none">{s.v}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Minutos por semana</h3>
                  <WeeklyChart weeks={weeks} />
                  <p className="text-[11px] text-muted-foreground">A OMS recomenda ao menos 150 minutos por semana de atividade moderada.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">O que você mais fez</h3>
                  <ul className="space-y-2">
                    {bySport.slice(0, 6).map((s) => (
                      <li key={s.name} className="grid grid-cols-[7.5rem_1fr] items-center gap-2 text-sm">
                        <span className="truncate">
                          {sportOf(s.name).emoji} {s.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 rounded-full bg-primary/70" style={{ width: `${Math.max(6, ((s.minutes || s.count) / maxSport) * 100)}%` }} />
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {s.count}× {s.minutes ? `· ${formatMinutes(s.minutes)}` : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-1">
                  <h3 className="text-sm font-semibold">Histórico</h3>
                  <div className="divide-y">
                    {recent.map((w) => {
                      const sp = sportOf(w.activity);
                      return (
                        <div key={w.id} className="flex items-center gap-3 py-2">
                          <span className="text-2xl leading-none w-8 text-center">{sp.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{w.activity}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[
                                format(new Date(w.day + "T12:00"), "EEE, d MMM", { locale: ptBR }),
                                w.minutes && formatMinutes(w.minutes),
                                w.distanceKm != null && formatDistance(w.distanceKm, sp.distance),
                                w.notes,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing({ key: Date.now(), item: w })} title="Editar">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            title="Apagar"
                            onClick={async () => {
                              if (!window.confirm(`Apagar ${w.activity} de ${format(new Date(w.day + "T12:00"), "d/MM")}?`)) return;
                              try {
                                await deleteWorkout(w.id);
                                refresh(userId, "workouts");
                              } catch (err) {
                                toast({ title: "Não foi possível apagar", description: (err as Error).message, variant: "destructive" });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Apagar</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
