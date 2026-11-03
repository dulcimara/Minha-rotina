import { useMemo } from "react";
import { useShares, useUserId } from "@/hooks/use-data";
import type { Share, ShareArea } from "@/lib/data";

export const AREA_LABEL: Record<ShareArea, string> = {
  listas: "Listas",
  lembretes: "Lembretes",
  agenda: "Agenda",
  filmes: "Filmes e séries",
};

/** "a lista de compras", "todos os lembretes", "o lembrete Pagar conta"... */
export function shareTargetLabel(s: Pick<Share, "area" | "itemKey" | "itemLabel">): string {
  if (!s.itemKey) {
    return { listas: "todas as listas", lembretes: "todos os lembretes", agenda: "a agenda inteira", filmes: "toda a lista de filmes e séries" }[s.area];
  }
  if (s.area === "listas") return s.itemKey === "compras" ? "a lista de compras" : `a lista ${s.itemLabel ?? ""}`.trim();
  const what = { lembretes: "o lembrete", agenda: "o compromisso", filmes: "" }[s.area];
  return `${what} ${s.itemLabel ?? ""}`.trim();
}

/**
 * Acesso aos itens de outras pessoas: quem compartilhou e se posso editar.
 * Itens sem dona ou meus são sempre editáveis.
 */
export function useShareAccess() {
  const me = useUserId();
  const { data: shares = [] } = useShares();
  return useMemo(() => {
    const withMe = shares.filter((s) => s.memberId === me);
    const find = (ownerId: string | undefined, area: ShareArea, itemKey: string) =>
      withMe.filter((s) => s.ownerId === ownerId && s.area === area && (!s.itemKey || s.itemKey === itemKey));
    return {
      me,
      /** é de outra pessoa? devolve o nome de quem compartilhou */
      sharedBy(ownerId?: string): string | undefined {
        if (!ownerId || !me || ownerId === me) return undefined;
        return withMe.find((s) => s.ownerId === ownerId)?.ownerName ?? "outra pessoa";
      },
      canEdit(ownerId: string | undefined, area: ShareArea, itemKey: string): boolean {
        if (!ownerId || !me || ownerId === me) return true;
        return find(ownerId, area, itemKey).some((s) => s.permission === "editar");
      },
      mine: shares.filter((s) => s.ownerId === me),
      withMe,
    };
  }, [shares, me]);
}
