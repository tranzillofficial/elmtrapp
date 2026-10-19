-- Additive upgrade; legacy rows keep an unspecified POA type.
alter table public.powers add column if not exists official_number text not null default '' check(length(official_number)<=100);
alter table public.powers add column if not exists official_type text not null default '' check(official_type in ('','general','litigation'));
alter table public.cases add column if not exists district_court text not null default '' check(length(district_court)<=200);
alter table public.documents add column if not exists category text not null default 'other' check(category in ('other','contract','memorandum','claim'));
alter table public.payments add column if not exists kind text not null default 'payment' check(kind in ('payment','advance'));
