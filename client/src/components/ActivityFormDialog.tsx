import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/NativeSelect";
import { Bell, Volume2, MessageSquare, User } from "lucide-react";
import { CATEGORIES, REMINDER_OPTIONS } from "@/lib/options";
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

export function ActivityFormDialog({ open, onOpenChange, onSave, activity, defaultDate }: ActivityFormDialogProps) {
  const start = activity?.date ?? defaultDate ?? new Date();
  const [title, setTitle] = useState(activity?.title ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [time, setTime] = useState(activity ? format(activity.date, "HH:mm") : "09:00");
  const [category, setCategory] = useState(activity?.category ?? "");
  const [reminderEnabled, setReminderEnabled] = useState(activity?.reminderEnabled ?? true);
  const [minutesBefore, setMinutesBefore] = useState(activity?.reminderMinutesBefore ?? 30);
  const [reminderType, setReminderType] = useState<"text" | "voice">(activity?.reminderType ?? "text");
  const [voiceText, setVoiceText] = useState(activity?.reminderVoiceText ?? "");
  const [voiceGender, setVoiceGender] = useState<"male" | "female">(activity?.reminderVoiceGender ?? "female");

  const canSave =
    title.trim() && date && time && category && !(reminderEnabled && reminderType === "voice" && !voiceText.trim());

  const handleSave = () => {
    if (!canSave) return;
    const [y, m, d] = date.split("-").map(Number);
    const [h, min] = time.split(":").map(Number);
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      date: new Date(y, m - 1, d, h, min),
      category,
      reminderEnabled,
      reminderType,
      reminderMinutesBefore: minutesBefore,
      reminderVoiceText: reminderType === "voice" ? voiceText : undefined,
      reminderVoiceGender: reminderType === "voice" ? voiceGender : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-activity-form">
        <DialogHeader>
          <DialogTitle>{activity ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          <DialogDescription>Preencha os detalhes. Dica: dá para fazer isso falando, pelo microfone.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">O quê *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Consulta no dentista"
              data-testid="input-activity-title"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Detalhes</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Endereço, o que levar..."
              rows={2}
              data-testid="input-activity-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Dia *</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time">Hora *</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Categoria *</Label>
            <NativeSelect id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="" disabled>
                Selecione...
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </NativeSelect>
          </div>

          <Card className="p-4 space-y-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder-enabled" className="flex items-center gap-2 font-semibold cursor-pointer">
                <Bell className="h-4 w-4 text-primary" /> Alerta com som
              </Label>
              <Switch id="reminder-enabled" checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </div>

            {reminderEnabled && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="before">Avisar</Label>
                  <NativeSelect id="before" value={minutesBefore} onChange={(e) => setMinutesBefore(Number(e.target.value))}>
                    {REMINDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={reminderType === "text" ? "default" : "outline"}
                    onClick={() => setReminderType("text")}
                    className="justify-start gap-2"
                  >
                    <MessageSquare className="h-4 w-4" /> Aviso padrão
                  </Button>
                  <Button
                    type="button"
                    variant={reminderType === "voice" ? "default" : "outline"}
                    onClick={() => setReminderType("voice")}
                    className="justify-start gap-2"
                  >
                    <Volume2 className="h-4 w-4" /> Frase falada
                  </Button>
                </div>

                {reminderType === "voice" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="voice-text">Frase que o app vai falar *</Label>
                      <Textarea
                        id="voice-text"
                        value={voiceText}
                        onChange={(e) => setVoiceText(e.target.value)}
                        placeholder="Ex.: Hora de sair para o dentista! Leve a carteirinha."
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={voiceGender === "female" ? "default" : "outline"}
                        onClick={() => setVoiceGender("female")}
                        className="justify-start gap-2"
                      >
                        <User className="h-4 w-4" /> Voz feminina
                      </Button>
                      <Button
                        type="button"
                        variant={voiceGender === "male" ? "default" : "outline"}
                        onClick={() => setVoiceGender("male")}
                        className="justify-start gap-2"
                      >
                        <User className="h-4 w-4" /> Voz masculina
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-activity">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave} data-testid="button-save-activity">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
