import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareDialog, SharedBadge } from "@/components/ShareDialog";
import { useShareAccess } from "@/lib/sharing";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Clock, Bell, Volume2, MapPin, Phone, Repeat, Users } from "lucide-react";
import { repeatLabel } from "@/lib/recurrence";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatPhone } from "@/lib/utils";
import { CategoryArt } from "@/components/CategoryArt";
import { useChildren } from "@/hooks/use-data";
import { categoryLabel, reminderLabel } from "@/lib/options";

interface ActivityCardProps {
  id: string;
  ownerId?: string;
  title: string;
  description?: string;
  address?: string;
  phone?: string;
  repeatDays?: number[];
  childId?: string;
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
  ownerId,
  title,
  description,
  address,
  phone,
  repeatDays,
  childId,
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
  const { data: children = [] } = useChildren();
  const childName = children.find((c) => c.id === childId)?.name;
  // compartilhado comigo? (repetições usam o id "id@dia")
  const baseId = id.split("@")[0];
  const access = useShareAccess();
  const sharedBy = access.sharedBy(ownerId);
  const editable = access.canEdit(ownerId, "agenda", baseId);
  const [shareOpen, setShareOpen] = useState(0);

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
              <span className="block text-xs font-normal text-muted-foreground">
                {categoryLabel(category)}
                {childName ? ` · ${childName}` : ""}
              </span>
              {sharedBy && <SharedBadge name={sharedBy} readOnly={!editable} className="mt-1" />}
            </h3>
            <Checkbox
              checked={completed}
              onCheckedChange={(checked) => onToggleComplete?.(id, !!checked)}
              disabled={!editable}
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
                  <span>{formatPhone(phone)}</span>
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
              {!sharedBy && (
                <Button variant="ghost" size="icon" onClick={() => setShareOpen((k) => k + 1)} className="h-8 w-8" title="Compartilhar">
                  <Users className="h-4 w-4" />
                  <span className="sr-only">Compartilhar</span>
                </Button>
              )}
              {editable && (
              <>
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
              </>
              )}
            </div>
          </div>
        </div>
      </div>
      {shareOpen > 0 && (
        <ShareDialog
          key={shareOpen}
          open
          onOpenChange={(o) => !o && setShareOpen(0)}
          area="agenda"
          itemKey={baseId}
          itemLabel={title}
        />
      )}
    </Card>
  );
}
