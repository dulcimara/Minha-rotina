import { VoiceCommandDialog } from "../VoiceCommandDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function VoiceCommandDialogExample() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"listening" | "processing" | "done">("done");
  
  const startListening = () => {
    setOpen(true);
    setState("listening");
    
    setTimeout(() => {
      setState("processing");
      setTimeout(() => {
        setState("done");
      }, 1500);
    }, 2000);
  };
  
  return (
    <div className="p-4">
      <Button onClick={startListening}>Abrir diálogo de voz</Button>
      <VoiceCommandDialog
        open={open}
        onOpenChange={setOpen}
        isListening={state === "listening"}
        transcript="adicionar consulta médica dia 12/12/2025 às 16h"
        isProcessing={state === "processing"}
        onConfirm={() => {
          console.log("Comando confirmado");
          setOpen(false);
        }}
        onCancel={() => {
          console.log("Comando cancelado");
          setOpen(false);
        }}
      />
    </div>
  );
}
