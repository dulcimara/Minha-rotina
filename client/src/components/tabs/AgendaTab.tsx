import { useState } from "react";
import { addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { KindHeader } from "@/components/KindHeader";
import { ActivityForm } from "@/components/ActivityForm";
import type { Activity, ActivityInput } from "@/lib/data";
import { occurrencesBetween } from "@/lib/recurrence";

interface AgendaTabProps {
  activities: Activity[];
  onSave: (input: ActivityInput) => void;
}

/**
 * Agenda = agendar compromisso digitando: calendário para escolher o dia e
 * todos os campos do compromisso. (A lista do dia fica na página inicial.)
 */
export function AgendaTab({ activities, onSave }: AgendaTabProps) {
  const [formKey, setFormKey] = useState(0);
  const [lastDate, setLastDate] = useState<Date | undefined>();

  // Bolinha nos dias que já têm compromisso (inclui as repetições).
  const marked = occurrencesBetween(activities, addDays(new Date(), -62), addDays(new Date(), 186)).map((o) => o.date);

  return (
    <div className="space-y-4">
      <KindHeader
        standalone
        kind="activity"
        title="Agendar compromisso"
        description="Escolha o dia no calendário e preencha os detalhes."
      />
      <Card className="p-4">
        <ActivityForm
          key={formKey}
          withCalendar
          defaultDate={lastDate}
          markedDates={marked}
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
