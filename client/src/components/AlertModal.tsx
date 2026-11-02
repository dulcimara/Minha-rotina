import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import type { AlertItem } from "@/hooks/use-alerts";

interface AlertModalProps {
  alert: AlertItem | null;
  onDismiss: () => void;
  onSnooze: () => void;
}

export function AlertModal({ alert, onDismiss, onSnooze }: AlertModalProps) {
  return (
    <Dialog open={!!alert} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent className="sm:max-w-sm border-t-8 border-t-accent text-center" data-testid="dialog-alert">
        <div className="flex justify-center pt-2">
          <div className="rounded-full bg-accent/15 p-4">
            <BellRing className="h-10 w-10 text-accent animate-bounce" />
          </div>
        </div>
        <DialogTitle className="text-2xl font-display">{alert?.title}</DialogTitle>
        <DialogDescription className="text-base">{alert?.subtitle}</DialogDescription>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" onClick={onSnooze} data-testid="button-alert-snooze">
            Adiar 5 min
          </Button>
          <Button onClick={onDismiss} data-testid="button-alert-dismiss">
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
