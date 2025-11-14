import { useState } from "react";
import { format, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/ActivityCard";
import { DayCalendar } from "@/components/DayCalendar";
import { VoiceButton } from "@/components/VoiceButton";
import { VoiceCommandDialog } from "@/components/VoiceCommandDialog";
import { ActivityFormDialog } from "@/components/ActivityFormDialog";
import { EmptyState } from "@/components/EmptyState";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Plus, CalendarX, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<"listening" | "processing" | "done">("done");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  
  const mockActivities = [
    {
      id: "1",
      title: "Consulta médica",
      description: "Clínica Dr. Silva - Cardiologista",
      date: new Date(2025, 10, 14, 16, 0),
      category: "Saúde",
      completed: false,
      reminderEnabled: true,
      reminderType: "text" as const,
      reminderDateTime: new Date(2025, 10, 14, 15, 30),
    },
    {
      id: "2",
      title: "Almoçar",
      date: new Date(2025, 10, 14, 12, 30),
      category: "Casa",
      completed: true,
      reminderEnabled: false,
    },
    {
      id: "3",
      title: "Academia",
      description: "Treino de pernas",
      date: new Date(2025, 10, 14, 18, 30),
      category: "Fitness",
      completed: false,
      reminderEnabled: true,
      reminderType: "voice" as const,
      reminderDateTime: new Date(2025, 10, 14, 18, 0),
    },
    {
      id: "4",
      title: "Reunião de equipe",
      date: new Date(2025, 10, 15, 10, 0),
      category: "Trabalho",
      completed: false,
      reminderEnabled: true,
      reminderType: "text" as const,
      reminderDateTime: new Date(2025, 10, 15, 9, 30),
    },
  ];

  const selectedDateActivities = mockActivities.filter((activity) =>
    isSameDay(activity.date, selectedDate)
  );

  const todayActivities = mockActivities.filter((activity) =>
    isToday(activity.date)
  );

  const activityDates = mockActivities.map(a => a.date);

  const handleVoiceRecording = (isRecording: boolean) => {
    if (isRecording) {
      setVoiceDialogOpen(true);
      setVoiceState("listening");
      
      setTimeout(() => {
        setVoiceState("processing");
        setTimeout(() => {
          setVoiceState("done");
        }, 1500);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-display font-semibold" data-testid="text-app-title">
            Minha Rotina
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFormDialogOpen(true)}
              data-testid="button-add-activity"
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">Adicionar atividade</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24">
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6" data-testid="tabs-view">
            <TabsTrigger value="today" data-testid="tab-today">Hoje</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">Calendário</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-semibold" data-testid="text-today-title">
                    {format(new Date(), "EEEE", { locale: ptBR })}
                  </h2>
                  <p className="text-sm text-muted-foreground" data-testid="text-today-date">
                    {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Você tem {todayActivities.length} {todayActivities.length === 1 ? "atividade" : "atividades"} para hoje
              </p>
            </Card>

            <div className="space-y-3">
              {todayActivities.length > 0 ? (
                todayActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    {...activity}
                    onEdit={(id) => console.log("Edit:", id)}
                    onDelete={(id) => console.log("Delete:", id)}
                    onToggleComplete={(id, completed) =>
                      console.log("Toggle:", id, completed)
                    }
                  />
                ))
              ) : (
                <EmptyState
                  icon={CalendarX}
                  title="Nenhuma atividade para hoje"
                  description="Você não tem nenhuma atividade agendada para hoje. Use o botão de voz ou adicione manualmente!"
                  actionLabel="Adicionar atividade"
                  onAction={() => setFormDialogOpen(true)}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <DayCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              activityDates={activityDates}
            />

            <div>
              <h3 className="font-semibold mb-3" data-testid="text-selected-date">
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h3>
              <div className="space-y-3">
                {selectedDateActivities.length > 0 ? (
                  selectedDateActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      {...activity}
                      onEdit={(id) => console.log("Edit:", id)}
                      onDelete={(id) => console.log("Delete:", id)}
                      onToggleComplete={(id, completed) =>
                        console.log("Toggle:", id, completed)
                      }
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={CalendarX}
                    title="Nenhuma atividade"
                    description="Não há atividades agendadas para esta data."
                    actionLabel="Adicionar atividade"
                    onAction={() => setFormDialogOpen(true)}
                  />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-6 right-6 z-40" data-testid="floating-voice-button">
        <VoiceButton
          onRecordingChange={handleVoiceRecording}
          onTranscript={(text) => console.log("Transcript:", text)}
        />
      </div>

      <VoiceCommandDialog
        open={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
        isListening={voiceState === "listening"}
        transcript="adicionar consulta médica dia 12/12/2025 às 16h"
        isProcessing={voiceState === "processing"}
        onConfirm={() => {
          console.log("Voice command confirmed");
          setVoiceDialogOpen(false);
          setVoiceState("done");
        }}
        onCancel={() => {
          console.log("Voice command cancelled");
          setVoiceDialogOpen(false);
          setVoiceState("done");
        }}
      />

      <ActivityFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSave={(activity) => {
          console.log("Activity saved:", activity);
        }}
      />
    </div>
  );
}
