-- =============================================================
-- Minha Rotina — etapa 11: compartilhar com outras pessoas
-- Listas (compras e outras), lembretes, agenda e filmes/séries.
-- Quem compartilha escolhe: a área inteira ou um item, e se a outra
-- pessoa só vê ("ler") ou também pode mudar ("editar").
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- (Precisa das etapas 1 a 10 já rodadas.)
-- =============================================================

create table if not exists public.shares (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  owner_name   text,
  member_id    uuid not null references auth.users (id) on delete cascade,
  member_email text not null,
  member_name  text,
  area         text not null check (area in ('listas', 'lembretes', 'agenda', 'filmes')),
  item_key     text,              -- vazio = a área inteira; 'compras' = lista de compras; senão, o id do item
  item_label   text,              -- nome do item, para mostrar na tela
  permission   text not null default 'ler' check (permission in ('ler', 'editar')),
  created_at   timestamptz not null default now()
);
create unique index if not exists shares_unique on public.shares (owner_id, member_id, area, coalesce(item_key, ''));
create index if not exists shares_member on public.shares (member_id);

alter table public.shares enable row level security;
drop policy if exists "Dono gerencia o que compartilhou" on public.shares;
create policy "Dono gerencia o que compartilhou" on public.shares
  for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "Convidada ve e pode sair" on public.shares;
create policy "Convidada ve e pode sair" on public.shares
  for select to authenticated using ((select auth.uid()) = member_id);
drop policy if exists "Convidada pode sair" on public.shares;
create policy "Convidada pode sair" on public.shares
  for delete to authenticated using ((select auth.uid()) = member_id);
grant select, insert, update, delete on public.shares to authenticated;

-- Compartilhar pelo e-mail de quem já tem conta (e-mail confirmado).
create or replace function public.share_with(
  p_email text, p_area text, p_item_key text, p_item_label text, p_permission text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid;
  v_member_name text;
  v_owner_name text;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'nickname', ''), split_part(u.raw_user_meta_data ->> 'name', ' ', 1))
    into v_member, v_member_name
    from auth.users u
   where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null
   limit 1;
  if v_member is null then raise exception 'pessoa_nao_encontrada'; end if;
  if v_member = auth.uid() then raise exception 'mesma_pessoa'; end if;
  select coalesce(nullif(raw_user_meta_data ->> 'nickname', ''), split_part(raw_user_meta_data ->> 'name', ' ', 1))
    into v_owner_name from auth.users where id = auth.uid();

  insert into public.shares (owner_id, owner_name, member_id, member_email, member_name, area, item_key, item_label, permission)
  values (auth.uid(), v_owner_name, v_member, lower(trim(p_email)), v_member_name, p_area, nullif(p_item_key, ''), p_item_label,
          case when p_permission = 'editar' then 'editar' else 'ler' end)
  on conflict (owner_id, member_id, area, coalesce(item_key, ''))
  do update set permission = excluded.permission, item_label = excluded.item_label
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.share_with(text, text, text, text, text) from public, anon;
grant execute on function public.share_with(text, text, text, text, text) to authenticated;

-- A pessoa logada tem acesso a este registro de outra pessoa?
create or replace function public.shared_access(p_owner uuid, p_area text, p_item text, p_edit boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shares s
     where s.owner_id = p_owner
       and s.member_id = auth.uid()
       and s.area = p_area
       and (s.item_key is null or s.item_key = p_item)
       and (not p_edit or s.permission = 'editar')
  );
$$;
revoke all on function public.shared_access(uuid, text, text, boolean) from public, anon;
grant execute on function public.shared_access(uuid, text, text, boolean) to authenticated;

-- ---------- Listas ----------
drop policy if exists "Compartilhado: ver lista" on public.lists;
create policy "Compartilhado: ver lista" on public.lists
  for select to authenticated using (public.shared_access(user_id, 'listas', id::text, false));

drop policy if exists "Compartilhado: ver itens" on public.shopping_items;
create policy "Compartilhado: ver itens" on public.shopping_items
  for select to authenticated using (public.shared_access(user_id, 'listas', coalesce(list_id::text, 'compras'), false));
drop policy if exists "Compartilhado: incluir itens" on public.shopping_items;
create policy "Compartilhado: incluir itens" on public.shopping_items
  for insert to authenticated with check (public.shared_access(user_id, 'listas', coalesce(list_id::text, 'compras'), true));
drop policy if exists "Compartilhado: mudar itens" on public.shopping_items;
create policy "Compartilhado: mudar itens" on public.shopping_items
  for update to authenticated
  using (public.shared_access(user_id, 'listas', coalesce(list_id::text, 'compras'), true))
  with check (public.shared_access(user_id, 'listas', coalesce(list_id::text, 'compras'), true));
drop policy if exists "Compartilhado: apagar itens" on public.shopping_items;
create policy "Compartilhado: apagar itens" on public.shopping_items
  for delete to authenticated using (public.shared_access(user_id, 'listas', coalesce(list_id::text, 'compras'), true));

-- ---------- Lembretes, agenda e filmes ----------
do $$
declare
  t record;
begin
  for t in select * from (values ('reminders', 'lembretes'), ('activities', 'agenda'), ('watchlist', 'filmes')) as v(tbl, area) loop
    execute format('drop policy if exists "Compartilhado: ver" on public.%I', t.tbl);
    execute format('create policy "Compartilhado: ver" on public.%I for select to authenticated using (public.shared_access(user_id, %L, id::text, false))', t.tbl, t.area);
    execute format('drop policy if exists "Compartilhado: incluir" on public.%I', t.tbl);
    execute format('create policy "Compartilhado: incluir" on public.%I for insert to authenticated with check (public.shared_access(user_id, %L, id::text, true))', t.tbl, t.area);
    execute format('drop policy if exists "Compartilhado: mudar" on public.%I', t.tbl);
    execute format('create policy "Compartilhado: mudar" on public.%I for update to authenticated using (public.shared_access(user_id, %L, id::text, true)) with check (public.shared_access(user_id, %L, id::text, true))', t.tbl, t.area, t.area);
    execute format('drop policy if exists "Compartilhado: apagar" on public.%I', t.tbl);
    execute format('create policy "Compartilhado: apagar" on public.%I for delete to authenticated using (public.shared_access(user_id, %L, id::text, true))', t.tbl, t.area);
  end loop;
end $$;
