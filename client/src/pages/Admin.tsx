import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, BarChart3, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchAdminStats, fetchAdminUsers, isAdmin, type AdminStats } from "@/lib/admin";
import { analyticsAvailable } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Número em destaque (cartão de indicador). */
function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{fmt(value)}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

/** Barras por dia (30 dias), uma cor só, com o valor ao passar o dedo/mouse. */
function DailyBars({ days, field, label }: { days: AdminStats["days"]; field: "signups" | "active"; label: string }) {
  const W = 340;
  const H = 120;
  const top = 14;
  const bottom = 18;
  const plotH = H - top - bottom;
  const max = Math.max(1, ...days.map((d) => d[field]));
  const slot = W / days.length;
  const barW = Math.max(3, slot - 3);
  const total = days.reduce((s, d) => s + d[field], 0);
  const last = days[days.length - 1];

  return (
    <figure className="space-y-1">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">
          {field === "active" ? `média de ${fmt(Math.round(total / days.length))} por dia` : `${fmt(total)} em 30 dias`}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: ${fmt(total)} nos últimos 30 dias`}>
        <line x1="0" x2={W} y1={top + plotH} y2={top + plotH} className="stroke-border" strokeWidth="1" />
        <text x="0" y={top - 4} className="fill-muted-foreground text-[9px]">
          máx. {fmt(max)}
        </text>
        {days.map((d, i) => {
          const h = (d[field] / max) * plotH;
          const x = i * slot + (slot - barW) / 2;
          const r = Math.min(3, h / 2);
          return (
            <g key={d.day}>
              <title>{`${format(parseISO(d.day), "EEE, d 'de' MMM", { locale: ptBR })}: ${fmt(d[field])}`}</title>
              <rect x={i * slot} y={top} width={slot} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x} ${top + plotH} v${-(h - r)} q0 ${-r} ${r} ${-r} h${barW - 2 * r} q${r} 0 ${r} ${r} v${h - r} z`}
                  className={d === last ? "fill-primary" : "fill-primary/60"}
                />
              )}
              {(i === 0 || i === days.length - 1 || parseISO(d.day).getDate() === 1) && (
                <text x={i === days.length - 1 ? W : i * slot} y={H - 4} textAnchor={i === days.length - 1 ? "end" : "start"} className="fill-muted-foreground text-[9px]">
                  {format(parseISO(d.day), "d/MM")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Quantas pessoas usam cada área (% das cadastradas). */
function AreaBars({ areas, total }: { areas: AdminStats["areas"]; total: number }) {
  const sorted = [...areas].sort((a, b) => b.people - a.people);
  return (
    <ul className="space-y-2.5">
      {sorted.map((a) => {
        const p = pct(a.people, total);
        return (
          <li key={a.area} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-2 text-sm">
            <span className="truncate">{a.area}</span>
            <span className="h-2.5 rounded-full bg-muted" aria-hidden="true">
              <span className="block h-2.5 rounded-full bg-primary" style={{ width: `${Math.max(p, a.people ? 2 : 0)}%` }} />
            </span>
            <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">
              {fmt(a.people)} ({p}%) · {fmt(a.items)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Admin() {
  const admin = useQuery({ queryKey: ["admin", "is"], queryFn: isAdmin });
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: fetchAdminStats, enabled: admin.data === true });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: fetchAdminUsers, enabled: admin.data === true });
  const [, navigate] = useLocation();
  const back = () => navigate("/");

  if (admin.isLoading) return <p className="p-10 text-center text-muted-foreground">Carregando...</p>;

  if (!admin.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-primary" />
        <p className="max-w-xs text-muted-foreground">Esta área é só para a administradora do app.</p>
        <Button variant="outline" onClick={back}>
          Voltar para o app
        </Button>
      </div>
    );
  }

  const s = stats.data;
  const u = s?.users;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="container mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={back} title="Voltar">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Voltar</span>
          </Button>
          <h1 className="font-brand flex-1 text-xl">Gestão do app</h1>
          <Button
            variant="ghost"
            size="icon"
            title="Atualizar"
            onClick={() => {
              void stats.refetch();
              void users.refetch();
            }}
          >
            <RefreshCw className={cn("h-5 w-5", stats.isFetching && "animate-spin")} />
            <span className="sr-only">Atualizar</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl space-y-5 px-4 py-5">
        {stats.error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{(stats.error as Error).message}</p>}
        {!s ? (
          <p className="text-muted-foreground">Carregando números...</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Atualizado em {format(new Date(s.generated_at), "dd/MM/yyyy 'às' HH:mm")}. "Ativas" = pessoas que abriram o app no período.
            </p>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="admin-kpis">
              <Kpi label="Cadastradas" value={u!.total} hint={`${fmt(u!.confirmed)} com e-mail confirmado`} />
              <Kpi label="Novas" value={u!.new_7d} hint={`últimos 7 dias · ${fmt(u!.new_30d)} em 30 dias`} />
              <Kpi label="Ativas hoje" value={u!.active_1d} />
              <Kpi label="Ativas na semana" value={u!.active_7d} hint={`${pct(u!.active_7d, u!.total)}% das cadastradas`} />
              <Kpi label="Ativas no mês" value={u!.active_30d} hint={`${pct(u!.active_30d, u!.total)}% das cadastradas`} />
              <Kpi label="Avisos ligados" value={u!.push} hint="notificações com o app fechado" />
            </section>

            <Card className="space-y-5 p-4">
              <DailyBars days={s.days} field="active" label="Pessoas que abriram o app por dia" />
              <DailyBars days={s.days} field="signups" label="Novos cadastros por dia" />
            </Card>

            <Card className="space-y-3 p-4">
              <div>
                <h2 className="text-sm font-semibold">O que elas usam</h2>
                <p className="text-xs text-muted-foreground">Pessoas com pelo menos um registro na área (% das cadastradas) · total de registros.</p>
              </div>
              <AreaBars areas={s.areas} total={u!.total} />
              <p className="text-xs text-muted-foreground">
                Terminaram o primeiro acesso: {fmt(u!.onboarded)} ({pct(u!.onboarded, u!.total)}%).
              </p>
            </Card>
          </>
        )}

        <Card className="space-y-2 p-4">
          <h2 className="text-sm font-semibold">Cadastradas</h2>
          <p className="text-xs text-muted-foreground">Só para gestão. Não compartilhe estes dados: são pessoais (LGPD).</p>
          {users.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[520px] text-sm" data-testid="admin-users">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Nome</th>
                    <th className="py-2 pr-2 font-medium">E-mail</th>
                    <th className="py-2 pr-2 font-medium">Cadastro</th>
                    <th className="py-2 pr-2 font-medium">Último acesso</th>
                    <th className="py-2 text-right font-medium">Registros</th>
                  </tr>
                </thead>
                <tbody>
                  {(users.data ?? []).map((x) => (
                    <tr key={x.email} className="border-b last:border-0">
                      <td className="py-2 pr-2">{x.name || "—"}</td>
                      <td className="py-2 pr-2">
                        {x.email}
                        {!x.confirmed && <span className="ml-1 text-[10px] text-destructive">não confirmado</span>}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">{format(new Date(x.created_at), "dd/MM/yyyy")}</td>
                      <td className="py-2 pr-2 tabular-nums">{x.last_seen ? format(parseISO(x.last_seen), "dd/MM/yyyy") : "—"}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(Number(x.items))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="space-y-2 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" /> Google Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            {analyticsAvailable()
              ? "Ligado. Mostra telas visitadas, uso da voz e de cada área, aparelhos e cidades — só de quem aceitou as estatísticas de uso. Nada de saúde é enviado."
              : "Ainda não ligado: falta colocar o código de medição (G-...) no Netlify, na variável VITE_GA_ID."}
          </p>
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Abrir o Google Analytics <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Card>
      </main>
    </div>
  );
}
