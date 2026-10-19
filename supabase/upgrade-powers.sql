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
