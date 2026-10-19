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
