import { useState, type FormEvent } from "react";
import { differenceInCalendarDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { upperFirst } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { KindHeader } from "@/components/KindHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DayCalendar } from "@/components/DayCalendar";
import { ActivityCard } from "@/components/ActivityCard";
import { NativeSelect } from "@/components/NativeSelect";
import { Cake, Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refresh, useBirthdays, useUserId } from "@/hooks/use-data";
import { createBirthday, deleteBirthday, nextBirthdayDate, updateBirthday, type Activity, type Birthday } from "@/lib/data";
import { MONTH_NAMES } from "@/lib/options";

interface AgendaTabProps {
  activities: Activity[];
  onAdd: (date: Date) => void;
  cardHandlers: {
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleComplete: (id: string, completed: boolean) => void;
  };
}

function BirthdayForm({ onDone, birthday }: { onDone: () => void; birthday?: Birthday }) {
  const { toast } = useToast();
  const userId = useUserId();
  const [name, setName] = useState(birthday?.name ?? "");
  const [day, setDay] = useState(birthday?.day ?? 1);
  const [month, setMonth] = useState(birthday?.month ?? new Date().getMonth() + 1);
  const [year, setYear] = useState(birthday?.birthYear ? String(birthday.birthYear) : "");
  const [gift, setGift] = useState(birthday?.giftIdeas ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const input = {
        name,
        day,
        month,
        birthYear: year ? Number(year) : undefined,
        ...(gift.trim() || birthday?.giftIdeas ? { giftIdeas: gift } : {}),
      };
      if (birthday) await updateBirthday(birthday.id, input);
      else await createBirthday(input);
      refresh(userId, "birthdays");
      toast({ title: birthday ? "Aniversário atualizado!" : "Aniversário salvo!" });
      onDone();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-muted/50 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="b-name">Nome *</Label>
        <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Vó Maria" autoFocus />
      </div>
      <div className="grid grid-cols-[1fr_1.7fr_1fr] gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="b-day">Dia</Label>
          <NativeSelect id="b-day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-month">Mês</Label>
          <NativeSelect id="b-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-year">Ano (opc.)</Label>
          <Input
            id="b-year"
            inputMode="numeric"
            maxLength={4}
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
            placeholder="1960"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="b-gift" className="flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5" /> Ideias de presente <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Textarea
          id="b-gift"
          rows={2}
          value={gift}
          onChange={(e) => setGift(e.target.value)}
          placeholder="Ex.: perfume floral, livro de receitas, vale-massagem"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving || !name.trim()}>Salvar</Button>
      </div>
    </form>
  );
}

function BirthdayRow({ b }: { b: Birthday }) {
  const userId = useUserId();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const next = nextBirthdayDate(b);
  const days = differenceInCalendarDays(next, new Date());
  const age = b.birthYear ? next.getFullYear() - b.birthYear : undefined;

  if (editing) return <div className="py-2"><BirthdayForm birthday={b} onDone={() => setEditing(false)} /></div>;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="h-10 w-10 shrink-0 rounded-full bg-accent/15 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-semibold text-accent">{b.day}</span>
        <span className="text-[9px] uppercase text-accent">{MONTH_NAMES[b.month - 1].slice(0, 3)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{b.name}</p>
        <p className="text-xs text-muted-foreground">
          {days === 0 ? "É hoje! 🎉" : days === 1 ? "Amanhã" : `Em ${days} dias`}
          {age ? ` · faz ${age} anos` : ""}
        </p>
        {b.giftIdeas && (
          <p className="mt-1 flex items-start gap-1 text-xs text-foreground/80">
            <Gift className="h-3.5 w-3.5 mt-px shrink-0 text-primary" />
            <span>{b.giftIdeas}</span>
          </p>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)} title="Editar">
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Editar</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={async () => {
          if (!window.confirm(`Apagar o aniversário de ${b.name}?`)) return;
          try {
            await deleteBirthday(b.id);
            refresh(userId, "birthdays");
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
}

export function AgendaTab({ activities, onAdd, cardHandlers }: AgendaTabProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addingBirthday, setAddingBirthday] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const { data: birthdays = [] } = useBirthdays();

  // Editar fecha a janela do dia para abrir o formulário.
  const dayHandlers = {
    ...cardHandlers,
    onEdit: (id: string) => {
      setDayOpen(false);
      cardHandlers.onEdit(id);
    },
  };

  const dayActivities = activities.filter((a) => isSameDay(a.date, selectedDate));
  const dayBirthdays = birthdays.filter((b) => b.day === selectedDate.getDate() && b.month === selectedDate.getMonth() + 1);
  const markedDates = [
    ...activities.map((a) => a.date),
    ...birthdays.map((b) => new Date(selectedDate.getFullYear(), b.month - 1, b.day)),
  ];
  const sortedBirthdays = [...birthdays].sort((a, b) => nextBirthdayDate(a).getTime() - nextBirthdayDate(b).getTime());

  return (
    <div className="space-y-6">
      <DayCalendar
        selectedDate={selectedDate}
        onSelectDate={(d) => {
          setSelectedDate(d);
          setDayOpen(true);
        }}
        activityDates={markedDates}
      />

      <p className="-mt-3 text-center text-xs text-muted-foreground">
        Toque em um dia para ver ou adicionar compromissos.
      </p>

      {/* Compromissos do dia tocado: abrem numa janela, sem ocupar a tela da agenda */}
      <Dialog open={dayOpen} onOpenChange={setDayOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <KindHeader
            kind="activity"
            label="Agenda do dia"
            title={upperFirst(format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR }))}
            description={
              dayActivities.length === 0
                ? "Nada marcado para este dia."
                : `${dayActivities.length} ${dayActivities.length === 1 ? "compromisso" : "compromissos"}`
            }
          />
          <div className="space-y-3">
            {dayBirthdays.map((b) => (
              <Card key={b.id} className="p-3 flex items-center gap-2 bg-accent/10 border-accent/30">
                <Cake className="h-5 w-5 text-accent" />
                <div className="min-w-0">
                  <span className="text-sm font-medium">Aniversário de {b.name}</span>
                  {b.giftIdeas && <p className="text-xs text-muted-foreground">🎁 {b.giftIdeas}</p>}
                </div>
              </Card>
            ))}
            {dayActivities.map((a) => (
              <ActivityCard key={a.id} {...a} {...dayHandlers} />
            ))}
          </div>
          <Button
            onClick={() => {
              setDayOpen(false);
              onAdd(selectedDate);
            }}
            className="w-full gap-1"
          >
            <Plus className="h-4 w-4" /> Adicionar compromisso neste dia
          </Button>
        </DialogContent>
      </Dialog>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Cake className="h-5 w-5 text-primary" /> Aniversários
          </h3>
          {!addingBirthday && (
            <Button size="sm" onClick={() => setAddingBirthday(true)} data-testid="button-add-birthday">
              Novo
            </Button>
          )}
        </div>
        {addingBirthday && <BirthdayForm onDone={() => setAddingBirthday(false)} />}
        {sortedBirthdays.length === 0 && !addingBirthday ? (
          <p className="text-sm text-muted-foreground italic py-2">
            Nenhum aniversário salvo. Diga: “Aniversário da Ana dia 12 de março”.
          </p>
        ) : (
          <div className="divide-y">
            {sortedBirthdays.map((b) => (
              <BirthdayRow key={b.id} b={b} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
