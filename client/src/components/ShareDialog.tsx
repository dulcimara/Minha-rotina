import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/NativeSelect";
import { Eye, Pencil, Trash2, Users } from "lucide-react";
import { AppIcon, type AppIconName } from "@/components/AppIcons";
import { useToast } from "@/hooks/use-toast";
import { refresh, useUserId } from "@/hooks/use-data";
import { deleteShare, shareWith, updateSharePermission, type ShareArea, type SharePermission } from "@/lib/data";
import { AREA_LABEL, shareTargetLabel, useShareAccess } from "@/lib/sharing";
import { cn } from "@/lib/utils";

const ICON: Record<ShareArea, AppIconName> = { listas: "listas", lembretes: "lembretes", agenda: "agenda", filmes: "filmes" };

export const PERMISSIONS: { value: SharePermission; label: string; hint: string; icon: typeof Eye }[] = [
  { value: "ler", label: "Só ver", hint: "Vê tudo, mas não muda nada", icon: Eye },
  { value: "editar", label: "Ver e editar", hint: "Pode incluir, marcar e alterar", icon: Pencil },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** sem área: a pessoa escolhe o que compartilhar (usado em Configurações) */
  area?: ShareArea;
  /** item específico (lista, lembrete, compromisso, filme) */
  itemKey?: string;
  itemLabel?: string;
}

/** Compartilhar com quem também usa o app: a área inteira ou só um item, para ver ou editar. */
export function ShareDialog({ open, onOpenChange, area: fixedArea, itemKey, itemLabel }: Props) {
  const { toast } = useToast();
  const userId = useUserId();
  const { mine } = useShareAccess();
  const [area, setArea] = useState<ShareArea>(fixedArea ?? "listas");
  const [scope, setScope] = useState<"item" | "tudo">(itemKey ? "item" : "tudo");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<SharePermission>("ler");
  const [busy, setBusy] = useState(false);

  const key = scope === "item" ? itemKey : undefined;
  const target = { area, itemKey: key, itemLabel: scope === "item" ? itemLabel : undefined };
  const current = mine.filter((s) => s.area === area && (s.itemKey ?? "") === (key ?? ""));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await shareWith(email, area, permission, key, target.itemLabel);
      refresh(userId, "shares");
      toast({ title: "Compartilhado!", description: `${email.trim()} já consegue ${permission === "editar" ? "ver e editar" : "ver"} ${shareTargetLabel(target)}.` });
      setEmail("");
    } catch (err) {
      toast({ title: "Não foi possível compartilhar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto" data-testid="dialog-share" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="rounded-2xl bg-hero p-4 flex items-center gap-3">
          <AppIcon name={ICON[area]} className="h-14 w-14" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Compartilhar</p>
            <DialogTitle className="text-lg font-display font-semibold leading-snug first-letter:uppercase">{shareTargetLabel(target)}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Com quem também usa o Minha Rotina.</DialogDescription>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {!fixedArea && (
            <div className="space-y-1.5">
              <Label htmlFor="sh-area">O que compartilhar</Label>
              <NativeSelect id="sh-area" value={area} onChange={(e) => setArea(e.target.value as ShareArea)}>
                {(Object.keys(AREA_LABEL) as ShareArea[]).map((a) => (
                  <option key={a} value={a}>
                    {AREA_LABEL[a]} (tudo)
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          {fixedArea && itemKey && (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="O que compartilhar">
              {(["item", "tudo"] as const).map((sc) => (
                <Button key={sc} type="button" size="sm" role="radio" aria-checked={scope === sc} variant={scope === sc ? "default" : "outline"} onClick={() => setScope(sc)} className="h-auto py-2 whitespace-normal">
                  {sc === "item" ? `Só ${itemLabel ?? "este item"}` : `Tudo de ${AREA_LABEL[fixedArea]}`}
                </Button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="sh-email">E-mail da pessoa</Label>
            <Input
              id="sh-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@email.com"
              data-testid="input-share-email"
            />
            <p className="text-xs text-muted-foreground">Ela precisa ter conta no app. O que você compartilhar aparece para ela na hora.</p>
          </div>

          <div className="grid gap-2" role="radiogroup" aria-label="Permissão">
            {PERMISSIONS.map(({ value, label, hint, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={permission === value}
                onClick={() => setPermission(value)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  permission === value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60",
                )}
              >
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
          </div>

          <Button type="submit" className="w-full gap-2" disabled={!email.trim() || busy} data-testid="button-share-submit">
            <Users className="h-4 w-4" /> Compartilhar
          </Button>
        </form>

        {current.length > 0 && <ShareList shares={current} />}
      </DialogContent>
    </Dialog>
  );
}

/** Pessoas com acesso: muda a permissão ou tira o acesso. */
export function ShareList({ shares, showTarget }: { shares: ReturnType<typeof useShareAccess>["mine"]; showTarget?: boolean }) {
  const userId = useUserId();
  const { toast } = useToast();
  const fail = (err: unknown) => toast({ title: "Não foi possível alterar", description: (err as Error).message, variant: "destructive" });
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold">Quem tem acesso</h3>
      <ul className="divide-y">
        {shares.map((s) => (
          <li key={s.id} className="flex items-center gap-2 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.memberName || s.memberEmail}</p>
              <p className="text-xs text-muted-foreground truncate">
                {showTarget ? `${shareTargetLabel(s)} · ` : ""}
                {s.memberName ? s.memberEmail : ""}
              </p>
            </div>
            <NativeSelect
              aria-label={`Permissão de ${s.memberEmail}`}
              value={s.permission}
              onChange={(e) => updateSharePermission(s.id, e.target.value as SharePermission).then(() => refresh(userId, "shares"), fail)}
              className="h-8 w-auto text-xs"
            >
              <option value="ler">Só ver</option>
              <option value="editar">Ver e editar</option>
            </NativeSelect>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              title="Tirar acesso"
              onClick={() => {
                if (!window.confirm(`Parar de compartilhar ${shareTargetLabel(s)} com ${s.memberEmail}?`)) return;
                deleteShare(s.id).then(() => refresh(userId, "shares"), fail);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Tirar acesso</span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Selo "de Ana · só ver" nos itens compartilhados comigo. */
export function SharedBadge({ name, readOnly, className }: { name: string; readOnly?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground", className)}>
      <Users className="h-3 w-3" /> de {name}
      {readOnly && " · só ver"}
    </span>
  );
}
