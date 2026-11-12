import { formatPhone } from "@/lib/utils";
import { AppIcon } from "@/components/AppIcons";
import { DateInputBR } from "@/components/DateInputBR";
import { VaccineCard } from "@/components/VaccineCard";
import { isMinor, vaccineStatus } from "@/lib/vacinas";
import { useId, useState, type FormEvent } from "react";
import { differenceInMonths, differenceInYears, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, ChevronDown, ChevronUp, Pencil, Phone, Pill, Plus, School, Shirt, Stethoscope, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useActivities, useChildren, useMedications, useUserId } from "@/hooks/use-data";
import { deleteChild, medicationActiveOn, saveChild, SEXO_OPCOES, type Child, type Sexo } from "@/lib/data";
import { occurrencesBetween } from "@/lib/recurrence";
import { addDays } from "date-fns";
import { NativeSelect } from "@/components/NativeSelect";

/**
 * Ilustração de criança no mesmo estilo do botão "Filhos" da tela inicial:
 * quadrado de bordas arredondadas com o degradê do tema e o desenho em branco.
 * Menino: cabelo curto. Menina: cabelo comprido com laço. Sem sexo: bebê com plumazinho.
 */
export function ChildArt({ sex, className = "h-12 w-12" }: { sex?: Sexo; className?: string }) {
  const id = useId().replace(/:/g, "");
  const bg = `cbg${id}`;
  const ink = `cink${id}`;
  const inkFill = `url(#${ink})`;
  const girl = sex === "feminino";
  const boy = sex === "masculino";
  const eyes = girl ? [203, 326] : boy ? [206, 330] : [205, 329];
  return (
    <svg viewBox="0 0 530 530" className={`${className} shrink-0`} aria-hidden="true">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "hsl(var(--mic-1))" }} />
          <stop offset="1" style={{ stopColor: "hsl(var(--mic-2))" }} />
        </linearGradient>
        <linearGradient id={ink} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "hsl(var(--mic-1))" }} />
          <stop offset="1" style={{ stopColor: "hsl(var(--mic-2))" }} />
        </linearGradient>
      </defs>
      <rect width="530" height="530" rx="120" fill={`url(#${bg})`} />

      {/* silhueta branca: rosto e cabelo */}
      {boy && (
        <>
          <circle cx="265" cy="285" r="170" fill="#fff" />
          <path d="M118 215C112 150 170 100 240 100c60 0 112 35 122 100-22-15-42-22-72-20-35 2-60-10-90-8-30 2-52 12-82 43z" fill="#fff" />
          <path d="M150 128c12 12 30 12 46 0-10-18-20-38-10-56-16 20-26 28-36 56z" fill="#fff" />
          <path d="M368 202C390 215 410 230 432 252" fill="none" stroke={inkFill} strokeWidth="8" strokeLinecap="round" />
        </>
      )}
      {girl && (
        <>
          <path d="M265 112C150 112 98 190 98 280c0 50-38 50-46 60 28 20 58 16 78 12h300c15 4 30 4 45-12-8-10-46-10-46-60 0-90-52-168-167-168z" fill="#fff" />
          <circle cx="265" cy="285" r="170" fill="#fff" />
          <path d="M122 250Q200 225 290 182Q340 225 407 250" fill="none" stroke={inkFill} strokeWidth="8" strokeLinecap="round" />
          <path d="M355 125C330 90 287 85 287 112C287 135 320 140 355 125Z" fill="#fff" />
          <path d="M355 125C380 90 425 90 425 116C425 140 390 140 355 125Z" fill="#fff" />
          <circle cx="355" cy="125" r="12" fill={inkFill} />
        </>
      )}
      {!boy && !girl && (
        <>
          <circle cx="267" cy="290" r="168" fill="#fff" />
          <path d="M268 130c-10-22 2-40 22-42 14-1 16 16 6 18" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" />
        </>
      )}

      {/* rosto */}
      <circle cx={eyes[0]} cy="277" r="18" fill={inkFill} />
      <circle cx={eyes[1]} cy="277" r="18" fill={inkFill} />
      <circle cx="173" cy="335" r="22" fill={inkFill} opacity=".35" />
      <circle cx="363" cy="335" r="22" fill={inkFill} opacity=".35" />
      <path d={boy ? "M225 342Q270 392 315 342" : "M220 340Q265 385 310 340"} fill="none" stroke={inkFill} strokeWidth="14" strokeLinecap="round" />
    </svg>
  );
}

export function childAge(birthDate?: string): string | undefined {
  if (!birthDate) return undefined;
  const [y, m, d] = birthDate.split("-").map(Number);
  const born = new Date(y, m - 1, d);
  const years = differenceInYears(new Date(), born);
  if (years >= 2) return `${years} anos`;
  const months = differenceInMonths(new Date(), born);
  return months <= 1 ? `${Math.max(0, months)} mês` : `${months} meses`;
}

// ---------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------

function ChildForm({ child, onDone }: { child?: Child; onDone: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [c, setC] = useState<Omit<Child, "id">>(() => ({ name: "", ...(child ?? {}) }));
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Child) => (e: { target: { value: string } }) => setC({ ...c, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!c.name.trim()) return;
    setSaving(true);
    try {
      await saveChild(c, child?.id);
      refresh(userId, "children");
      const nextVaccine = vaccineStatus(c.birthDate).next[0];
      toast({
        title: child ? "Dados atualizados!" : `${c.name} foi adicionado(a)!`,
        description: nextVaccine
          ? `Próximas vacinas (${nextVaccine.label}, ${format(nextVaccine.date, "dd/MM/yyyy")}): ${nextVaccine.vaccines.join(", ")}. Aviso uma semana antes.`
          : undefined,
      });
      onDone();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof Child, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`child-${k}`}>{label}</Label>
      <Input id={`child-${k}`} value={((c as Partial<Child>)[k] as string) ?? ""} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl bg-muted/40 p-3">
      {field("name", "Nome *", { autoFocus: true, placeholder: "Ex.: João" })}
      <div className="space-y-1.5">
        <Label htmlFor="child-sex">Sexo</Label>
        <NativeSelect
          id="child-sex"
          value={c.sex ?? ""}
          onChange={(e) => setC({ ...c, sex: (e.target.value || undefined) as Sexo | undefined })}
        >
          <option value="">Não informar</option>
          {SEXO_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
        <p className="text-[11px] text-muted-foreground">Opcional. Usamos só para escolher o ícone do(a) filho(a).</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="child-birthDate">Data de nascimento</Label>
          <DateInputBR id="child-birthDate" value={c.birthDate} onChange={(iso) => setC({ ...c, birthDate: iso || undefined })} />
        </div>
        {field("schoolGrade", "Série / turma", { placeholder: "Ex.: 2º ano B" })}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary pt-1">Saúde</p>
      <div className="grid grid-cols-2 gap-3">
        {field("pediatrician", "Pediatra", { placeholder: "Dra. Ana" })}
        {field("pediatricianPhone", "Telefone", { type: "tel", inputMode: "tel", placeholder: "(61) 9..." })}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="child-allergies">Alergias e cuidados</Label>
        <Textarea id="child-allergies" rows={2} value={c.allergies ?? ""} onChange={set("allergies")} placeholder="Ex.: alergia a dipirona" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary pt-1">Tamanhos</p>
      <div className="grid grid-cols-3 gap-2">
        {field("clothingSize", "Roupa", { placeholder: "6" })}
        {field("shoeSize", "Calçado", { placeholder: "28" })}
        {field("diaperSize", "Fralda", { placeholder: "G" })}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="child-notes">Observações</Label>
        <Textarea id="child-notes" rows={2} value={c.notes ?? ""} onChange={set("notes")} placeholder="Gostos, horários, contatos..." />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={saving || !c.name.trim()} data-testid="button-child-save">Salvar</Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Cartão de um filho
// ---------------------------------------------------------------

function ChildCard({ child, onEdit }: { child: Child; onEdit: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const { data: activities = [] } = useActivities();
  const { data: meds = [] } = useMedications();
  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = occurrencesBetween(
    activities.filter((a) => a.childId === child.id),
    new Date(),
    addDays(new Date(), 14),
  )
    .filter((o) => !o.completed && o.date >= new Date())
    .slice(0, 3);
  const activeMeds = meds.filter((m) => m.childId === child.id && medicationActiveOn(m, today));
  const age = childAge(child.birthDate);

  const line = (icon: typeof School, text?: string, href?: string) =>
    text ? (
      <p className="flex items-start gap-2 text-sm">
        {(() => {
          const Icon = icon;
          return <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />;
        })()}
        {href ? (
          <a href={href} className="text-primary hover:underline">{text}</a>
        ) : (
          <span>{text}</span>
        )}
      </p>
    ) : null;

  return (
    <div className="rounded-xl border bg-card p-3">
      <button type="button" className="w-full flex items-center gap-3 text-left" onClick={() => setOpen((v) => !v)}>
        <ChildArt sex={child.sex} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{child.name}</p>
          <p className="text-xs text-muted-foreground">
            {[age, child.schoolGrade].filter(Boolean).join(" · ") || "Toque para ver os dados"}
          </p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {child.birthDate && line(CalendarClock, `Nasceu em ${format(new Date(child.birthDate + "T12:00"), "dd/MM/yyyy")}`)}
          {line(School, child.schoolGrade ? `Turma: ${child.schoolGrade}` : undefined)}
          {line(Stethoscope, child.pediatrician)}
          {child.pediatricianPhone && line(Phone, formatPhone(child.pediatricianPhone), `tel:${child.pediatricianPhone.replace(/[^\d+]/g, "")}`)}
          {child.allergies && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">⚠️ {child.allergies}</p>
          )}
          {line(
            Shirt,
            [child.clothingSize && `Roupa ${child.clothingSize}`, child.shoeSize && `Calçado ${child.shoeSize}`, child.diaperSize && `Fralda ${child.diaperSize}`]
              .filter(Boolean)
              .join(" · ") || undefined,
          )}
          {child.notes && <p className="text-sm text-muted-foreground whitespace-pre-line">{child.notes}</p>}

          {isMinor(child.birthDate) || !child.birthDate ? <VaccineCard name={child.name} birthDate={child.birthDate} /> : null}

          {upcoming.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Próximos compromissos</p>
              {upcoming.map((o) => (
                <p key={o.id} className="text-sm">
                  {format(o.date, "EEE dd/MM HH:mm", { locale: ptBR })} · {o.title}
                </p>
              ))}
            </div>
          )}
          {activeMeds.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Remédios em uso</p>
              {activeMeds.map((m) => (
                <p key={m.id} className="flex items-center gap-1.5 text-sm">
                  <Pill className="h-3.5 w-3.5 text-primary" /> {m.name}
                  {m.dose ? ` · ${m.dose}` : ""} · {m.times.join(", ")}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-1 pt-1">
            <Button variant="ghost" size="sm" className="gap-1" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive"
              onClick={async () => {
                if (!window.confirm(`Apagar o perfil de ${child.name}? Os compromissos e remédios continuam, sem o nome.`)) return;
                try {
                  await deleteChild(child.id);
                  refresh(userId, "children");
                } catch (err) {
                  toast({ title: "Não foi possível apagar", description: (err as Error).message, variant: "destructive" });
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Apagar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Janela "Meus filhos"
// ---------------------------------------------------------------

export function ChildrenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: children = [] } = useChildren();
  const [editing, setEditing] = useState<Child | "new" | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setEditing(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-children">
        <div className="flex items-center gap-3 rounded-2xl bg-hero p-4">
          <AppIcon name="filhos" className="h-14 w-14" />
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Família</p>
            <DialogTitle className="text-lg font-display font-semibold">Meus filhos</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Turma, pediatra, alergias e tamanhos sempre à mão.
            </DialogDescription>
          </div>
        </div>

        {editing ? (
          <ChildForm child={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        ) : (
          <>
            <Button onClick={() => setEditing("new")} className="w-full gap-1" data-testid="button-new-child">
              <Plus className="h-4 w-4" /> Adicionar filho(a)
            </Button>
            {children.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum perfil ainda. Depois de cadastrar, dá para marcar compromissos e remédios “para” cada filho.
              </p>
            ) : (
              <div className="space-y-2">
                {children.map((c) => (
                  <ChildCard key={c.id} child={c} onEdit={() => setEditing(c)} />
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
