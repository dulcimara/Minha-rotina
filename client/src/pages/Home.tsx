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
import { Plus, CalendarX, Sparkles, Bell, LogOut, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  type Activity,
  type ActivityInput,
  fetchActivities,
  createActivity,
  updateActivity,
  setActivityCompleted,
  deleteActivity,
  fetchReminders,
  createReminder,
  deleteReminder,
} from "@/lib/data";

const reminderSchema = z.object({
  text: z.string().trim().min(1, "Escreva o lembrete"),
});

type FormActivity = {
  title: string;
  description: string;
  date: Date;
  time: string;
  category: string;
  reminderEnabled: boolean;
  reminderType: "text" | "voice";
  reminderDateTime: Date;
  reminderVoiceText?: string;
  reminderVoiceGender?: "male" | "female";
};

// Junta a data escolhida no calendário com o horário digitado.
function toActivityInput(form: FormActivity): ActivityInput {
  const [hours, minutes] = form.time.split(":").map(Number);
  const date = new Date(form.date);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    date,
    category: form.category,
    reminderEnabled: form.reminderEnabled,
    reminderType: form.reminderType,
    reminderDateTime: form.reminderEnabled ? form.reminderDateTime : undefined,
    reminderVoiceText: form.reminderVoiceText,
    reminderVoiceGender: form.reminderVoiceGender,
  };
}

export default function Home() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const userId = user?.id;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<"listening" | "processing" | "done">("done");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const showError = (title: string) => (error: Error) =>
    toast({ title, description: error.message, variant: "destructive" });

  // ---------- Dados ----------

  const activitiesKey = ["activities", userId];
  const remindersKey = ["reminders", userId];

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: activitiesKey,
    queryFn: fetchActivities,
    enabled: !!userId,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: remindersKey,
    queryFn: () => fetchReminders(3),
    enabled: !!userId,
  });

  const refreshActivities = () => queryClient.invalidateQueries({ queryKey: activitiesKey });
  const refreshReminders = () => queryClient.invalidateQueries({ queryKey: remindersKey });

  const saveActivityMutation = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ActivityInput }) => {
      if (id) await updateActivity(id, input);
      else await createActivity(input);
    },
    onSuccess: (_data, vars) => {
      refreshActivities();
      toast({ title: vars.id ? "Atividade atualizada!" : "Atividade salva!" });
    },
    onError: showError("Não foi possível salvar a atividade"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      setActivityCompleted(id, completed),
    onMutate: async ({ id, completed }) => {
      // Marca na tela na hora, sem esperar a resposta do servidor.
      queryClient.setQueryData<Activity[]>(activitiesKey, (old) =>
        old?.map((a) => (a.id === id ? { ...a, completed } : a)),
      );
    },
    onError: (error: Error) => {
      refreshActivities();
      showError("Não foi possível atualizar")(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      refreshActivities();
      toast({ title: "Atividade excluída" });
    },
    onError: showError("Não foi possível excluir"),
  });

  const reminderMutation = useMutation({
    mutationFn: createReminder,
    onSuccess: () => {
      refreshReminders();
      setReminderDialogOpen(false);
      reminderForm.reset();
      toast({ title: "Lembrete cadastrado com sucesso!" });
    },
    onError: showError("Não foi possível salvar o lembrete"),
  });

  const deleteReminderMutation = useMutation({
    mutationFn: deleteReminder,
    onSuccess: refreshReminders,
    onError: showError("Não foi possível apagar o lembrete"),
  });

  const reminderForm = useForm({
    resolver: zodResolver(reminderSchema),
    defaultValues: { text: "" },
  });

  // ---------- Ações ----------

  const openNewActivity = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormDialogOpen(true);
  };

  const openEditActivity = (id: string) => {
    const activity = activities.find((a) => a.id === id);
    if (!activity) return;
    setEditing(activity);
    setFormKey((k) => k + 1);
    setFormDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const activity = activities.find((a) => a.id === id);
    if (window.confirm(`Excluir "${activity?.title ?? "esta atividade"}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const cardHandlers = {
    onEdit: openEditActivity,
    onDelete: handleDelete,
    onToggleComplete: (id: string, completed: boolean) => toggleMutation.mutate({ id, completed }),
  };

  // ---------- Filtros ----------

  const selectedDateActivities = activities.filter((a) => isSameDay(a.date, selectedDate));
  const todayActivities = activities.filter((a) => isToday(a.date));
  const activityDates = activities.map((a) => a.date);
  const firstName = (user?.user_metadata?.name as string | undefined)?.split(" ")[0];

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
              onClick={openNewActivity}
              data-testid="button-add-activity"
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">Adicionar atividade</span>
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              data-testid="button-logout"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sair</span>
            </Button>
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
                    <h2 className="text-2xl font-semibold capitalize" data-testid="text-today-title">
                      {format(new Date(), "EEEE", { locale: ptBR })}
                    </h2>
                    <p className="text-sm text-muted-foreground" data-testid="text-today-date">
                      {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {firstName ? `Olá, ${firstName}! ` : ""}
                  Você tem {todayActivities.length}{" "}
                  {todayActivities.length === 1 ? "atividade" : "atividades"} para hoje
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
                        className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 text-sm"
                        data-testid={`text-reminder-${reminder.id}`}
                      >
                        <span>{reminder.text}</span>
                        <button
                          type="button"
                          onClick={() => deleteReminderMutation.mutate(reminder.id)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Apagar lembrete"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Apagar lembrete</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum lembrete cadastrado</p>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-3">
              {loadingActivities ? (
                <p className="text-sm text-muted-foreground">Carregando atividades...</p>
              ) : todayActivities.length > 0 ? (
                todayActivities.map((activity) => (
                  <ActivityCard key={activity.id} {...activity} {...cardHandlers} />
                ))
              ) : (
                <EmptyState
                  icon={CalendarX}
                  title="Nenhuma atividade para hoje"
                  description="Você não tem nenhuma atividade agendada para hoje. Adicione uma no botão +!"
                  actionLabel="Adicionar atividade"
                  onAction={openNewActivity}
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
                    <ActivityCard key={activity.id} {...activity} {...cardHandlers} />
                  ))
                ) : (
                  <EmptyState
                    icon={CalendarX}
                    title="Nenhuma atividade"
                    description="Não há atividades agendadas para esta data."
                    actionLabel="Adicionar atividade"
                    onAction={openNewActivity}
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
          setVoiceDialogOpen(false);
          setVoiceState("done");
        }}
        onCancel={() => {
          setVoiceDialogOpen(false);
          setVoiceState("done");
        }}
      />

      <ActivityFormDialog
        key={formKey}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        initialData={
          editing
            ? {
                title: editing.title,
                description: editing.description,
                date: editing.date,
                time: format(editing.date, "HH:mm"),
                category: editing.category,
                reminderEnabled: editing.reminderEnabled,
                reminderType: editing.reminderType,
                reminderDateTime: editing.reminderDateTime,
                reminderVoiceText: editing.reminderVoiceText,
                reminderVoiceGender: editing.reminderVoiceGender,
              }
            : undefined
        }
        onSave={(activity) => {
          saveActivityMutation.mutate({ id: editing?.id, input: toActivityInput(activity) });
        }}
      />

      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Lembrete</DialogTitle>
          </DialogHeader>
          <Form {...reminderForm}>
            <form
              onSubmit={reminderForm.handleSubmit((data) => reminderMutation.mutate(data.text))}
              className="space-y-4"
            >
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
