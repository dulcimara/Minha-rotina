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
import { Plus, CalendarX, Sparkles, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Reminder, insertReminderSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<"listening" | "processing" | "done">("done");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders", { limit: 3 }],
  });

  const reminderMutation = useMutation({
    mutationFn: async (text: string) => {
      await apiRequest("POST", "/api/reminders", { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      setReminderDialogOpen(false);
      toast({ title: "Lembrete cadastrado com sucesso!" });
    },
  });

  const reminderForm = useForm({
    resolver: zodResolver(insertReminderSchema),
    defaultValues: { text: "" },
  });

  const onSubmitReminder = (data: { text: string }) => {
    reminderMutation.mutate(data.text);
    reminderForm.reset();
  };
  
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
      reminderVoiceText: "Você tem academia em 30 minutos. Não esqueça sua garrafa de água!",
      reminderVoiceGender: "female" as const,
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
            <div className="grid gap-6 md:grid-cols-2">
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

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Bell className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-semibold">Lembretes</h2>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setReminderDialogOpen(true)}
                    data-testid="button-new-reminder"
                  >
                    Novo
                  </Button>
                </div>
                <div className="space-y-2">
                  {reminders.length > 0 ? (
                    reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="p-2 rounded-md bg-muted/50 text-sm"
                        data-testid={`text-reminder-${reminder.id}`}
                      >
                        {reminder.text}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum lembrete cadastrado</p>
                  )}
                </div>
              </Card>
            </div>

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

      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Lembrete</DialogTitle>
          </DialogHeader>
          <Form {...reminderForm}>
            <form onSubmit={reminderForm.handleSubmit(onSubmitReminder)} className="space-y-4">
              <FormField
                control={reminderForm.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="O que você precisa lembrar?" {...field} data-testid="input-reminder-text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={reminderMutation.isPending} data-testid="button-save-reminder">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
