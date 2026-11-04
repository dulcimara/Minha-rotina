import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/ShareDialog";
import { useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { KindHeader } from "@/components/KindHeader";
import { ActivityForm } from "@/components/ActivityForm";
import { ActivityCard } from "@/components/ActivityCard";
import { displayName, useAuth } from "@/hooks/use-auth";
import type { Activity, ActivityInput } from "@/lib/data";
import { occurrencesBetween } from "@/lib/recurrence";
import { upperFirst } from "@/lib/utils";

interface AgendaTabProps {
  activities: Activity[];
  onSave: (input: ActivityInput) => void;
  cardHandlers: {
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleComplete: (id: string, completed: boolean) => void;
  };
}

/**
 * Agenda = ver o dia e agendar compromisso digitando: ao tocar num dia do
 * calendário aparecem os compromissos dele, e logo abaixo o formulário.
 */
export function AgendaTab({ activities, onSave, cardHandlers }: AgendaTabProps) {
  const [formKey, setFormKey] = useState(0);
  const [lastDate, setLastDate] = useState<Date | undefined>();
  const { user } = useAuth();
  const name = displayName(user);

  // Bolinha nos dias que já têm compromisso (inclui as repetições).
  const marked = occurrencesBetween(activities, addDays(new Date(), -62), addDays(new Date(), 186)).map((o) => o.date);

  const renderDay = (day: Date) => {
    const items = occurrencesBetween(activities, day, day).sort((a, b) => a.date.getTime() - b.date.getTime());
    return (
      <section className="space-y-2" aria-live="polite" data-testid="agenda-day-list">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {items.length
            ? `${items.length} ${items.length === 1 ? "compromisso" : "compromissos"} em ${format(day, "d 'de' MMMM", { locale: ptBR })}`
            : upperFirst(format(day, "EEEE, d 'de' MMMM", { locale: ptBR }))}
        </h3>
        {items.length ? (
          items.map((a) => <ActivityCard key={`${a.id}:${a.date.getTime()}`} {...a} {...cardHandlers} />)
        ) : (
          <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground" data-testid="agenda-day-empty">
            {name ? `${name}, você` : "Você"} não tem nenhum compromisso nesse dia.
          </p>
        )}
      </section>
    );
  };

  const [shareKey, setShareKey] = useState(0);
  return (
    <div className="space-y-4">
      <KindHeader
        standalone
        kind="activity"
        title="Agenda"
        description="Toque num dia para ver os compromissos. Para agendar, preencha os detalhes abaixo."
      />
      <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setShareKey((k) => k + 1)} data-testid="button-share-agenda">
        <Users className="h-4 w-4" /> Compartilhar minha agenda
      </Button>
      {shareKey > 0 && <ShareDialog key={shareKey} open onOpenChange={(o) => !o && setShareKey(0)} area="agenda" />}
      <Card className="p-4">
        <ActivityForm
          key={formKey}
          withCalendar
          defaultDate={lastDate}
          markedDates={marked}
          renderDay={renderDay}
          onSave={(input) => {
            onSave(input);
            // Limpa o formulário para o próximo, mantendo o mesmo dia no calendário.
            setLastDate(input.date);
            setFormKey((k) => k + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </Card>
    </div>
  );
}
