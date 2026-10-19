-- elmtrapp: run this whole file in the Supabase SQL Editor (as project owner).
-- No demo clients, invented statutes, credentials or active subscriptions are inserted.
-- Re-runnable on this application's schema. Never run against unrelated tables with the same names.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default 'المحامي' check (char_length(full_name) between 1 and 100),
 office_name text not null default 'مكتب المحاماة', phone text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.entitlements (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 plan text not null default 'basic' check (plan in ('basic','monthly','annual')),
 expires_at timestamptz,
 check (plan='basic' or expires_at is not null)
);
create table if not exists public.clients (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 150), phone text not null default '',email text not null default '',address text not null default '',
 opening_balance numeric(12,2) not null default 0 check (opening_balance>=0),notes text not null default '',created_at timestamptz not null default now(),unique(id,owner_id)
);
create table if not exists public.cases (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 client_id uuid not null,title text not null check (char_length(btrim(title)) between 1 and 200),number text not null check (char_length(btrim(number))>0),
 court text not null default '',opponent text not null default '',status text not null default 'active' check (status in ('active','postponed','closed')),
 summary text not null default '' check (char_length(summary)<=20000),fee numeric(12,2) not null default 0 check(fee>=0),created_at timestamptz not null default now(),
 unique(id,owner_id),unique(owner_id,number),foreign key(client_id,owner_id) references public.clients(id,owner_id) on delete restrict
);
create table if not exists public.hearings (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,case_id uuid not null,
 starts_at timestamptz not null,court text not null default '',purpose text not null default '',notes text not null default '',
 reminder_minutes integer not null default 60 check(reminder_minutes between 0 and 10080),created_at timestamptz not null default now(),
 foreign key(case_id,owner_id) references public.cases(id,owner_id) on delete cascade
);
create table if not exists public.notes (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,case_id uuid not null,
 body text not null check(char_length(btrim(body)) between 1 and 10000),created_at timestamptz not null default now(),
 foreign key(case_id,owner_id) references public.cases(id,owner_id) on delete cascade
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,client_id uuid not null,
 amount numeric(12,2) not null check(amount>0),paid_at timestamptz not null default now(),method text not null default 'نقدي',notes text not null default '',created_at timestamptz not null default now(),
 foreign key(client_id,owner_id) references public.clients(id,owner_id) on delete restrict
);
create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,case_id uuid not null,
 name text not null check(char_length(btrim(name)) between 1 and 255),path text not null unique,
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
 size bigint not null check(size between 1 and 20971520),extracted_text text not null default '' check(char_length(extracted_text)<=30000),created_at timestamptz not null default now(),
 foreign key(case_id,owner_id) references public.cases(id,owner_id) on delete restrict,
 check(path like owner_id::text || '/' || case_id::text || '/%')
);
create table if not exists public.laws (
 id uuid primary key default gen_random_uuid(),title text not null,number text not null default '',year integer not null,
 source_url text not null check(source_url ~ '^https?://'),verified_at timestamptz,unique(title,number,year)
);
create table if not exists public.articles (
 id uuid primary key default gen_random_uuid(),law_id uuid not null references public.laws(id) on delete cascade,
 article_number text not null,chapter text not null default '',body text not null,source_url text not null check(source_url ~ '^https?://'),verified_at timestamptz,
 unique(law_id,article_number)
);
create table if not exists public.bookmarks (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 article_id uuid not null references public.articles(id) on delete cascade,created_at timestamptz not null default now(),unique(owner_id,article_id)
);
create table if not exists private.ai_requests (
 owner_id uuid not null references auth.users(id) on delete cascade,requested_at timestamptz not null default now()
);
create index if not exists ai_requests_owner_time on private.ai_requests(owner_id,requested_at);
create index if not exists clients_owner on public.clients(owner_id);
create index if not exists cases_owner_client on public.cases(owner_id,client_id);
create index if not exists hearings_owner_date on public.hearings(owner_id,starts_at);
create index if not exists hearings_case on public.hearings(case_id);
create index if not exists notes_owner_case on public.notes(owner_id,case_id);
create index if not exists payments_owner_client on public.payments(owner_id,client_id);
create index if not exists documents_owner_case on public.documents(owner_id,case_id);
create index if not exists articles_law on public.articles(law_id);
create index if not exists articles_search on public.articles using gin(to_tsvector('simple',body));
create index if not exists bookmarks_article on public.bookmarks(article_id);

-- Each account is an independent office. Parent + owner foreign keys prevent cross-office links.
do $$ declare t text; begin
 foreach t in array array['clients','cases','hearings','notes','payments','documents','bookmarks'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('drop policy if exists owner_access on public.%I',t);
  execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id)',t);
 end loop;
end $$;
alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.laws enable row level security;
alter table public.articles enable row level security;
alter table private.ai_requests enable row level security;
revoke all on public.profiles,public.entitlements,public.laws,public.articles from anon, authenticated;
revoke all on private.ai_requests from public,anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select on public.entitlements,public.laws,public.articles to authenticated;
drop policy if exists own_profile on public.profiles;
create policy own_profile on public.profiles for all to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
drop policy if exists own_entitlement on public.entitlements;
create policy own_entitlement on public.entitlements for select to authenticated using ((select auth.uid())=owner_id);
drop policy if exists subscriber_laws on public.laws;
create policy subscriber_laws on public.laws for select to authenticated using (exists(select 1 from public.entitlements e where e.owner_id=(select auth.uid()) and e.plan in ('monthly','annual') and e.expires_at>now()));
drop policy if exists subscriber_articles on public.articles;
create policy subscriber_articles on public.articles for select to authenticated using (exists(select 1 from public.entitlements e where e.owner_id=(select auth.uid()) and e.plan in ('monthly','annual') and e.expires_at>now()));

-- Serialise financial changes per client: checks are enforced even for direct API writes.
create or replace function private.guard_payment() returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.clients; fees numeric; received numeric; excluded uuid;
begin
 if TG_OP='UPDATE' and (new.client_id<>old.client_id or new.owner_id<>old.owner_id) then raise exception 'لا يمكن نقل الدفعة إلى عميل آخر'; end if;
 if TG_OP='DELETE' then perform 1 from public.clients where id=old.client_id and owner_id=old.owner_id for update; return old; end if;
 select * into c from public.clients where id=new.client_id and owner_id=new.owner_id for update;
 if not found then raise exception 'العميل غير موجود أو لا تملك صلاحية الوصول'; end if;
 excluded:=case when TG_OP='UPDATE' then old.id else null end;
 select c.opening_balance+coalesce(sum(fee),0) into fees from public.cases where client_id=c.id and owner_id=c.owner_id;
 select coalesce(sum(amount),0) into received from public.payments where client_id=c.id and owner_id=c.owner_id and (excluded is null or id<>excluded);
 if new.amount<=0 or new.amount>fees-received then raise exception 'الدفعة يجب أن تكون أكبر من صفر ولا تتجاوز المتبقي'; end if;
 return new;
end $$;
drop trigger if exists financial_guard on public.payments;
create trigger financial_guard before insert or update or delete on public.payments for each row execute function private.guard_payment();
create or replace function private.guard_case_fee() returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.clients; target uuid; owner uuid; fees numeric; received numeric; excluded uuid; addition numeric;
begin
 if TG_OP='UPDATE' and (new.client_id<>old.client_id or new.owner_id<>old.owner_id) then raise exception 'لا يمكن نقل القضية إلى حساب آخر'; end if;
 if TG_OP='DELETE' then target:=old.client_id;owner:=old.owner_id;excluded:=old.id;addition:=0;
 elsif TG_OP='UPDATE' then target:=new.client_id;owner:=new.owner_id;excluded:=old.id;addition:=new.fee;
 else target:=new.client_id;owner:=new.owner_id;excluded:=null;addition:=new.fee;end if;
 select * into c from public.clients where id=target and owner_id=owner for update;
 if not found then if TG_OP='DELETE' then return old;end if;raise exception 'العميل غير موجود';end if;
 select c.opening_balance+addition+coalesce(sum(fee),0) into fees from public.cases where client_id=target and owner_id=owner and (excluded is null or id<>excluded);
 select coalesce(sum(amount),0) into received from public.payments where client_id=target and owner_id=owner;
 if fees<received then raise exception 'لا يمكن خفض الأتعاب عن إجمالي الدفعات المسجلة';end if;
 if TG_OP='DELETE' then return old;end if;return new;
end $$;
drop trigger if exists case_fee_guard on public.cases;
create trigger case_fee_guard before insert or update or delete on public.cases for each row execute function private.guard_case_fee();
create or replace function private.guard_opening_balance() returns trigger language plpgsql security invoker set search_path='' as $$
declare fees numeric;received numeric;
begin
 select new.opening_balance+coalesce(sum(fee),0) into fees from public.cases where client_id=new.id and owner_id=new.owner_id;
 select coalesce(sum(amount),0) into received from public.payments where client_id=new.id and owner_id=new.owner_id;
 if fees<received then raise exception 'لا يمكن خفض الرصيد عن إجمالي الدفعات المسجلة';end if;return new;
end $$;
drop trigger if exists opening_balance_guard on public.clients;
create trigger opening_balance_guard before update of opening_balance on public.clients for each row execute function private.guard_opening_balance();
create or replace view public.client_balances with (security_invoker=true) as
select c.id,c.owner_id,c.name,c.opening_balance+coalesce(f.total,0) as total_fees,coalesce(p.total,0) as total_paid,c.opening_balance+coalesce(f.total,0)-coalesce(p.total,0) as balance
from public.clients c left join (select client_id,sum(fee) total from public.cases group by client_id) f on f.client_id=c.id left join (select client_id,sum(amount) total from public.payments group by client_id) p on p.client_id=c.id;
revoke all on public.client_balances from anon,authenticated;
grant select on public.client_balances to authenticated;

-- Only the server consumes the result; users cannot grant themselves a subscription.
-- The private definer is necessary to write the unexposed rate ledger. It always checks auth.uid().
create or replace function private.consume_ai_slot() returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); minute_count integer; month_count integer;
begin
 if uid is null then raise exception 'يلزم تسجيل الدخول';end if;
 perform 1 from public.entitlements where owner_id=uid and plan in ('monthly','annual') and expires_at>now() for update;
 if not found then raise exception 'يتطلب اشتراكًا ساريًا';end if;
 select count(*) filter(where requested_at>now()-interval '1 minute'),count(*) into minute_count,month_count from private.ai_requests where owner_id=uid and requested_at>=date_trunc('month',now());
 if minute_count>=10 then raise exception 'طلبات كثيرة. انتظر دقيقة وأعد المحاولة';end if;
 if month_count>=300 then raise exception 'تم بلوغ حد ٣٠٠ طلب لهذا الشهر';end if;
 insert into private.ai_requests(owner_id) values(uid);
end $$;
revoke all on function private.consume_ai_slot() from public,anon,authenticated;
grant execute on function private.consume_ai_slot() to authenticated;
create or replace function public.consume_ai_slot() returns void language sql security invoker set search_path='' as $$select private.consume_ai_slot()$$;
revoke all on function public.consume_ai_slot() from public,anon;
grant execute on function public.consume_ai_slot() to authenticated;
-- Trigger-only functions are not exposed as RPCs.
revoke all on function private.guard_payment(),private.guard_case_fee(),private.guard_opening_balance() from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('case-documents','case-documents',false,20971520,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists elmtrapp_documents_read on storage.objects;
drop policy if exists elmtrapp_documents_insert on storage.objects;
drop policy if exists elmtrapp_documents_update on storage.objects;
drop policy if exists elmtrapp_documents_delete on storage.objects;
create policy elmtrapp_documents_read on storage.objects for select to authenticated using(bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy elmtrapp_documents_insert on storage.objects for insert to authenticated with check(bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.cases c where c.id::text=(storage.foldername(name))[2] and c.owner_id=(select auth.uid())));
create policy elmtrapp_documents_update on storage.objects for update to authenticated using(bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.cases c where c.id::text=(storage.foldername(name))[2] and c.owner_id=(select auth.uid())));
create policy elmtrapp_documents_delete on storage.objects for delete to authenticated using(bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Supabase may install this event-trigger helper automatically. It is not an RPC.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
 end if;
end $$;
commit;

-- OWNER-ONLY examples: replace the UUID; do not expose a service-role key in the app.
-- insert into public.entitlements(owner_id,plan,expires_at)
-- values ('AUTH-USER-UUID','monthly',now()+interval '1 month')
-- on conflict(owner_id) do update set plan=excluded.plan,expires_at=excluded.expires_at;
-- Add only legally sourced, reviewed laws/articles, including source_url and verified_at.
-- Search accepts Arabic substrings in the UI; the simple FTS index is ready for larger server searches.




-- Elmtr App office upgrade
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

begin;
insert into public.laws(id,title,number,year,source_url,verified_at) values('a1311948-0000-4000-8000-000000000001','القانون المدني — مقتطف','131','1948','https://manshurat.org/sites/default/files/law-131-1948.pdf','2026-10-18T00:00:00Z') on conflict(id) do nothing;
insert into public.articles(id,law_id,article_number,chapter,body,source_url,verified_at) values('a1311948-0000-4000-8000-000000000002','a1311948-0000-4000-8000-000000000001','2','الباب التمهيدي — أحكام عامة','لا يجوز إلغاء نص تشريعي إلا بتشريع لاحق ينص صراحة على هذا الإلغاء، أو يشتمل على نص يتعارض مع نص التشريع القديم، أو ينظم من جديد الموضوع الذي سبق أن قرر قواعده ذلك التشريع.','https://manshurat.org/sites/default/files/law-131-1948.pdf#page=1','2026-10-18T00:00:00Z') on conflict(id) do nothing;
insert into public.articles(id,law_id,article_number,chapter,body,source_url,verified_at) values('a1311948-0000-4000-8000-000000000003','a1311948-0000-4000-8000-000000000001','3','الباب التمهيدي — أحكام عامة','تحسب المواعيد بالتقويم الميلادي، ما لم ينص القانون على غير ذلك.','https://manshurat.org/sites/default/files/law-131-1948.pdf#page=1','2026-10-18T00:00:00Z') on conflict(id) do nothing;
insert into public.articles(id,law_id,article_number,chapter,body,source_url,verified_at) values('a1311948-0000-4000-8000-000000000004','a1311948-0000-4000-8000-000000000001','4','الباب التمهيدي — أحكام عامة','من استعمل حقه استعمالاً مشروعاً لا يكون مسئولاً عما ينشأ عن ذلك من ضرر.','https://manshurat.org/sites/default/files/law-131-1948.pdf#page=1','2026-10-18T00:00:00Z') on conflict(id) do nothing;
commit;

-- Platform activation workflow
begin;
create table if not exists public.account_access(owner_id uuid primary key references auth.users(id) on delete cascade,status text not null default 'pending' check(status in ('pending','active','rejected','suspended')),reviewed_at timestamptz,reviewed_by uuid references auth.users(id));
create table if not exists public.activation_requests(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in ('system','pro')),period text check(period in ('monthly','annual')),status text not null default 'pending' check(status in ('pending','approved','rejected')),created_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid references auth.users(id),check((kind='system' and period is null) or (kind='pro' and period is not null)));
create unique index if not exists one_pending_activation on public.activation_requests(owner_id,kind) where status='pending';
create index if not exists activation_status_date on public.activation_requests(status,created_at desc);
alter table public.account_access enable row level security;
alter table public.activation_requests enable row level security;
revoke all on public.account_access,public.activation_requests from public,anon,authenticated;
grant select on public.account_access,public.activation_requests to authenticated;
drop policy if exists account_read on public.account_access;
create policy account_read on public.account_access for select to authenticated using(owner_id=auth.uid() or private.is_admin());
drop policy if exists activation_read on public.activation_requests;
create policy activation_read on public.activation_requests for select to authenticated using(owner_id=auth.uid() or private.is_admin());
-- Preserve established offices; new registrations always require approval.
insert into public.account_access(owner_id,status) select u.id,case when exists(select 1 from private.site_admins a where a.user_id=u.id) or exists(select 1 from public.clients c where c.owner_id=u.id) then 'active' else 'pending' end from auth.users u on conflict do nothing;
insert into public.profiles(id,full_name) select id,'المحامي' from auth.users on conflict do nothing;
insert into public.activation_requests(owner_id,kind) select a.owner_id,'system' from public.account_access a where a.status='pending' and not exists(select 1 from public.office_members m where m.user_id=a.owner_id) on conflict do nothing;
create or replace function private.register_account() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.profiles(id,full_name) values(new.id,coalesce(nullif(left(new.raw_user_meta_data->>'full_name',100),''),'المحامي')) on conflict do nothing;
 insert into public.account_access(owner_id) values(new.id) on conflict do nothing;
 insert into public.activation_requests(owner_id,kind) values(new.id,'system') on conflict do nothing;
 return new;end $$;
revoke all on function private.register_account() from public,anon,authenticated;
drop trigger if exists elmtr_register_account on auth.users;
create trigger elmtr_register_account after insert on auth.users for each row execute function private.register_account();
create or replace function private.account_enabled(owner uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.site_admins where user_id=owner) or exists(select 1 from public.account_access where owner_id=owner and status='active')$$;
revoke all on function private.account_enabled(uuid) from public,anon;
grant execute on function private.account_enabled(uuid) to authenticated;
create or replace function private.office_access(owner uuid,feature text,writing boolean default false) returns boolean language sql stable security definer set search_path='' as $$select private.account_enabled(owner) and (auth.uid()=owner or exists(select 1 from public.office_members m join public.office_licenses l on l.owner_id=m.owner_id where m.owner_id=owner and m.user_id=auth.uid() and m.active and l.seat_limit>0 and l.expires_at>now() and (select count(*) from public.office_members prior where prior.owner_id=m.owner_id and prior.active and prior.id<=m.id)<=l.seat_limit and feature=any(m.permissions) and (not writing or 'write'=any(m.permissions))))$$;
create or replace function public.office_context() returns jsonb language sql stable security invoker set search_path='' as $$select private.office_context()||jsonb_build_object('activated',private.account_enabled((private.office_context()->>'owner_id')::uuid))$$;
create or replace function private.request_activation(request_kind text,request_period text default null) returns void language plpgsql security definer set search_path='' as $$declare uid uuid:=auth.uid();begin
 if uid is null or exists(select 1 from public.office_members where user_id=uid) then raise exception 'صاحب الحساب فقط';end if;
 perform 1 from public.account_access where owner_id=uid for update;
 if request_kind='system' and private.account_enabled(uid) then raise exception 'الحساب مفعل بالفعل';end if;
 if request_kind='pro' and not private.account_enabled(uid) then raise exception 'فعّل النظام أولًا';end if;
 insert into public.activation_requests(owner_id,kind,period) values(uid,request_kind,request_period) on conflict do nothing;
end $$;
create or replace function public.request_activation(request_kind text,request_period text default null) returns void language sql security invoker set search_path='' as $$select private.request_activation(request_kind,request_period)$$;
create or replace function private.admin_accounts() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.is_admin() then raise exception 'الأدمن فقط';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'confirmed',u.email_confirmed_at is not null,'created_at',u.created_at,'full_name',p.full_name,'office_name',p.office_name,'phone',p.phone,'status',coalesce(a.status,'pending'),'plan',coalesce(e.plan,'basic'),'expires_at',e.expires_at,'is_admin',exists(select 1 from private.site_admins s where s.user_id=u.id),'member',exists(select 1 from public.office_members m where m.user_id=u.id)) order by u.created_at desc) from auth.users u left join public.profiles p on p.id=u.id left join public.account_access a on a.owner_id=u.id left join public.entitlements e on e.owner_id=u.id),'[]'::jsonb);
end $$;
create or replace function public.admin_accounts() returns jsonb language sql stable security invoker set search_path='' as $$select private.admin_accounts()$$;
create or replace function private.admin_activation(target uuid,action text,pro_period text default null,request_id uuid default null) returns void language plpgsql security definer set search_path='' as $$declare r public.activation_requests;begin
 if not private.is_admin() then raise exception 'الأدمن فقط';end if;
 perform 1 from public.account_access where owner_id=target for update;
 if not found then raise exception 'الحساب غير موجود';end if;
 if request_id is not null then select * into r from public.activation_requests where id=request_id and owner_id=target for update;
 if not found or r.status<>'pending' then raise exception 'تمت مراجعة الطلب بالفعل';end if;
 if action='activate' and r.kind<>'system' or action='pro' and r.kind<>'pro' then raise exception 'نوع الطلب غير مطابق';end if;end if;
 if action in ('activate','pro') and not exists(select 1 from auth.users where id=target and email_confirmed_at is not null) then raise exception 'يجب تأكيد البريد الإلكتروني أولًا';end if;
 if action='activate' then
 update public.account_access set status='active',reviewed_at=now(),reviewed_by=auth.uid() where owner_id=target;
 update public.activation_requests set status='approved',reviewed_at=now(),reviewed_by=auth.uid() where owner_id=target and kind='system' and status='pending';
 elsif action='pro' then
 if pro_period not in ('monthly','annual') or pro_period is null then raise exception 'اختر شهرًا أو سنة';end if;
 if not private.account_enabled(target) then raise exception 'فعّل النظام أولًا';end if;
 if exists(select 1 from public.office_members where user_id=target) then raise exception 'اشتراك البرو يخص المكتب الرئيسي';end if;
 insert into public.entitlements(owner_id,plan,expires_at) values(target,pro_period,now()+case when pro_period='annual' then interval '1 year' else interval '1 month' end) on conflict(owner_id) do update set plan=excluded.plan,expires_at=excluded.expires_at;
 update public.activation_requests set status='approved',reviewed_at=now(),reviewed_by=auth.uid() where owner_id=target and kind='pro' and status='pending';
 elsif action='basic' then update public.entitlements set plan='basic',expires_at=null where owner_id=target;
 elsif action='reject' then
 if request_id is null then raise exception 'اختر الطلب';end if;
 update public.activation_requests set status='rejected',reviewed_at=now(),reviewed_by=auth.uid() where id=request_id;
 if r.kind='system' then update public.account_access set status='rejected',reviewed_at=now(),reviewed_by=auth.uid() where owner_id=target;end if;
 elsif action='suspend' then
 if exists(select 1 from private.site_admins where user_id=target) then raise exception 'لا يمكن إيقاف حساب الأدمن';end if;
 update public.account_access set status='suspended',reviewed_at=now(),reviewed_by=auth.uid() where owner_id=target;
 else raise exception 'إجراء غير صحيح';end if;
end $$;
create or replace function public.admin_activation(target uuid,action text,pro_period text default null,request_id uuid default null) returns void language sql security invoker set search_path='' as $$select private.admin_activation(target,action,pro_period,request_id)$$;
revoke all on function private.request_activation(text,text),public.request_activation(text,text),private.admin_accounts(),public.admin_accounts(),private.admin_activation(uuid,text,text,uuid),public.admin_activation(uuid,text,text,uuid) from public,anon;
grant execute on function private.request_activation(text,text),public.request_activation(text,text),private.admin_accounts(),public.admin_accounts(),private.admin_activation(uuid,text,text,uuid),public.admin_activation(uuid,text,text,uuid) to authenticated;
commit;
begin;
alter table public.clients add column if not exists national_id text not null default '';
do $$begin if not exists(select 1 from pg_constraint where conname='clients_national_id_format' and conrelid='public.clients'::regclass) then
alter table public.clients add constraint clients_national_id_format check(national_id='' or national_id ~ '^[0-9]{14}$');
end if;end $$;
commit;
-- Powers of attorney use the office's documents permission and private bucket.
create table if not exists public.powers (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 principal_name text not null check(length(trim(principal_name)) between 1 and 160),
 phone text not null check(length(trim(phone)) between 1 and 30),
 expires_on date not null,
 poa_path text not null,
 front_path text not null,
 back_path text not null,
 created_at timestamptz not null default now(),
 constraint power_paths check (
 poa_path like owner_id::text||'/powers/'||id::text||'/0.%' and
 front_path like owner_id::text||'/powers/'||id::text||'/1.%' and
 back_path like owner_id::text||'/powers/'||id::text||'/2.%')
);
create index if not exists powers_owner_expiry on public.powers(owner_id,expires_on);
alter table public.powers enable row level security;
grant select,insert,update,delete on public.powers to authenticated;
revoke all on public.powers from anon;
drop policy if exists office_read on public.powers;
drop policy if exists office_write on public.powers;
create policy office_read on public.powers for select to authenticated using(private.office_access(owner_id,'documents'));
create policy office_write on public.powers for all to authenticated using(private.office_access(owner_id,'documents',true)) with check(private.office_access(owner_id,'documents',true));
drop trigger if exists keep_office_owner on public.powers;
create trigger keep_office_owner before update of owner_id on public.powers for each row execute function private.keep_office_owner();
create or replace function private.document_access(path text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[]:=string_to_array(path,'/'); owner uuid; record_id uuid;begin
 owner:=parts[1]::uuid;
 if not private.office_access(owner,'documents',writing) then return false;end if;
 if parts[2]='powers' then
   record_id:=parts[3]::uuid;
   if array_length(parts,1)<>4 or parts[4] !~ '^[012]\.(jpeg|png|webp)$' then return false;end if;
   -- Upload before row insertion; rollback deletion uses the same write permission.
   if writing then return true;end if;
   return exists(select 1 from public.powers p where p.id=record_id and p.owner_id=owner and path in(p.poa_path,p.front_path,p.back_path));
 end if;
 if parts[2]='clients' then return exists(select 1 from public.clients where id::text=parts[3] and owner_id=owner);end if;
 return exists(select 1 from public.cases where id::text=parts[2] and owner_id=owner);
 exception when invalid_text_representation then return false;end $$;
revoke all on function private.document_access(text,boolean) from public,anon;
grant execute on function private.document_access(text,boolean) to authenticated;
