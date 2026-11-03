import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";
import { ShareDialog, ShareList } from "@/components/ShareDialog";
import { useToast } from "@/hooks/use-toast";
import { refresh, useUserId } from "@/hooks/use-data";
import { deleteShare } from "@/lib/data";
import { shareTargetLabel, useShareAccess } from "@/lib/sharing";

/** Configurações > Compartilhamento: o que eu compartilhei e o que compartilharam comigo. */
export function SharingSettings() {
  const { mine, withMe } = useShareAccess();
  const userId = useUserId();
  const { toast } = useToast();
  const [open, setOpen] = useState(0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Compartilhe listas, lembretes, a agenda ou filmes com quem também usa o app. Você escolhe se a pessoa só vê ou também edita.
        Também dá para compartilhar um item só, pelo ícone de pessoas em cada tela.
      </p>
      <Button variant="outline" className="w-full gap-2" onClick={() => setOpen((k) => k + 1)} data-testid="button-share-new">
        <Plus className="h-4 w-4" /> Compartilhar
      </Button>

      {mine.length > 0 && <ShareList shares={mine} showTarget />}

      {withMe.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold">Compartilhado com você</h3>
          <ul className="divide-y">
            {withMe.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate first-letter:uppercase">{shareTargetLabel(s)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    de {s.ownerName ?? "outra pessoa"} · {s.permission === "editar" ? "pode editar" : "só ver"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                  onClick={() => {
                    if (!window.confirm(`Sair de ${shareTargetLabel(s)} de ${s.ownerName ?? "outra pessoa"}?`)) return;
                    deleteShare(s.id).then(
                      () => refresh(userId, "shares", "sharedLists", "shopping", "reminders", "activities", "watchlist"),
                      (err) => toast({ title: "Não foi possível sair", description: (err as Error).message, variant: "destructive" }),
                    );
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open > 0 && <ShareDialog key={open} open onOpenChange={(o) => !o && setOpen(0)} />}
    </div>
  );
}
