import { formatPhone } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BellRing, MapPin, Phone, Volume2 } from "lucide-react";
import type { AlertItem } from "@/hooks/use-alerts";

interface AlertModalProps {
  alert: AlertItem | null;
  onDismiss: () => void;
  onSnooze: () => void;
  /** remédio: marcar a dose como tomada */
  onTaken?: () => void;
  /** falar o aviso de novo (se o celular não deixou falar sozinho, um toque resolve) */
  onSpeak?: () => void;
}

export function AlertModal({ alert, onDismiss, onSnooze, onTaken, onSpeak }: AlertModalProps) {
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
        {(alert?.address || alert?.phone) && (
          <div className="flex flex-col items-center gap-1.5 text-sm">
            {alert.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.address)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
              >
                <MapPin className="h-4 w-4" /> {alert.address}
              </a>
            )}
            {alert.phone && (
              <a href={`tel:${alert.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 text-primary">
                <Phone className="h-4 w-4" /> {formatPhone(alert.phone)}
              </a>
            )}
          </div>
        )}
        {onSpeak && alert?.spoken && (
          <Button variant="ghost" size="sm" className="mx-auto gap-1.5" onClick={onSpeak} data-testid="button-alert-speak">
            <Volume2 className="h-4 w-4" /> Ouvir
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" onClick={onSnooze} data-testid="button-alert-snooze">
            Adiar 5 min
          </Button>
          {alert?.dose && onTaken ? (
            <Button onClick={onTaken} data-testid="button-alert-taken">
              Tomei ✓
            </Button>
          ) : (
            <Button onClick={onDismiss} data-testid="button-alert-dismiss">
              OK
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
