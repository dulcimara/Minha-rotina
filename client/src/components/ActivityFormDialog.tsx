import { Dialog, DialogContent } from "@/components/ui/dialog";
import { KindHeader } from "@/components/KindHeader";
import { ActivityForm } from "@/components/ActivityForm";
import type { Activity, ActivityInput } from "@/lib/data";

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (activity: ActivityInput) => void;
  /** Atividade para editar; vazio = nova. */
  activity?: Activity | null;
  /** Dia sugerido para uma atividade nova. */
  defaultDate?: Date;
}

/** Formulário de compromisso numa janela (botão + e editar). */
export function ActivityFormDialog({ open, onOpenChange, onSave, activity, defaultDate }: ActivityFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-activity-form">
        <KindHeader
          kind="activity"
          title={activity ? "Editar compromisso" : "Novo compromisso"}
          description="Preencha os detalhes. Dica: dá para fazer isso falando, pelo microfone."
        />
        <ActivityForm
          activity={activity}
          defaultDate={defaultDate}
          onCancel={() => onOpenChange(false)}
          onSave={(input) => {
            onSave(input);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
