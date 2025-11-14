import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isListening: boolean;
  transcript: string;
  isProcessing: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function VoiceCommandDialog({
  open,
  onOpenChange,
  isListening,
  transcript,
  isProcessing,
  onConfirm,
  onCancel,
}: VoiceCommandDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-voice-command">
        <DialogHeader>
          <DialogTitle>Comando por Voz</DialogTitle>
          <DialogDescription>
            {isListening
              ? "Fale seu comando..."
              : isProcessing
              ? "Processando seu comando..."
              : "Comando reconhecido"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          {isListening && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative p-6 rounded-full bg-primary">
                  <Mic className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Escutando...
              </p>
            </div>
          )}
          
          {isProcessing && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processando...</p>
            </div>
          )}
          
          {!isListening && !isProcessing && transcript && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-2">Transcrição:</p>
                <p className="text-sm" data-testid="text-transcript">{transcript}</p>
              </div>
              
              <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                <p className="text-sm font-medium mb-2">Atividade identificada:</p>
                <div className="space-y-1 text-sm">
                  <p data-testid="text-extracted-title">
                    <span className="font-medium">Título:</span> Consulta médica
                  </p>
                  <p data-testid="text-extracted-date">
                    <span className="font-medium">Data:</span> 12/12/2025 às 16:00
                  </p>
                  <p data-testid="text-extracted-category">
                    <span className="font-medium">Categoria:</span> Saúde
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {!isListening && !isProcessing && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel-voice-command"
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              data-testid="button-confirm-voice-command"
            >
              Confirmar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
