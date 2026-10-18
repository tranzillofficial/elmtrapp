begin;
create table if not exists private.site_admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table private.site_admins enable row level security;
revoke all on private.site_admins from public,anon,authenticated;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.site_admins where user_id=auth.uid())$$;
revoke all on function private.is_admin() from public,anon;
grant execute on function private.is_admin() to authenticated;
create table if not exists public.site_prices(id boolean primary key default true check(id), setup numeric not null default 2800 check(setup>=0),monthly numeric not null default 250 check(monthly>=0),annual numeric not null default 2000 check(annual>=0),"annualBeforeDiscount" numeric not null default 3000 check("annualBeforeDiscount">=0),"seatMonthly" numeric not null default 50 check("seatMonthly">=0),"seatAnnual" numeric not null default 600 check("seatAnnual">=0));
insert into public.site_prices(id) values(true) on conflict do nothing;
alter table public.site_prices enable row level security;
grant select on public.site_prices to anon,authenticated;
grant update on public.site_prices to authenticated;
drop policy if exists prices_read on public.site_prices;
create policy prices_read on public.site_prices for select to anon,authenticated using(true);
drop policy if exists prices_admin on public.site_prices;
create policy prices_admin on public.site_prices for update to authenticated using(private.is_admin()) with check(private.is_admin());
create table if not exists public.office_licenses(owner_id uuid primary key references auth.users(id) on delete cascade,seat_limit integer not null default 0 check(seat_limit between 0 and 500),expires_at timestamptz, billing text not null default 'monthly' check(billing in ('monthly','annual')),price_per_seat numeric not null default 50 check(price_per_seat>=0));
create table if not exists public.office_members(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,user_id uuid not null unique references auth.users(id) on delete cascade,display_name text not null check(length(btrim(display_name)) between 1 and 100),permissions text[] not null default '{}',active boolean not null default true,check(owner_id<>user_id),check(permissions <@ array['clients','cases','hearings','notes','payments','documents','library','assistant','write']::text[]));
create index if not exists office_members_owner on public.office_members(owner_id);
alter table public.office_licenses enable row level security;
alter table public.office_members enable row level security;
grant select,insert,update,delete on public.office_licenses to authenticated;
grant select,update,delete on public.office_members to authenticated;
create or replace function private.office_access(owner uuid, feature text, writing boolean default false) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid()=owner or exists(select 1 from public.office_members m join public.office_licenses l on l.owner_id=m.owner_id where m.owner_id=owner and m.user_id=auth.uid() and m.active and l.seat_limit>0 and l.expires_at>now() and (select count(*) from public.office_members prior where prior.owner_id=m.owner_id and prior.active and prior.id<=m.id)<=l.seat_limit and feature=any(m.permissions) and (not writing or 'write'=any(m.permissions)))$$;
revoke all on function private.office_access(uuid,text,boolean) from public,anon;
grant execute on function private.office_access(uuid,text,boolean) to authenticated;
drop policy if exists license_read on public.office_licenses;
create policy license_read on public.office_licenses for select to authenticated using(owner_id=auth.uid() or private.is_admin());
drop policy if exists license_admin on public.office_licenses;
create policy license_admin on public.office_licenses for all to authenticated using(private.is_admin()) with check(private.is_admin());
drop policy if exists members_read on public.office_members;
create policy members_read on public.office_members for select to authenticated using(owner_id=auth.uid() or user_id=auth.uid());
drop policy if exists members_delete on public.office_members;
create policy members_delete on public.office_members for delete to authenticated using(owner_id=auth.uid());
-- Membership mutations use a locked RPC: prevents seat races and user/owner reassignment.
revoke update on public.office_members from authenticated;
create or replace function private.manage_member(member_email text, member_name text, features text[], member_active boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); target uuid; lim public.office_licenses; used integer;
begin
 if owner is null or exists(select 1 from public.office_members where user_id=owner) then raise exception 'صاحب المكتب فقط';end if;
 select * into lim from public.office_licenses where owner_id=owner for update;
 if lim.seat_limit is null or lim.expires_at<=now() or lim.expires_at is null then raise exception 'اطلب من الأدمن تفعيل الحسابات الفرعية أولًا';end if;
 select id into target from auth.users where lower(email)=lower(btrim(member_email)) and email_confirmed_at is not null;
 if target is null then raise exception 'يجب أن يسجل المحامي حسابًا ويؤكد بريده أولًا';end if;
 if target=owner then raise exception 'لا يمكن إضافة صاحب المكتب كحساب فرعي';end if;
 if exists(select 1 from public.office_members where user_id=target and owner_id<>owner) or exists(select 1 from public.office_members where owner_id=target) or exists(select 1 from public.clients where owner_id=target) then raise exception 'الحساب مرتبط بمكتب آخر أو يملك بيانات؛ استخدم حسابًا مستقلًا';end if;
 select count(*) into used from public.office_members where owner_id=owner and active and user_id<>target;
 if member_active and used>=lim.seat_limit then raise exception 'تم الوصول إلى عدد الحسابات المفعلة';end if;
 insert into public.office_members(owner_id,user_id,display_name,permissions,active) values(owner,target,member_name,features,member_active) on conflict(user_id) do update set display_name=excluded.display_name,permissions=excluded.permissions,active=excluded.active where public.office_members.owner_id=owner;
 if not found then raise exception 'الحساب مرتبط بمكتب آخر';end if;
end $$;
revoke all on function private.manage_member(text,text,text[],boolean) from public,anon;
grant execute on function private.manage_member(text,text,text[],boolean) to authenticated;
create or replace function private.office_context() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('admin',private.is_admin(),'owner_id',coalesce(m.owner_id,auth.uid()),'member',m.user_id is not null,'permissions',coalesce(to_jsonb(m.permissions),'[]'::jsonb),'active',case when m.user_id is null then true else coalesce(m.active and l.expires_at>now() and l.seat_limit>0,false) end) from (select auth.uid() uid) u left join public.office_members m on m.user_id=u.uid left join public.office_licenses l on l.owner_id=m.owner_id$$;
revoke all on function private.office_context() from public,anon;
grant execute on function private.office_context() to authenticated;
drop policy if exists admin_profiles on public.profiles;
create policy admin_profiles on public.profiles for select to authenticated using(private.is_admin());
do $$ declare t text;begin foreach t in array array['clients','cases','hearings','notes','payments','documents','bookmarks'] loop
 execute format('drop policy if exists owner_access on public.%I',t);
 execute format('drop policy if exists office_read on public.%I',t);
 execute format('drop policy if exists office_write on public.%I',t);
 execute format('create policy office_read on public.%I for select to authenticated using(private.office_access(owner_id,%L))',t,case when t='bookmarks' then 'library' else t end);
 execute format('create policy office_write on public.%I for all to authenticated using(private.office_access(owner_id,%L,true)) with check(private.office_access(owner_id,%L,true))',t,case when t='bookmarks' then 'library' else t end,case when t='bookmarks' then 'library' else t end);
 end loop;end $$;
create or replace function private.keep_office_owner() returns trigger language plpgsql security invoker set search_path='' as $$begin if new.owner_id<>old.owner_id then raise exception 'لا يمكن نقل السجل إلى مكتب آخر';end if;return new;end $$;
revoke all on function private.keep_office_owner() from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['clients','cases','hearings','notes','payments','documents','bookmarks'] loop
 execute format('drop trigger if exists keep_office_owner on public.%I',t);
 execute format('create trigger keep_office_owner before update of owner_id on public.%I for each row execute function private.keep_office_owner()',t);
end loop;end $$;
create or replace function public.manage_member(member_email text,member_name text,features text[],member_active boolean default true) returns void language sql security invoker set search_path='' as $$select private.manage_member(member_email,member_name,features,member_active)$$;
revoke all on function public.manage_member(text,text,text[],boolean) from public,anon;
grant execute on function public.manage_member(text,text,text[],boolean) to authenticated;
create or replace function public.office_context() returns jsonb language sql stable security invoker set search_path='' as $$select private.office_context()$$;
revoke all on function public.office_context() from public,anon;
grant execute on function public.office_context() to authenticated;
-- Trigger calculations see the complete office balance even for restricted staff.
alter function private.guard_payment() security definer;
alter function private.guard_case_fee() security definer;
alter function private.guard_opening_balance() security definer;
drop policy if exists own_entitlement on public.entitlements;
create policy own_entitlement on public.entitlements for select to authenticated using(private.office_access(owner_id,'library') or private.office_access(owner_id,'assistant') or private.is_admin());
grant insert,update on public.entitlements to authenticated;
drop policy if exists admin_entitlement on public.entitlements;
create policy admin_entitlement on public.entitlements for all to authenticated using(private.is_admin()) with check(private.is_admin());
drop policy if exists subscriber_laws on public.laws;
create policy subscriber_laws on public.laws for select to authenticated using(exists(select 1 from public.entitlements e where private.office_access(e.owner_id,'library') and e.plan<>'basic' and e.expires_at>now()));
drop policy if exists subscriber_articles on public.articles;
create policy subscriber_articles on public.articles for select to authenticated using(exists(select 1 from public.entitlements e where private.office_access(e.owner_id,'library') and e.plan<>'basic' and e.expires_at>now()));
alter table public.documents alter column case_id drop not null;
alter table public.documents add column if not exists client_id uuid;
alter table public.documents drop constraint if exists documents_check;
alter table public.documents drop constraint if exists document_target;
alter table public.documents add constraint document_target check((case_id is not null and client_id is null and path like owner_id::text||'/'||case_id::text||'/%') or (case_id is null and client_id is not null and path like owner_id::text||'/clients/'||client_id::text||'/%'));
do $$begin if not exists(select 1 from pg_constraint where conname='documents_client_fk') then alter table public.documents add constraint documents_client_fk foreign key(client_id,owner_id) references public.clients(id,owner_id) on delete restrict;end if;end $$;
create index if not exists documents_client on public.documents(client_id,owner_id);
create or replace function private.document_access(path text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[]:=string_to_array(path,'/'); owner uuid;begin
 owner:=parts[1]::uuid;
 if not private.office_access(owner,'documents',writing) then return false;end if;
 if parts[2]='clients' then return exists(select 1 from public.clients where id::text=parts[3] and owner_id=owner);end if;
 return exists(select 1 from public.cases where id::text=parts[2] and owner_id=owner);
 exception when invalid_text_representation then return false;end $$;
revoke all on function private.document_access(text,boolean) from public,anon;
grant execute on function private.document_access(text,boolean) to authenticated;
drop policy if exists elmtrapp_documents_read on storage.objects;
drop policy if exists elmtrapp_documents_insert on storage.objects;
drop policy if exists elmtrapp_documents_update on storage.objects;
drop policy if exists elmtrapp_documents_delete on storage.objects;
create policy elmtrapp_documents_read on storage.objects for select to authenticated using(bucket_id='case-documents' and private.document_access(name,false));
create policy elmtrapp_documents_insert on storage.objects for insert to authenticated with check(bucket_id='case-documents' and private.document_access(name,true));
create policy elmtrapp_documents_delete on storage.objects for delete to authenticated using(bucket_id='case-documents' and private.document_access(name,true));
create or replace function private.consume_ai_slot() returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); minute_count integer; month_count integer;
begin
 if uid is null then raise exception 'يلزم تسجيل الدخول';end if;
 select coalesce((select owner_id from public.office_members where user_id=uid),uid) into uid;
 if not private.office_access(uid,'assistant') then raise exception 'ليست لديك صلاحية المساعد';end if;
 perform 1 from public.entitlements where owner_id=uid and plan in ('monthly','annual') and expires_at>now() for update;
 if not found then raise exception 'يتطلب اشتراكًا ساريًا';end if;
 select count(*) filter(where requested_at>now()-interval '1 minute'),count(*) into minute_count,month_count from private.ai_requests where owner_id=uid and requested_at>=date_trunc('month',now());
 if minute_count>=10 then raise exception 'طلبات كثيرة. انتظر دقيقة وأعد المحاولة';end if;
 if month_count>=300 then raise exception 'تم بلوغ حد ٣٠٠ طلب لهذا الشهر';end if;
 insert into private.ai_requests(owner_id) values(uid);
end $$;

commit;
-- First admin: after registering and confirming your account, run as project owner:
-- insert into private.site_admins(user_id) select id from auth.users where email='YOUR-ADMIN-EMAIL';
