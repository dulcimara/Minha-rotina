import { EmptyState } from "../EmptyState";
import { CalendarX } from "lucide-react";

export default function EmptyStateExample() {
  return (
    <div className="max-w-2xl p-4">
      <EmptyState
        icon={CalendarX}
        title="Nenhuma atividade para hoje"
        description="Você não tem nenhuma atividade agendada para hoje. Que tal adicionar uma nova?"
        actionLabel="Adicionar atividade"
        onAction={() => console.log("Adicionar atividade")}
      />
    </div>
  );
}
