create unique index if not exists cases_client_owner_key on public.cases(id,client_id,owner_id);
-- Client ledger: positive payments may leave a credit balance before fees exist.
create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 client_id uuid not null, case_id uuid,
 amount numeric(12,2) not null check(amount>0 and amount<=999999999),
 category text not null default 'other' check(category in('court','advertising','transport','other')),
 billing text not null check(billing in('client','office')),
 description text not null check(length(trim(description)) between 1 and 1000),
 spent_on date not null, created_at timestamptz not null default now(),
 foreign key(client_id,owner_id) references public.clients(id,owner_id) on delete restrict,
 foreign key(case_id,client_id,owner_id) references public.cases(id,client_id,owner_id) on delete restrict
);
create index if not exists expenses_owner_client on public.expenses(owner_id,client_id);
create index if not exists expenses_case on public.expenses(case_id,client_id,owner_id);
alter table public.expenses enable row level security;
grant select,insert,update,delete on public.expenses to authenticated;
revoke all on public.expenses from anon;
drop policy if exists office_read on public.expenses;
drop policy if exists office_write on public.expenses;
create policy office_read on public.expenses for select to authenticated using(private.office_access(owner_id,'payments'));
create policy office_write on public.expenses for all to authenticated using(private.office_access(owner_id,'payments',true)) with check(private.office_access(owner_id,'payments',true));
create or replace function private.guard_payment() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; owner uuid;begin
 if TG_OP='UPDATE' and (new.client_id<>old.client_id or new.owner_id<>old.owner_id) then raise exception 'لا يمكن نقل الدفعة إلى عميل آخر';end if;
 if TG_OP='DELETE' then target:=old.client_id;owner:=old.owner_id;else target:=new.client_id;owner:=new.owner_id;end if;
 if not private.office_access(owner,'payments',true) then raise exception 'ليست لديك صلاحية تعديل الحسابات';end if;
 perform 1 from public.clients where id=target and owner_id=owner for update;
 if not found then raise exception 'العميل غير موجود';end if;
 if TG_OP='DELETE' then return old;end if;
 if new.amount<=0 or new.amount>999999999 then raise exception 'أدخل مبلغًا صحيحًا أكبر من صفر';end if;
 return new;end $$;
create or replace function private.guard_case_fee() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; owner uuid;begin
 if TG_OP='UPDATE' and (new.client_id<>old.client_id or new.owner_id<>old.owner_id) then raise exception 'لا يمكن نقل القضية إلى حساب آخر';end if;
 if TG_OP='DELETE' then target:=old.client_id;owner:=old.owner_id;else target:=new.client_id;owner:=new.owner_id;end if;
 if not private.office_access(owner,'cases',true) then raise exception 'ليست لديك صلاحية تعديل القضايا';end if;
 perform 1 from public.clients where id=target and owner_id=owner for update;
 if not found and TG_OP<>'DELETE' then raise exception 'العميل غير موجود';end if;
 if TG_OP='DELETE' then return old;end if;return new;end $$;
create or replace function private.guard_opening_balance() returns trigger language plpgsql security definer set search_path='' as $$
begin if not private.office_access(new.owner_id,'clients',true) then raise exception 'ليست لديك صلاحية تعديل العميل';end if;return new;end $$;
create or replace function private.guard_expense() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; owner uuid;begin
 if TG_OP='UPDATE' and (new.client_id<>old.client_id or new.owner_id<>old.owner_id) then raise exception 'لا يمكن نقل المصروف إلى عميل آخر';end if;
 if TG_OP='DELETE' then target:=old.client_id;owner:=old.owner_id;else target:=new.client_id;owner:=new.owner_id;end if;
 if not private.office_access(owner,'payments',true) then raise exception 'ليست لديك صلاحية تعديل المصروفات';end if;
 perform 1 from public.clients where id=target and owner_id=owner for update;
 if not found then raise exception 'العميل غير موجود';end if;
 if TG_OP='DELETE' then return old;end if;return new;end $$;
revoke all on function private.guard_payment(),private.guard_case_fee(),private.guard_opening_balance(),private.guard_expense() from public,anon,authenticated;
drop trigger if exists expense_guard on public.expenses;
create trigger expense_guard before insert or update or delete on public.expenses for each row execute function private.guard_expense();
create or replace view public.client_balances with(security_invoker=true) as
select c.id,c.owner_id,c.name,c.opening_balance+coalesce(f.total,0)+coalesce(x.total,0) as total_fees,coalesce(p.total,0) as total_paid,c.opening_balance+coalesce(f.total,0)+coalesce(x.total,0)-coalesce(p.total,0) as balance
from public.clients c left join(select client_id,sum(fee) total from public.cases group by client_id) f on f.client_id=c.id
left join(select client_id,sum(amount) total from public.payments group by client_id) p on p.client_id=c.id
left join(select client_id,sum(amount) total from public.expenses where billing='client' group by client_id) x on x.client_id=c.id;
alter table public.powers add column if not exists reminder_days integer not null default 30 check(reminder_days between 1 and 365);
alter table public.powers add column if not exists reviewed_for_expiry date;
create or replace function private.reset_power_review() returns trigger language plpgsql security invoker set search_path='' as $$begin if new.expires_on is distinct from old.expires_on or new.reminder_days is distinct from old.reminder_days then new.reviewed_for_expiry:=null;end if;return new;end $$;
revoke all on function private.reset_power_review() from public,anon,authenticated;
drop trigger if exists reset_power_review on public.powers;
create trigger reset_power_review before update on public.powers for each row execute function private.reset_power_review();
