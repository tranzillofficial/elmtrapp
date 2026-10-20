-- Public operational status only; private office data is not exposed here.
create table if not exists public.site_runtime (
 id boolean primary key default true check(id),
 maintenance_enabled boolean not null default false,
 maintenance_until timestamptz,
 maintenance_message text not null default 'بنحدّث Elmtr App علشان نقدم لك تجربة أفضل. هنرجع قريبًا.' check(length(trim(maintenance_message)) between 1 and 1000),
 check(not maintenance_enabled or maintenance_until is not null)
);
insert into public.site_runtime(id) values(true) on conflict do nothing;
alter table public.site_runtime enable row level security;
revoke all on public.site_runtime from anon,authenticated;
grant select on public.site_runtime to anon,authenticated;
grant update(maintenance_enabled,maintenance_until,maintenance_message) on public.site_runtime to authenticated;
drop policy if exists runtime_read on public.site_runtime;
drop policy if exists runtime_admin on public.site_runtime;
create policy runtime_read on public.site_runtime for select to anon,authenticated using(true);
create policy runtime_admin on public.site_runtime for update to authenticated using(private.is_admin()) with check(private.is_admin());
