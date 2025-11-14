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
        reminderEnabled={true}
        reminderType="text"
        reminderDateTime={new Date(2025, 11, 12, 15, 30)}
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
        reminderEnabled={false}
        onEdit={(id) => console.log("Edit activity:", id)}
        onDelete={(id) => console.log("Delete activity:", id)}
        onToggleComplete={(id, completed) => console.log("Toggle complete:", id, completed)}
      />
      <ActivityCard
        id="3"
        title="Academia"
        date={new Date(2025, 11, 14, 18, 30)}
        category="Fitness"
        completed={false}
        reminderEnabled={true}
        reminderType="voice"
        reminderDateTime={new Date(2025, 11, 14, 18, 0)}
        reminderVoiceText="Você tem academia em 30 minutos"
        reminderVoiceGender="female"
        onEdit={(id) => console.log("Edit activity:", id)}
        onDelete={(id) => console.log("Delete activity:", id)}
        onToggleComplete={(id, completed) => console.log("Toggle complete:", id, completed)}
      />
    </div>
  );
}
