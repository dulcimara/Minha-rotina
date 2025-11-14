import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  onRecordingChange?: (isRecording: boolean) => void;
  onTranscript?: (text: string) => void;
}

export function VoiceButton({ onRecordingChange, onTranscript }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = () => {
    const newState = !isRecording;
    setIsRecording(newState);
    onRecordingChange?.(newState);
    
    if (newState) {
      console.log("Iniciando gravação de voz...");
    } else {
      console.log("Parando gravação de voz...");
      onTranscript?.("adicionar consulta médica dia 12/12/2025 às 16h");
    }
  };

  return (
    <Button
      size="icon"
      variant={isRecording ? "destructive" : "default"}
      onClick={toggleRecording}
      data-testid="button-voice-recording"
      className={cn(
        "h-14 w-14 rounded-full shadow-lg",
        isRecording && "animate-pulse"
      )}
    >
      {isRecording ? (
        <MicOff className="h-6 w-6" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
      <span className="sr-only">
        {isRecording ? "Parar gravação" : "Iniciar gravação"}
      </span>
    </Button>
  );
}
