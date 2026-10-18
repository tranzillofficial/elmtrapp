import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
let db;
const user1 = "11111111-1111-4111-8111-111111111111",
  user2 = "22222222-2222-4222-8222-222222222222";
const client = "33333333-3333-4333-8333-333333333333",
  caseId = "44444444-4444-4444-8444-444444444444";
const setup = await readFile(
  new URL("../supabase/setup.sql", import.meta.url),
  "utf8",
);
before(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`,
  );
  await db.exec(setup);
  await db.exec(setup); // Entire installation must be safe to re-run.
  await db.exec(`insert into auth.users(id) values('${user1}'),('${user2}');`);
});
after(async () => db?.close());
async function asUser(id, sql) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
test("ownership, finance, subscriptions and private storage are enforced", async () => {
  await asUser(
    user1,
    `insert into public.clients(id,owner_id,name) values('${client}','${user1}','عميل');`,
  );
  await asUser(
    user1,
    `insert into public.cases(id,owner_id,client_id,title,number,fee) values('${caseId}','${user1}','${client}','قضية','1/2026',1000);`,
  );
  await asUser(
    user1,
    `insert into public.payments(owner_id,client_id,amount) values('${user1}','${client}',250);`,
  );
  assert.equal(
    (await asUser(user1, "select balance from public.client_balances")).rows[0]
      .balance,
    "750.00",
  );
  assert.equal(
    (await asUser(user2, "select * from public.cases")).rows.length,
    0,
  );
  assert.equal(
    (await asUser(user2, "select * from public.client_balances")).rows.length,
    0,
  );
  await assert.rejects(
    asUser(
      user2,
      `insert into public.notes(owner_id,case_id,body) values('${user2}','${caseId}','تعدي');`,
    ),
  );
  await assert.rejects(
    asUser(
      user1,
      `insert into public.payments(owner_id,client_id,amount) values('${user1}','${client}',751);`,
    ),
  );
  await assert.rejects(
    asUser(user1, `update public.cases set fee=200 where id='${caseId}';`),
  );
  await asUser(
    user2,
    `update public.cases set title='hacked' where id='${caseId}'`,
  );
  assert.equal(
    (await asUser(user1, "select title from public.cases")).rows[0].title,
    "قضية",
  );
  await assert.rejects(
    asUser(
      user1,
      `insert into public.entitlements values('${user1}','annual',now()+interval '1 year')`,
    ),
  );
  await assert.rejects(asUser(user1, `select public.consume_ai_slot()`));
  await db.exec(
    `insert into public.entitlements values('${user1}','monthly',now()+interval '1 month');insert into public.laws(title,number,year,source_url) values('Test only','0',2026,'https://example.com');`,
  );
  assert.equal(
    (await asUser(user1, "select * from public.laws")).rows.length,
    2,
  );
  assert.equal(
    (await asUser(user2, "select * from public.laws")).rows.length,
    0,
  );
  for (let i = 0; i < 10; i++)
    await asUser(user1, "select public.consume_ai_slot()");
  await assert.rejects(asUser(user1, "select public.consume_ai_slot()"));
  await asUser(
    user1,
    `insert into storage.objects(bucket_id,name) values('case-documents','${user1}/${caseId}/test.pdf');`,
  );
  assert.equal(
    (await asUser(user2, "select * from storage.objects")).rows.length,
    0,
  );
  await assert.rejects(
    asUser(
      user2,
      `insert into storage.objects(bucket_id,name) values('case-documents','${user1}/${caseId}/hack.pdf')`,
    ),
  );
  await assert.rejects(
    asUser(
      user2,
      `insert into storage.objects(bucket_id,name) values('case-documents','${user2}/${caseId}/hack.pdf')`,
    ),
  );
  await assert.rejects(
    asUser(
      user1,
      `insert into public.documents(owner_id,case_id,name,path,mime_type,size) values('${user1}','${caseId}','file','${user2}/${caseId}/file.pdf','application/pdf',100)`,
    ),
  );
  await asUser(user1, `update public.payments set amount=300`);
  assert.equal(
    (await asUser(user1, "select balance from public.client_balances")).rows[0]
      .balance,
    "700.00",
  );
  await db.exec(
    `update public.entitlements set expires_at=now()-interval '1 second'`,
  );
  assert.equal(
    (await asUser(user1, "select * from public.laws")).rows.length,
    0,
  );
  await assert.rejects(asUser(user1, "select public.consume_ai_slot()"));
});
test("office seats, granular RLS, client documents and admin pricing", async () => {
  await db.exec(
    `update auth.users set email='staff@example.com',email_confirmed_at=now() where id='${user2}';insert into public.office_licenses(owner_id,seat_limit,expires_at) values('${user1}',1,now()+interval '1 month');`,
  );
  await assert.rejects(
    asUser(
      user2,
      `insert into public.office_licenses(owner_id,seat_limit,expires_at) values('${user2}',10,now()+interval '1 year')`,
    ),
  );
  await asUser(
    user1,
    `select public.manage_member('staff@example.com','محامي مساعد',array['clients','cases','documents'],true)`,
  );
  assert.equal(
    (await asUser(user2, "select * from public.clients")).rows.length,
    1,
  );
  assert.equal(
    (await asUser(user2, "select * from public.payments")).rows.length,
    0,
  );
  assert.equal(
    (await asUser(user2, "select public.office_context() context")).rows[0]
      .context.owner_id,
    user1,
  );
  await assert.rejects(
    asUser(
      user2,
      `insert into public.notes(owner_id,case_id,body) values('${user1}','${caseId}','غير مسموح')`,
    ),
  );
  await asUser(
    user2,
    `update public.clients set name='غير مسموح' where id='${client}'`,
  );
  assert.equal(
    (await asUser(user1, "select name from public.clients")).rows[0].name,
    "عميل",
  );
  await asUser(
    user1,
    `select public.manage_member('staff@example.com','محامي مساعد',array['clients','cases','documents','write'],true)`,
  );
  await asUser(
    user2,
    `insert into public.documents(owner_id,client_id,name,path,mime_type,size) values('${user1}','${client}','بطاقة','${user1}/clients/${client}/id.pdf','application/pdf',100)`,
  );
  await asUser(
    user2,
    `insert into storage.objects(bucket_id,name) values('case-documents','${user1}/clients/${client}/id.pdf')`,
  );
  await assert.rejects(
    asUser(
      user2,
      `insert into public.documents(owner_id,client_id,case_id,name,path,mime_type,size) values('${user1}','${client}','${caseId}','مخالف','${user1}/clients/${client}/both.pdf','application/pdf',100)`,
    ),
  );
  await asUser(user2, "update public.site_prices set monthly=1");
  assert.equal(
    Number(
      (await db.query("select monthly from public.site_prices")).rows[0]
        .monthly,
    ),
    250,
  );
  await db.exec(`insert into private.site_admins values('${user1}')`);
  await asUser(user1, "update public.site_prices set monthly=260");
  assert.equal(
    Number(
      (await asUser(user2, "select monthly from public.site_prices")).rows[0]
        .monthly,
    ),
    260,
  );
  await db.exec(
    `update public.office_licenses set expires_at=now()-interval '1 second' where owner_id='${user1}'`,
  );
  assert.equal(
    (await asUser(user2, "select * from public.clients")).rows.length,
    0,
  );
  assert.equal(
    (await asUser(user2, "select * from storage.objects")).rows.length,
    0,
  );
  assert.equal(
    (await asUser(user2, "select public.office_context() context")).rows[0]
      .context.active,
    false,
  );
});
