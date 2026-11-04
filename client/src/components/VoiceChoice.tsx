import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Play, User, Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";

export type VoiceGender = "male" | "female";

interface VoiceChoiceProps {
  voice: boolean;
  onVoiceChange: (voice: boolean) => void;
  text: string;
  onTextChange: (text: string) => void;
  gender: VoiceGender;
  onGenderChange: (gender: VoiceGender) => void;
  placeholder?: string;
  idPrefix: string;
}

/**
 * "Aviso padrão" ou "Frase falada": usado em compromissos e lembretes.
 * Com "Frase falada", na hora do aviso o app lê a frase em voz alta.
 */
export function VoiceChoice({
  voice,
  onVoiceChange,
  text,
  onTextChange,
  gender,
  onGenderChange,
  placeholder = "Ex.: Hora de sair para o dentista! Leve a carteirinha.",
  idPrefix,
}: VoiceChoiceProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={!voice ? "default" : "outline"}
          onClick={() => onVoiceChange(false)}
          className="justify-start gap-2"
        >
          <MessageSquare className="h-4 w-4" /> Aviso padrão
        </Button>
        <Button
          type="button"
          variant={voice ? "default" : "outline"}
          onClick={() => onVoiceChange(true)}
          className="justify-start gap-2"
          data-testid={`${idPrefix}-voice`}
        >
          <Volume2 className="h-4 w-4" /> Frase falada
        </Button>
      </div>

      {voice && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-voice-text`}>Frase que o app vai falar *</Label>
            <Textarea
              id={`${idPrefix}-voice-text`}
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder={placeholder}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={gender === "female" ? "default" : "outline"}
              onClick={() => onGenderChange("female")}
              className="justify-start gap-2"
            >
              <User className="h-4 w-4" /> Voz feminina
            </Button>
            <Button
              type="button"
              variant={gender === "male" ? "default" : "outline"}
              onClick={() => onGenderChange("male")}
              className="justify-start gap-2"
            >
              <User className="h-4 w-4" /> Voz masculina
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2"
            disabled={!text.trim()}
            onClick={() => speak(text.trim(), gender)}
          >
            <Play className="h-4 w-4" /> Ouvir como fica
          </Button>
        </div>
      )}
    </div>
  );
}
