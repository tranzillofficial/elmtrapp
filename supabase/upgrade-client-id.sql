begin;
alter table public.clients add column if not exists national_id text not null default '';
do $$begin if not exists(select 1 from pg_constraint where conname='clients_national_id_format' and conrelid='public.clients'::regclass) then
alter table public.clients add constraint clients_national_id_format check(national_id='' or national_id ~ '^[0-9]{14}$');
end if;end $$;
commit;
