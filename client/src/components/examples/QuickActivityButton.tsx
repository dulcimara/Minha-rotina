import { QuickActivityButton } from "../QuickActivityButton";
import { Utensils, Dumbbell, Briefcase } from "lucide-react";

export default function QuickActivityButtonExample() {
  return (
    <div className="max-w-md p-4 space-y-3">
      <QuickActivityButton
        icon={Utensils}
        title="Almoçar"
        category="Casa"
        onClick={() => console.log("Adicionar: Almoçar")}
      />
      <QuickActivityButton
        icon={Dumbbell}
        title="Ir para academia"
        category="Fitness"
        onClick={() => console.log("Adicionar: Academia")}
      />
      <QuickActivityButton
        icon={Briefcase}
        title="Reunião de trabalho"
        category="Trabalho"
        onClick={() => console.log("Adicionar: Reunião")}
      />
    </div>
  );
}
