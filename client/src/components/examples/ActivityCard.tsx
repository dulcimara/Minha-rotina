import { ActivityCard } from "../ActivityCard";

export default function ActivityCardExample() {
  return (
    <div className="max-w-2xl p-4 space-y-4">
      <ActivityCard
        id="1"
        title="Consulta médica"
        description="Clínica Dr. Silva - Cardiologista"
        date={new Date(2025, 11, 12, 16, 0)}
        category="Saúde"
        completed={false}
        onEdit={(id) => console.log("Edit activity:", id)}
        onDelete={(id) => console.log("Delete activity:", id)}
        onToggleComplete={(id, completed) => console.log("Toggle complete:", id, completed)}
      />
      <ActivityCard
        id="2"
        title="Almoçar"
        date={new Date(2025, 11, 14, 12, 30)}
        category="Casa"
        completed={true}
        onEdit={(id) => console.log("Edit activity:", id)}
        onDelete={(id) => console.log("Delete activity:", id)}
        onToggleComplete={(id, completed) => console.log("Toggle complete:", id, completed)}
      />
    </div>
  );
}
