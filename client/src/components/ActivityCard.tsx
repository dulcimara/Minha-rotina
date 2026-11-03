import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Clock, Bell, Volume2, MapPin, Phone, Repeat } from "lucide-react";
import { repeatLabel } from "@/lib/recurrence";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CategoryArt } from "@/components/CategoryArt";
import { categoryLabel, reminderLabel } from "@/lib/options";

interface ActivityCardProps {
  id: string;
  title: string;
  description?: string;
  address?: string;
  phone?: string;
  repeatDays?: number[];
  date: Date;
  category: string;
  completed: boolean;
  reminderEnabled?: boolean;
  reminderType?: "text" | "voice";
  reminderDateTime?: Date;
  reminderMinutesBefore?: number;
  showDate?: boolean;
  reminderVoiceText?: string;
  reminderVoiceGender?: "male" | "female";
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleComplete?: (id: string, completed: boolean) => void;
}

export function ActivityCard({
  id,
  title,
  description,
  address,
  phone,
  repeatDays,
  date,
  category,
  completed,
  reminderEnabled,
  reminderType,
  reminderDateTime,
  reminderMinutesBefore,
  showDate,
  reminderVoiceText,
  reminderVoiceGender,
  onEdit,
  onDelete,
  onToggleComplete,
}: ActivityCardProps) {
  return (
    <Card 
      className={cn(
        "p-4 hover-elevate transition-all",
        completed && "opacity-60"
      )}
      data-testid={`card-activity-${id}`}
    >
      <div className="flex items-start gap-3">
        <CategoryArt category={category} className={cn(completed && "grayscale")} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 
              className={cn(
                "font-medium text-base",
                completed && "line-through text-muted-foreground"
              )}
              data-testid={`text-activity-title-${id}`}
            >
              {title}
              <span className="block text-xs font-normal text-muted-foreground">{categoryLabel(category)}</span>
            </h3>
            <Checkbox
              checked={completed}
              onCheckedChange={(checked) => onToggleComplete?.(id, !!checked)}
              data-testid={`checkbox-activity-${id}`}
              aria-label={completed ? "Marcar como não feito" : "Marcar como feito"}
              className="mt-0.5 h-6 w-6 rounded-full shrink-0"
            />
          </div>
          
          {description && (
            <p className="text-sm text-muted-foreground mb-2" data-testid={`text-description-${id}`}>
              {description}
            </p>
          )}
          
          {(address || phone) && (
            <div className="flex flex-col gap-1 mb-2 text-sm">
              {address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-1.5 text-primary hover:underline"
                >
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{address}</span>
                </a>
              )}
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 text-primary hover:underline">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{phone}</span>
                </a>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span data-testid={`text-time-${id}`}>
                {format(date, showDate ? "EEE dd/MM · HH:mm" : "HH:mm", { locale: ptBR })}
              </span>
            </div>
            
            {repeatDays?.length ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Repeat className="h-3.5 w-3.5" />
                <span>{repeatLabel(repeatDays)}</span>
              </div>
            ) : null}

            {reminderEnabled && reminderDateTime && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {reminderType === "voice" ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                <span data-testid={`text-reminder-${id}`}>
                  {reminderMinutesBefore !== undefined
                    ? reminderLabel(reminderMinutesBefore)
                    : format(reminderDateTime, "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit?.(id)}
                data-testid={`button-edit-${id}`}
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete?.(id)}
                data-testid={`button-delete-${id}`}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
