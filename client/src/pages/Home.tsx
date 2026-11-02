import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ActivityFormDialog } from "@/components/ActivityFormDialog";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { AlertModal } from "@/components/AlertModal";
import { TodayTab } from "@/components/tabs/TodayTab";
import { AgendaTab } from "@/components/tabs/AgendaTab";
import { ShoppingTab } from "@/components/tabs/ShoppingTab";
import { CycleTab } from "@/components/tabs/CycleTab";
import { CalendarDays, Droplet, Home as HomeIcon, LogOut, Mic, Plus, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { keys, refresh, useActivities, useUserId } from "@/hooks/use-data";
import { useAlerts } from "@/hooks/use-alerts";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  createActivity,
  deleteActivity,
  setActivityCompleted,
  updateActivity,
  type Activity,
  type ActivityInput,
} from "@/lib/data";

export type TabName = "hoje" | "agenda" | "compras" | "ciclo";

const NAV: { tab: TabName; label: string; icon: typeof HomeIcon }[] = [
  { tab: "hoje", label: "Hoje", icon: HomeIcon },
  { tab: "agenda", label: "Agenda", icon: CalendarDays },
  { tab: "compras", label: "Compras", icon: ShoppingCart },
  { tab: "ciclo", label: "Ciclo", icon: Droplet },
];

export default function Home() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const userId = useUserId();
  const { data: activities = [], isLoading } = useActivities();
  const alerts = useAlerts();

  const [tab, setTab] = useState<TabName>("hoje");
  const [voice, setVoice] = useState<{ open: boolean; mode: "voice" | "type" }>({ open: false, mode: "voice" });
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => setActivityCompleted(id, completed),
    onMutate: ({ id, completed }) => {
      queryClient.setQueryData<Activity[]>(keys.activities(userId), (old) =>
        old?.map((a) => (a.id === id ? { ...a, completed } : a)),
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
    const activity = activities.find((a) => a.id === id);
    if (activity) setForm((f) => ({ open: true, key: f.key + 1, activity }));
  };

  const cardHandlers = {
    onEdit: openEdit,
    onDelete: (id: string) => {
      const a = activities.find((x) => x.id === id);
      if (window.confirm(`Excluir "${a?.title ?? "este compromisso"}"?`)) deleteMutation.mutate(id);
    },
    onToggleComplete: (id: string, completed: boolean) => toggleMutation.mutate({ id, completed }),
  };

  const openVoice = (mode: "voice" | "type" = "voice") => setVoice({ open: true, mode });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
        <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-display font-semibold text-primary" data-testid="text-app-title">
            Minha Rotina
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => openNew()} data-testid="button-add-activity" title="Novo compromisso">
              <Plus className="h-5 w-5" />
              <span className="sr-only">Novo compromisso</span>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => signOut()} data-testid="button-logout" title="Sair">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sair</span>
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
            onVoice={openVoice}
            onNavigate={setTab}
            cardHandlers={cardHandlers}
          />
        )}
        {tab === "agenda" && <AgendaTab activities={activities} onAdd={openNew} cardHandlers={cardHandlers} />}
        {tab === "compras" && <ShoppingTab onVoice={() => openVoice("voice")} />}
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
              onClick={() => openVoice("voice")}
              className="-mt-7 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background flex items-center justify-center active:scale-95 transition-transform"
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

      <AlertModal alert={alerts.current} onDismiss={alerts.dismiss} onSnooze={() => alerts.snooze(5)} />
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
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
