import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActivityButtonProps {
  icon: LucideIcon;
  title: string;
  category: string;
  onClick?: () => void;
}

const categoryColors: Record<string, string> = {
  saude: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
  trabalho: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  casa: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
  lazer: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
  autocuidado: "bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400",
  fitness: "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
};

export function QuickActivityButton({ icon: Icon, title, category, onClick }: QuickActivityButtonProps) {
  return (
    <Card 
      className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`button-quick-activity-${title.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2.5 rounded-lg shrink-0",
          categoryColors[category.toLowerCase()] || "bg-muted text-foreground"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{title}</h4>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Adicionar</span>
        </Button>
      </div>
    </Card>
  );
}
