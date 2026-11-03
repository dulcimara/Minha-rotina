import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ActivityFormDialog } from "@/components/ActivityFormDialog";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { AlertModal } from "@/components/AlertModal";
import { MonthlyShoppingPrompt } from "@/components/MonthlyShoppingPrompt";
import { TodayTab } from "@/components/tabs/TodayTab";
import { AgendaTab } from "@/components/tabs/AgendaTab";
import { ListsTab, MOVIES } from "@/components/tabs/ListsTab";
import { CycleTab } from "@/components/tabs/CycleTab";
import { Baby, CalendarDays, Droplet, Home as HomeIcon, ListChecks, Mic, Plus, Settings } from "lucide-react";
import { ChildrenDialog } from "@/components/ChildrenDialog";
import { Onboarding } from "@/components/Onboarding";
import { useAuth } from "@/hooks/use-auth";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { keys, refresh, useActivities, useUserId } from "@/hooks/use-data";
import { useAlerts } from "@/hooks/use-alerts";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  createActivity,
  deleteActivity,
  setActivityCompleted,
  setOccurrenceCompleted,
  setDoseTaken,
  updateActivity,
  type Activity,
  type ActivityInput,
} from "@/lib/data";

export type TabName = "hoje" | "agenda" | "compras" | "ciclo";

const NAV: { tab: TabName; label: string; icon: typeof HomeIcon }[] = [
  { tab: "hoje", label: "Hoje", icon: HomeIcon },
  { tab: "agenda", label: "Agenda", icon: CalendarDays },
  { tab: "compras", label: "Listas", icon: ListChecks },
  { tab: "ciclo", label: "Ciclo", icon: Droplet },
];

export default function Home() {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: activities = [], isLoading } = useActivities();
  const alerts = useAlerts();

  const [tab, setTab] = useState<TabName>("hoje");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useAuth();
  const onboarded = Boolean((user?.user_metadata as { onboarded_at?: string } | undefined)?.onboarded_at);
  const [childrenOpen, setChildrenOpen] = useState(false);
  /** lista aberta na aba Listas (vazio = lista de compras) */
  const [listId, setListId] = useState<string | undefined>();
  const [voice, setVoice] = useState<{ open: boolean; mode: "voice" | "type"; context?: "shopping" }>({
    open: false,
    mode: "voice",
  });
  const [form, setForm] = useState<{ open: boolean; key: number; activity: Activity | null; date?: Date }>({
    open: false,
    key: 0,
    activity: null,
  });

  const showError = (title: string) => (error: Error) =>
    toast({ title, description: error.message, variant: "destructive" });

  // ---------- Ações das atividades ----------

  const saveMutation = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ActivityInput }) =>
      id ? updateActivity(id, input) : createActivity(input),
    onSuccess: (_d, vars) => {
      refresh(userId, "activities");
      toast({ title: vars.id ? "Compromisso atualizado!" : "Compromisso salvo!" });
    },
    onError: showError("Não foi possível salvar"),
  });

  // Ids de ocorrências de atividades recorrentes vêm como "<id>@AAAA-MM-DD".
  const splitId = (id: string) => {
    const [baseId, day] = id.split("@");
    return { baseId, day };
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => {
      const { baseId, day } = splitId(id);
      if (!day) return setActivityCompleted(baseId, completed);
      const current = activities.find((a) => a.id === baseId)?.completedDates ?? [];
      return setOccurrenceCompleted(baseId, day, completed, current);
    },
    onMutate: ({ id, completed }) => {
      const { baseId, day } = splitId(id);
      queryClient.setQueryData<Activity[]>(keys.activities(userId), (old) =>
        old?.map((a) => {
          if (a.id !== baseId) return a;
          if (!day) return { ...a, completed };
          const dates = a.completedDates ?? [];
          return { ...a, completedDates: completed ? [...dates, day] : dates.filter((d) => d !== day) };
        }),
      );
    },
    onError: (error: Error) => {
      refresh(userId, "activities");
      showError("Não foi possível atualizar")(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      refresh(userId, "activities");
      toast({ title: "Compromisso excluído" });
    },
    onError: showError("Não foi possível excluir"),
  });

  const openNew = (date?: Date) => setForm((f) => ({ open: true, key: f.key + 1, activity: null, date }));
  const openEdit = (id: string) => {
    const activity = activities.find((a) => a.id === splitId(id).baseId);
    if (activity) setForm((f) => ({ open: true, key: f.key + 1, activity }));
  };

  const cardHandlers = {
    onEdit: openEdit,
    onDelete: (id: string) => {
      const { baseId } = splitId(id);
      const a = activities.find((x) => x.id === baseId);
      const msg = a?.repeatDays?.length
        ? `Excluir "${a.title}" e todas as repetições?`
        : `Excluir "${a?.title ?? "este compromisso"}"?`;
      if (window.confirm(msg)) deleteMutation.mutate(baseId);
    },
    onToggleComplete: (id: string, completed: boolean) => toggleMutation.mutate({ id, completed }),
  };

  const openVoice = (mode: "voice" | "type" = "voice", context?: "shopping") => setVoice({ open: true, mode, context });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
        <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-display font-semibold text-primary flex items-center gap-2" data-testid="text-app-title">
            <img src="/icon-192.png" alt="" className="h-7 w-7 rounded-lg" />
            Minha Rotina
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => openNew()} data-testid="button-add-activity" title="Novo compromisso">
              <Plus className="h-5 w-5" />
              <span className="sr-only">Novo compromisso</span>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setChildrenOpen(true)} data-testid="button-children" title="Meus filhos">
              <Baby className="h-5 w-5" />
              <span className="sr-only">Meus filhos</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} data-testid="button-settings" title="Configurações">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Configurações</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-5 pb-32">
        {tab === "hoje" && (
          <TodayTab
            activities={activities}
            loading={isLoading}
            onAdd={() => openNew()}
            onNavigate={setTab}
            cardHandlers={cardHandlers}
          />
        )}
        {tab === "agenda" && (
          <AgendaTab activities={activities} onSave={(input) => saveMutation.mutate({ input })} />
        )}
        {tab === "compras" && (
          <ListsTab listId={listId} onSelectList={setListId} onVoice={() => openVoice("voice", "shopping")} />
        )}
        {tab === "ciclo" && <CycleTab />}
      </main>

      {/* Barra de navegação inferior com o microfone no centro */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative max-w-2xl mx-auto grid grid-cols-5 h-16">
          {NAV.slice(0, 2).map((item) => (
            <NavButton key={item.tab} {...item} active={tab === item.tab} onClick={() => setTab(item.tab)} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => openVoice("voice", tab === "compras" && listId !== MOVIES ? "shopping" : undefined)}
              className="-mt-7 h-16 w-16 rounded-full bg-mic text-white shadow-[0_8px_20px_-6px_hsl(320_60%_50%/0.6)] ring-4 ring-background flex items-center justify-center active:scale-95 transition-transform"
              data-testid="button-voice-recording"
            >
              <Mic className="h-7 w-7" />
              <span className="sr-only">Falar com o app</span>
            </button>
          </div>
          {NAV.slice(2).map((item) => (
            <NavButton key={item.tab} {...item} active={tab === item.tab} onClick={() => setTab(item.tab)} />
          ))}
        </div>
      </nav>

      <VoiceAssistant
        open={voice.open}
        mode={voice.mode}
        context={voice.context}
        listId={voice.context === "shopping" && listId !== MOVIES ? listId : undefined}
        onOpenChange={(open) => setVoice((v) => ({ ...v, open }))}
      />

      <ActivityFormDialog
        key={form.key}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        activity={form.activity}
        defaultDate={form.date}
        onSave={(input) => saveMutation.mutate({ id: form.activity?.id, input })}
      />

      {/* espera o alerta (se houver) ser fechado, para não abrir uma janela sobre a outra */}
      <Onboarding />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ChildrenDialog open={childrenOpen} onOpenChange={setChildrenOpen} />

      <MonthlyShoppingPrompt paused={!!alerts.current || !onboarded} />

      <AlertModal
        alert={alerts.current}
        onDismiss={alerts.dismiss}
        onSnooze={() => alerts.snooze(5)}
        onTaken={() => {
          const d = alerts.current?.dose;
          if (d) {
            setDoseTaken(d.medicationId, d.day, d.time, true).then(
              () => refresh(userId, "doses"),
              (err: Error) => showError("Não foi possível salvar")(err),
            );
          }
          alerts.dismiss();
        }}
      />
    </div>
  );
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof HomeIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
        active ? "text-primary font-semibold" : "text-muted-foreground",
      )}
    >
      <span className={cn("rounded-full px-4 py-1 transition-colors", active && "bg-secondary")}>
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}
