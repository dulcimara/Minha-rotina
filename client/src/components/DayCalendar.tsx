import { Card } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DayCalendarProps {
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
  activityDates?: Date[];
}

export function DayCalendar({ selectedDate, onSelectDate, activityDates = [] }: DayCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);
  
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  const hasActivity = (day: Date) => {
    return activityDates.some(activityDate => isSameDay(activityDate, day));
  };
  
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };
  
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-lg" data-testid="text-current-month">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousMonth}
            data-testid="button-previous-month"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Mês anterior</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            data-testid="button-next-month"
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Próximo mês</span>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          const hasActivityOnDay = hasActivity(day);
          
          return (
            <button
              key={day.toString()}
              onClick={() => onSelectDate?.(day)}
              data-testid={`button-calendar-day-${format(day, "yyyy-MM-dd")}`}
              className={cn(
                "aspect-square rounded-md flex flex-col items-center justify-center text-sm relative hover-elevate transition-all",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                !isSelected && isCurrentDay && "border-2 border-primary",
                !isSameMonth(day, currentMonth) && "text-muted-foreground opacity-50"
              )}
            >
              <span>{format(day, "d")}</span>
              {hasActivityOnDay && !isSelected && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
