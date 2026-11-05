// =============================================================
// Minha Rotina — função "enviar-avisos" (Supabase Edge Function)
//
// Roda a cada minuto (agendada pelo SQL da etapa 7) e envia notificações
// para o celular, mesmo com o app fechado:
//   - compromissos (inclusive os que se repetem), na antecedência escolhida
//   - aniversários (no dia, às 9h)
//   - remédios (em cada horário)
//   - resumo da manhã (no horário que a pessoa escolheu)
//   - aviso do ciclo 2 dias antes (só para quem ligou essa opção)
//
// Também responde GET ?acao=chave com a chave pública das notificações
// (criada sozinha na primeira vez).
//
// Como publicar: Supabase > Edge Functions > Deploy a new function >
// Via Editor > nome "enviar-avisos" > cole este arquivo > Deploy.
// Depois, em Settings da função, DESLIGUE "Verify JWT" (quem protege
// é o segredo do agendamento).
// =============================================================

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_MS = 10 * 60_000; // envia avisos com até 10 min de atraso (se o servidor demorou)

// ---------------------------------------------------------------
// Configuração (chaves e segredo) guardada na tabela app_config
// ---------------------------------------------------------------

async function getConfig(key: string): Promise<string | undefined> {
  const { data } = await supabase.from("app_config").select("value").eq("key", key).maybeSingle();
  return data?.value;
}

async function vapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  let publicKey = await getConfig("vapid_public");
  let privateKey = await getConfig("vapid_private");
  if (!publicKey || !privateKey) {
    const k = webpush.generateVAPIDKeys();
    // insert ignora se outra execução criou ao mesmo tempo; relê em seguida
    await supabase.from("app_config").upsert(
      [
        { key: "vapid_public", value: k.publicKey },
        { key: "vapid_private", value: k.privateKey },
      ],
      { onConflict: "key", ignoreDuplicates: true },
    );
    publicKey = await getConfig("vapid_public");
    privateKey = await getConfig("vapid_private");
  }
  return { publicKey: publicKey!, privateKey: privateKey! };
}

// ---------------------------------------------------------------
// Datas no fuso de cada pessoa (o servidor roda em UTC)
// ---------------------------------------------------------------

interface LocalParts {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
  wd: number; // 0 = domingo
}

export function localParts(date: Date, tz: string): LocalParts {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, wd };
}

/** Horário local (dia + hora no fuso) -> instante real. */
export function zoned(y: number, m: number, d: number, h: number, min: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const p = localParts(new Date(guess), tz);
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - guess;
  return new Date(guess - offset);
}

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (p: { y: number; m: number; d: number }) => `${p.y}-${pad(p.m)}-${pad(p.d)}`;
const addDaysLocal = (p: LocalParts, n: number, tz: string) => localParts(zoned(p.y, p.m, p.d + n, 12, 0, tz), tz);

// ---------------------------------------------------------------
// Frases (iguais às do app)
// ---------------------------------------------------------------

function whenToSpeak(date: Date, now: Date, tz: string): string {
  const minutesLeft = Math.round((date.getTime() - now.getTime()) / 60_000);
  if (minutesLeft <= 0) return "agora";
  if (minutesLeft < 60) return `dentro de ${minutesLeft} ${minutesLeft === 1 ? "minuto" : "minutos"}`;
  if (minutesLeft < 120) {
    const rest = minutesLeft - 60;
    return rest === 0 ? "dentro de 1 hora" : `dentro de 1 hora e ${rest} ${rest === 1 ? "minuto" : "minutos"}`;
  }
  const t = localParts(date, tz);
  const n = localParts(now, tz);
  const hour = `${pad(t.h)}:${pad(t.min)}`;
  if (dayKey(t) === dayKey(n)) return `hoje às ${hour}`;
  if (dayKey(t) === dayKey(addDaysLocal(n, 1, tz))) return `amanhã às ${hour}`;
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  return `${names[t.wd]} às ${hour}`;
}

export function alertSentence(a: { title: string; date: Date; address?: string | null }, now: Date, tz: string, name?: string) {
  const when = whenToSpeak(a.date, now, tz);
  const what = a.title.charAt(0).toLowerCase() + a.title.slice(1);
  const firstWord = what.split(/\s+/)[0] ?? "";
  const verb = /^[a-zçãéíóú]{3,}(ar|er|ir)$/.test(firstWord) ? "precisa" : "tem";
  const core = when === "agora" ? `está na hora: ${what}` : `${when} você ${verb} ${what}`;
  const where = a.address ? `, no endereço ${a.address}` : "";
  const sentence = `${core}${where}.`;
  return name ? `${name}, ${sentence}` : sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// ---------------------------------------------------------------
// O que vence agora
// ---------------------------------------------------------------

interface Due {
  key: string;
  at: Date;
  title: string;
  body: string;
}

/** Calendário Nacional de Vacinação 2026 (mesma lista de client/src/lib/vacinas.ts). */
const VACCINES: { months: number; label: string; vaccines: string[] }[] = [
  { months: 2, label: "2 meses", vaccines: ["Pentavalente (1ª dose)", "Poliomielite VIP (1ª dose)", "Rotavírus (1ª dose)", "Pneumocócica (1ª dose)"] },
  { months: 3, label: "3 meses", vaccines: ["Meningocócica C (1ª dose)"] },
  { months: 4, label: "4 meses", vaccines: ["Pentavalente (2ª dose)", "Poliomielite VIP (2ª dose)", "Rotavírus (2ª dose)", "Pneumocócica (2ª dose)"] },
  { months: 5, label: "5 meses", vaccines: ["Meningocócica C (2ª dose)"] },
  { months: 6, label: "6 meses", vaccines: ["Pentavalente (3ª dose)", "Poliomielite VIP (3ª dose)", "Gripe (1ª dose, a 2ª 30 dias depois)", "COVID-19 (1ª dose)"] },
  { months: 7, label: "7 meses", vaccines: ["COVID-19 (2ª dose)"] },
  { months: 9, label: "9 meses", vaccines: ["Febre amarela (1ª dose)", "COVID-19 (3ª dose)"] },
  { months: 12, label: "1 ano", vaccines: ["Tríplice viral (1ª dose)", "Pneumocócica (reforço)", "Meningocócica ACWY (reforço)"] },
  { months: 15, label: "1 ano e 3 meses", vaccines: ["DTP (1º reforço)", "Poliomielite VIP (reforço)", "Hepatite A", "Tetra viral (sarampo, caxumba, rubéola e catapora)"] },
  { months: 48, label: "4 anos", vaccines: ["DTP (2º reforço)", "Varicela (2ª dose)", "Febre amarela (reforço)"] },
  { months: 108, label: "9 anos", vaccines: ["HPV (dose única, até 14 anos)"] },
  { months: 132, label: "11 anos", vaccines: ["Meningocócica ACWY (dose única, até 14 anos)"] },
];

interface UserData {
  tz: string;
  name?: string;
  meta: Record<string, unknown>;
  activities: any[];
  birthdays: any[];
  medications: any[];
  doses: any[];
  cycles: any[];
  children: any[];
  reminders: any[];
}

const inWindow = (at: Date, now: Date) => at.getTime() <= now.getTime() && now.getTime() - at.getTime() < WINDOW_MS;

/** Compromissos do dia (inclui repetições) entre ontem e amanhã, no fuso da pessoa. */
export function activityOccurrences(activities: any[], now: Date, tz: string) {
  const today = localParts(now, tz);
  const days = [-1, 0, 1].map((n) => addDaysLocal(today, n, tz));
  const out: { a: any; id: string; date: Date; reminderAt: Date | null; completed: boolean }[] = [];
  for (const a of activities) {
    const start = new Date(a.date);
    if (!a.repeat_days?.length) {
      out.push({
        a,
        id: a.id,
        date: start,
        reminderAt: a.reminder_date_time ? new Date(a.reminder_date_time) : null,
        completed: a.completed,
      });
      continue;
    }
    const s = localParts(start, tz);
    for (const day of days) {
      if (!a.repeat_days.includes(day.wd)) continue;
      if (dayKey(day) < dayKey(s)) continue;
      const date = zoned(day.y, day.m, day.d, s.h, s.min, tz);
      const minutes = a.reminder_minutes_before ?? 0;
      const key = dayKey(day);
      out.push({
        a,
        id: `${a.id}@${key}`,
        date,
        reminderAt: new Date(date.getTime() - minutes * 60_000),
        completed: (a.completed_dates ?? []).includes(key),
      });
    }
  }
  return out;
}

export function dueFor(u: UserData, now: Date): Due[] {
  const tz = u.tz;
  const today = localParts(now, tz);
  const todayKey = dayKey(today);
  const name = u.name;
  const childName = (id?: string | null) => u.children.find((c) => c.id === id)?.name as string | undefined;
  const due: Due[] = [];

  // Compromissos
  for (const o of activityOccurrences(u.activities, now, tz)) {
    if (!o.a.reminder_enabled || o.completed || !o.reminderAt || !inWindow(o.reminderAt, now)) continue;
    const forWho = childName(o.a.child_id);
    const body =
      o.a.reminder_type === "voice" && o.a.reminder_voice_text
        ? o.a.reminder_voice_text
        : alertSentence({ title: o.a.title + (forWho ? ` (${forWho})` : ""), date: o.date, address: o.a.address }, now, tz, name);
    const t = localParts(o.date, tz);
    due.push({ key: `act:${o.id}:${o.reminderAt.getTime()}`, at: o.reminderAt, title: `${o.a.title} · ${pad(t.h)}:${pad(t.min)}`, body });
  }

  // Aniversários, às 9h
  const nineAm = zoned(today.y, today.m, today.d, 9, 0, tz);
  if (inWindow(nineAm, now)) {
    for (const b of u.birthdays) {
      if (b.day !== today.d || b.month !== today.m) continue;
      const age = b.birth_year ? today.y - b.birth_year : undefined;
      due.push({
        key: `bday:${b.id}:${todayKey}`,
        at: nineAm,
        title: `Aniversário de ${b.name} 🎂`,
        body: `${name ? `${name}, hoje` : "Hoje"} é aniversário de ${b.name}${age ? ` (${age} anos)` : ""}. ${
          b.gift_ideas ? `Ideia de presente: ${b.gift_ideas}.` : "Não esqueça de dar os parabéns!"
        }`,
      });
    }
  }

  // Vacinas dos filhos menores de 18: uma semana antes de atingir cada idade do calendário, às 9h
  if (inWindow(nineAm, now)) {
    for (const c of u.children) {
      if (!c.birth_date) continue;
      const [by, bm, bd] = String(c.birth_date).split("-").map(Number);
      if (Date.UTC(by + 18, bm - 1, bd) <= Date.UTC(today.y, today.m - 1, today.d)) continue;
      for (const v of VACCINES) {
        // data em que completa a idade (meses somados à data de nascimento) menos 7 dias
        const total = bm - 1 + v.months;
        const due = new Date(Date.UTC(by + Math.floor(total / 12), total % 12, bd));
        if (due.getUTCDate() !== bd) due.setUTCDate(0); // ex.: 31 -> último dia do mês
        const alert = new Date(due.getTime() - 7 * 86_400_000);
        if (alert.toISOString().slice(0, 10) !== todayKey) continue;
        const dd = `${pad(due.getUTCDate())}/${pad(due.getUTCMonth() + 1)}`;
        due_push(due, v, c, dd);
      }
    }
  }
  function due_push(_d: Date, v: { months: number; label: string; vaccines: string[] }, c: any, dd: string) {
    due.push({
      key: `vac:${c.id}:${v.months}`,
      at: nineAm,
      title: `💉 Vacinas de ${c.name}`,
      body: `Em ${dd} ${c.name} completa ${v.label} e pode tomar: ${v.vaccines.join(", ")}. Leve a caderneta ao posto.`,
    });
  }

  // Remédios, em cada horário
  for (const med of u.medications) {
    if (!med.reminder || med.start_date > todayKey || (med.end_date && med.end_date < todayKey)) continue;
    for (const time of med.times ?? []) {
      const [h, mi] = String(time).split(":").map(Number);
      const at = zoned(today.y, today.m, today.d, h, mi, tz);
      if (!inWindow(at, now)) continue;
      const taken = u.doses.some((d) => d.medication_id === med.id && d.day === todayKey && d.time === time);
      if (taken) continue;
      const forWho = childName(med.child_id);
      due.push({
        key: `med:${med.id}:${todayKey}:${time}`,
        at,
        title: `💊 ${med.name}${med.dose ? ` · ${med.dose}` : ""}`,
        body: `${name ? `${name}, h` : "H"}ora do remédio${forWho ? ` do(a) ${forWho}` : ""}: ${med.name}${med.dose ? `, ${med.dose}` : ""}.`,
      });
    }
  }

  // Lembretes, na data e hora escolhidas
  for (const r of u.reminders ?? []) {
    if (r.done_at || r.alert === false || r.due_date !== todayKey) continue;
    const [h, mi] = String(r.due_time ?? "09:00").split(":").map(Number);
    const at = zoned(today.y, today.m, today.d, h, mi, tz);
    if (!inWindow(at, now)) continue;
    due.push({
      key: `rem:${r.id}:${r.due_date}:${r.due_time ?? "09:00"}`,
      at,
      title: `${r.emoji ?? "🔔"} ${r.text}`,
      body: `${name ? `${name}, você` : "Você"} tem um lembrete: ${r.text}.${r.notes ? ` ${r.notes}` : ""}`,
    });
  }

  // Resumo da manhã, no horário escolhido
  const meta = u.meta as { morning_summary?: boolean; morning_time?: string; cycle_alert?: boolean };
  if (meta.morning_summary) {
    const [h, mi] = (meta.morning_time ?? "07:00").split(":").map(Number);
    const at = zoned(today.y, today.m, today.d, h, mi, tz);
    if (inWindow(at, now)) {
      const todays = activityOccurrences(u.activities, now, tz)
        .filter((o) => dayKey(localParts(o.date, tz)) === todayKey && !o.completed)
        .sort((x, y) => x.date.getTime() - y.date.getTime());
      const meds = u.medications.filter((m) => m.start_date <= todayKey && (!m.end_date || m.end_date >= todayKey));
      const doses = meds.reduce((n, m) => n + (m.times?.length ?? 0), 0);
      const bdays = u.birthdays.filter((b) => b.day === today.d && b.month === today.m);
      const parts: string[] = [];
      if (todays.length) {
        const first = todays[0];
        const t = localParts(first.date, tz);
        parts.push(
          `${todays.length} ${todays.length === 1 ? "compromisso" : "compromissos"}, o primeiro às ${pad(t.h)}:${pad(t.min)}: ${first.a.title}`,
        );
      } else parts.push("nenhum compromisso marcado");
      if (doses) parts.push(`${doses} ${doses === 1 ? "dose de remédio" : "doses de remédio"}`);
      if (bdays.length) parts.push(`aniversário de ${bdays.map((b) => b.name).join(" e ")}`);
      due.push({
        key: `morning:${todayKey}`,
        at,
        title: `${today.h < 12 ? "Bom dia" : "Olá"}${name ? `, ${name}` : ""}! ☀️`,
        body: `Hoje: ${parts.join("; ")}. Toque para ouvir o resumo.`,
      });
    }
  }

  // Ciclo: 2 dias antes da data prevista (só se a pessoa ligou), às 9h, texto discreto
  if (meta.cycle_alert && u.cycles.length && inWindow(nineAm, now)) {
    const starts = u.cycles.map((c) => c.start_date as string).sort().reverse();
    const toDate = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    const gaps: number[] = [];
    for (let i = 0; i < Math.min(starts.length - 1, 6); i++) {
      const g = Math.round((toDate(starts[i]) - toDate(starts[i + 1])) / 86_400_000);
      if (g >= 15 && g <= 60) gaps.push(g);
    }
    const avg = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;
    const next = new Date(toDate(starts[0]) + avg * 86_400_000);
    const twoBefore = new Date(next.getTime() - 2 * 86_400_000);
    const twoBeforeKey = twoBefore.toISOString().slice(0, 10);
    if (twoBeforeKey === todayKey) {
      due.push({
        key: `cycle:${next.toISOString().slice(0, 10)}`,
        at: nineAm,
        title: "Lembrete do ciclo",
        body: "Faltam 2 dias para a data prevista. Toque para ver no app.",
      });
    }
  }

  return due;
}

// ---------------------------------------------------------------
// Envio
// ---------------------------------------------------------------

async function run(now = new Date()) {
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
  if (error) throw error;
  if (!subs?.length) return { users: 0, sent: 0 };

  const keys = await vapidKeys();
  webpush.setVapidDetails("mailto:avisos@minha-rotina.app", keys.publicKey, keys.privateKey);

  const byUser = new Map<string, any[]>();
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  const ids = [...byUser.keys()];

  const load = async (table: string, extra?: (q: any) => any) => {
    let q = supabase.from(table).select("*").in("user_id", ids);
    if (extra) q = extra(q);
    const { data, error } = await q;
    if (error) {
      console.warn(`tabela ${table}:`, error.message); // etapa ainda não rodada: segue sem ela
      return [];
    }
    return data ?? [];
  };
  const [activities, birthdays, medications, cycles, children, reminders] = await Promise.all([
    load("activities", (q) => q.eq("reminder_enabled", true)),
    load("birthdays"),
    load("medications"),
    load("menstrual_cycles", (q) => q.order("start_date", { ascending: false })),
    load("children"),
    load("reminders", (q) => q.is("done_at", null)),
  ]);
  const since = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
  const doses = await load("medication_doses", (q) => q.gte("day", since));

  let sent = 0;
  for (const userId of ids) {
    const userSubs = byUser.get(userId)!;
    const { data: userRes } = await supabase.auth.admin.getUserById(userId);
    const meta = (userRes?.user?.user_metadata ?? {}) as Record<string, any>;
    const name = (meta.nickname as string)?.trim() || (meta.name as string)?.trim().split(/\s+/)[0] || undefined;
    const mine = <T extends { user_id: string }>(rows: T[]) => rows.filter((r) => r.user_id === userId);

    const due = dueFor(
      {
        tz: userSubs[0].timezone || "America/Sao_Paulo",
        name,
        meta,
        activities: mine(activities),
        birthdays: mine(birthdays),
        medications: mine(medications),
        doses: mine(doses),
        cycles: mine(cycles),
        children: mine(children),
        reminders: mine(reminders),
      },
      now,
    );

    for (const item of due) {
      // Marca como enviado antes de enviar: se já existia, outra execução já mandou.
      const { error: logError } = await supabase.from("push_log").insert({ user_id: userId, key: item.key });
      if (logError) continue;

      const payload = JSON.stringify({
        title: item.title,
        body: item.body,
        tag: item.key,
        silent: meta.alert_mode === "silent",
        url: item.key.startsWith("morning:") ? "/?resumo=1" : "/",
        // ícone na cor que a pessoa escolheu
        icon: `/icons/${["rosa", "lavanda", "pessego", "menta", "ceu", "girassol"].includes(meta.palette) ? meta.palette : "rosa"}/icon-192.png`,
      });
      for (const s of userSubs) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            TTL: 900,
            urgency: "high",
          });
          sent++;
        } catch (err: any) {
          // Aparelho saiu (app desinstalado, permissão retirada): remove.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          } else console.warn("falha ao enviar:", err?.statusCode, err?.body);
        }
      }
    }
  }

  // Faxina do registro de envios (guarda 3 dias)
  if (now.getUTCMinutes() === 0) {
    await supabase.from("push_log").delete().lt("sent_at", new Date(now.getTime() - 3 * 86_400_000).toISOString());
  }
  return { users: ids.length, sent };
}

// ---------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);

  try {
    // O app pede a chave pública para se inscrever nas notificações.
    if (req.method === "GET" && url.searchParams.get("acao") === "chave") {
      const { publicKey } = await vapidKeys();
      return Response.json({ publicKey }, { headers: CORS });
    }

    // Agendamento (a cada minuto): precisa do segredo guardado no banco.
    const secret = await getConfig("cron_secret");
    if (!secret || req.headers.get("x-cron-secret") !== secret) {
      return new Response("não autorizado", { status: 401, headers: CORS });
    }
    const result = await run();
    return Response.json(result, { headers: CORS });
  } catch (err) {
    console.error(err);
    return new Response(String((err as Error)?.message ?? err), { status: 500, headers: CORS });
  }
});
