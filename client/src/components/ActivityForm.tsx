import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, upperFirst } from "@/lib/utils";
import { DayCalendar } from "@/components/DayCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/NativeSelect";
import { WeekdayPicker } from "@/components/WeekdayPicker";
import { useChildren } from "@/hooks/use-data";
import { Bell, MapPin, Phone } from "lucide-react";
import { VoiceChoice } from "@/components/VoiceChoice";
import { CATEGORIES, REMINDER_OPTIONS } from "@/lib/options";
import type { Activity, ActivityInput } from "@/lib/data";

interface ActivityFormProps {
  onSave: (activity: ActivityInput) => void;
  onCancel?: () => void;
  /** Atividade para editar; vazio = nova. */
  activity?: Activity | null;
  /** Dia sugerido para uma atividade nova. */
  defaultDate?: Date;
  /** Mostra o calendário grande para escolher o dia (tela Agenda). */
  withCalendar?: boolean;
  /** Dias que já têm compromisso (bolinha no calendário). */
  markedDates?: Date[];
  /** O que mostrar logo abaixo do calendário para o dia tocado (ex.: compromissos do dia). */
  renderDay?: (day: Date) => ReactNode;
}

export function ActivityForm({ onSave, onCancel, activity, defaultDate, withCalendar, markedDates = [], renderDay }: ActivityFormProps) {
  const start = activity?.date ?? defaultDate ?? new Date();
  const [title, setTitle] = useState(activity?.title ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [address, setAddress] = useState(activity?.address ?? "");
  const [phone, setPhone] = useState(activity?.phone ?? "");
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [time, setTime] = useState(activity ? format(activity.date, "HH:mm") : "09:00");
  const [category, setCategory] = useState(activity?.category ?? "");
  const [reminderEnabled, setReminderEnabled] = useState(activity?.reminderEnabled ?? true);
  const [minutesBefore, setMinutesBefore] = useState(activity?.reminderMinutesBefore ?? 30);
  const [repeatDays, setRepeatDays] = useState<number[]>(activity?.repeatDays ?? []);
  const [childId, setChildId] = useState(activity?.childId ?? "");
  const { data: children = [] } = useChildren();
  const [reminderType, setReminderType] = useState<"text" | "voice">(activity?.reminderType ?? "text");
  const [voiceText, setVoiceText] = useState(activity?.reminderVoiceText ?? "");
  const [voiceGender, setVoiceGender] = useState<"male" | "female">(activity?.reminderVoiceGender ?? "female");

  const selectedDay = (() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();

  const canSave =
    title.trim() && date && time && category && !(reminderEnabled && reminderType === "voice" && !voiceText.trim());

  const handleSave = () => {
    if (!canSave) return;
    const [y, m, d] = date.split("-").map(Number);
    const [h, min] = time.split(":").map(Number);
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      ...(address.trim() || activity?.address ? { address } : {}),
      ...(phone.trim() || activity?.phone ? { phone } : {}),
      date: new Date(y, m - 1, d, h, min),
      category,
      reminderEnabled,
      reminderType,
      reminderMinutesBefore: minutesBefore,
      ...(repeatDays.length || activity?.repeatDays?.length ? { repeatDays } : {}),
      ...(childId || activity?.childId ? { childId } : {}),
      reminderVoiceText: reminderType === "voice" ? voiceText : undefined,
      reminderVoiceGender: reminderType === "voice" ? voiceGender : undefined,
    });
  };

  return (
      <div className="space-y-4">
        {withCalendar && (
          <div className="space-y-2">
            <DayCalendar selectedDate={selectedDay} onSelectDate={(d) => setDate(format(d, "yyyy-MM-dd"))} activityDates={markedDates} />
            {renderDay?.(selectedDay)}
            <p className={cn("text-center text-sm", renderDay && "border-t pt-4")}>
              {repeatDays.length ? "Começa em " : renderDay ? "Novo compromisso em " : "Dia escolhido: "}
              <strong>{(renderDay ? (t: string) => t : upperFirst)(format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR }))}</strong>
            </p>
          </div>
        )}

        <div className="space-y-4">
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
              placeholder="O que levar, observações..."
              rows={2}
              data-testid="input-activity-description"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Endereço <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex.: Rua das Flores, 123 — sala 4"
              autoComplete="street-address"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Telefone <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex.: (61) 99999-0000"
              autoComplete="tel"
            />
          </div>

          <div className={withCalendar ? "" : "grid grid-cols-2 gap-3"}>
            {!withCalendar && (
              <div className="space-y-1.5">
                <Label htmlFor="date">{repeatDays.length ? "Começa em *" : "Dia *"}</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            )}
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

          {children.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="child">Para quem</Label>
              <NativeSelect id="child" value={childId} onChange={(e) => setChildId(e.target.value)}>
                <option value="">Para mim / família</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </div>
          )}

          <WeekdayPicker id="repeat" value={repeatDays} onChange={setRepeatDays} />

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

                <VoiceChoice
                  idPrefix="activity"
                  voice={reminderType === "voice"}
                  onVoiceChange={(v) => setReminderType(v ? "voice" : "text")}
                  text={voiceText}
                  onTextChange={setVoiceText}
                  gender={voiceGender}
                  onGenderChange={setVoiceGender}
                />
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} data-testid="button-cancel-activity">
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} disabled={!canSave} data-testid="button-save-activity">
            {activity ? "Salvar alterações" : "Agendar"}
          </Button>
        </div>
      </div>
  );
}
