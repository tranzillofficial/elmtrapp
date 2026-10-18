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
