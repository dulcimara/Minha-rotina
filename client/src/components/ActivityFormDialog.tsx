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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Bell, Volume2, MessageSquare, User } from "lucide-react";
import { format, subMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (activity: {
    title: string;
    description: string;
    date: Date;
    time: string;
    category: string;
    reminderEnabled: boolean;
    reminderType: "text" | "voice";
    reminderDateTime: Date;
    reminderVoiceText?: string;
    reminderVoiceGender?: "male" | "female";
  }) => void;
  initialData?: {
    title?: string;
    description?: string;
    date?: Date;
    time?: string;
    category?: string;
    reminderEnabled?: boolean;
    reminderType?: "text" | "voice";
    reminderDateTime?: Date;
    reminderVoiceText?: string;
    reminderVoiceGender?: "male" | "female";
  };
}

const categories = [
  { value: "saude", label: "Saúde" },
  { value: "trabalho", label: "Trabalho" },
  { value: "casa", label: "Casa" },
  { value: "lazer", label: "Lazer" },
  { value: "autocuidado", label: "Autocuidado" },
  { value: "fitness", label: "Fitness" },
];

export function ActivityFormDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
}: ActivityFormDialogProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [date, setDate] = useState<Date | undefined>(initialData?.date || new Date());
  const [time, setTime] = useState(initialData?.time || "12:00");
  const [category, setCategory] = useState(initialData?.category || "");
  const [reminderEnabled, setReminderEnabled] = useState(initialData?.reminderEnabled ?? true);
  const [reminderType, setReminderType] = useState<"text" | "voice">(initialData?.reminderType || "text");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(initialData?.reminderDateTime);
  const [reminderTime, setReminderTime] = useState("");
  const [reminderVoiceText, setReminderVoiceText] = useState(initialData?.reminderVoiceText || "");
  const [reminderVoiceGender, setReminderVoiceGender] = useState<"male" | "female">(initialData?.reminderVoiceGender || "female");

  useEffect(() => {
    if (date && time && !initialData?.reminderDateTime) {
      const [hours, minutes] = time.split(':').map(Number);
      const activityDateTime = new Date(date);
      activityDateTime.setHours(hours, minutes);
      
      const defaultReminderDateTime = subMinutes(activityDateTime, 30);
      setReminderDate(defaultReminderDateTime);
      setReminderTime(format(defaultReminderDateTime, "HH:mm"));
    } else if (initialData?.reminderDateTime) {
      setReminderTime(format(initialData.reminderDateTime, "HH:mm"));
    }
  }, [date, time, initialData]);

  const handleSave = () => {
    if (title && date && category && reminderDate) {
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const finalReminderDateTime = new Date(reminderDate);
      finalReminderDateTime.setHours(hours, minutes);
      
      onSave?.({
        title,
        description,
        date,
        time,
        category,
        reminderEnabled,
        reminderType,
        reminderDateTime: finalReminderDateTime,
        reminderVoiceText: reminderType === "voice" ? reminderVoiceText : undefined,
        reminderVoiceGender: reminderType === "voice" ? reminderVoiceGender : undefined,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-activity-form">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Atividade" : "Nova Atividade"}
          </DialogTitle>
          <DialogDescription>
            Preencha os detalhes da atividade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Consulta médica"
              data-testid="input-activity-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione detalhes sobre a atividade..."
              data-testid="input-activity-description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-testid="input-activity-time"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" data-testid="select-category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="p-4 space-y-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <Label htmlFor="reminder-enabled" className="font-semibold cursor-pointer">
                  Configurar lembrete
                </Label>
              </div>
              <Switch
                id="reminder-enabled"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
                data-testid="switch-reminder-enabled"
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Tipo de lembrete</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={reminderType === "text" ? "default" : "outline"}
                      onClick={() => setReminderType("text")}
                      data-testid="button-reminder-type-text"
                      className="justify-start gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Texto no app
                    </Button>
                    <Button
                      type="button"
                      variant={reminderType === "voice" ? "default" : "outline"}
                      onClick={() => setReminderType("voice")}
                      data-testid="button-reminder-type-voice"
                      className="justify-start gap-2"
                    >
                      <Volume2 className="h-4 w-4" />
                      Por voz
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data do lembrete</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !reminderDate && "text-muted-foreground"
                          )}
                          data-testid="button-select-reminder-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {reminderDate ? format(reminderDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={reminderDate}
                          onSelect={setReminderDate}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminder-time">Horário</Label>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      data-testid="input-reminder-time"
                    />
                  </div>
                </div>

                {reminderType === "voice" && (
                  <div className="space-y-4 pt-2 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="voice-text">Mensagem de voz *</Label>
                      <Textarea
                        id="voice-text"
                        value={reminderVoiceText}
                        onChange={(e) => setReminderVoiceText(e.target.value)}
                        placeholder="Ex: Você tem consulta médica em 30 minutos"
                        data-testid="input-voice-message"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Esta mensagem será lida em voz alta
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de voz</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={reminderVoiceGender === "female" ? "default" : "outline"}
                          onClick={() => setReminderVoiceGender("female")}
                          data-testid="button-voice-female"
                          className="justify-start gap-2"
                        >
                          <User className="h-4 w-4" />
                          Voz feminina
                        </Button>
                        <Button
                          type="button"
                          variant={reminderVoiceGender === "male" ? "default" : "outline"}
                          onClick={() => setReminderVoiceGender("male")}
                          data-testid="button-voice-male"
                          className="justify-start gap-2"
                        >
                          <User className="h-4 w-4" />
                          Voz masculina
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Padrão: 30 minutos antes da atividade
                </p>
              </div>
            )}
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-activity"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !title || 
              !date || 
              !category || 
              (reminderEnabled && (!reminderDate || !reminderTime)) ||
              (reminderEnabled && reminderType === "voice" && !reminderVoiceText.trim())
            }
            data-testid="button-save-activity"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
