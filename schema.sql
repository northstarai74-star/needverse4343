-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.orders (
  order_id            text primary key,                 -- Razorpay order id (order_xxx)
  ref                 text not null unique,             -- customer-facing number (NV-ABC123)
  status              text not null default 'created'
                        check (status in ('created','paid')),
  fulfillment         text not null default 'new'
                        check (fulfillment in ('new','packed','shipped','delivered','cancelled')),
  amount              numeric(12,2) not null check (amount >= 0),
  currency            text not null default 'INR',
  refunded            numeric(12,2) not null default 0,
  payment_id          text unique,                      -- Razorpay payment id (pay_xxx)
  promo               text,
  cart                jsonb not null,                   -- {"productId": qty}
  customer            jsonb not null,                   -- name, email, phone, addr, city, zip
  vehicle             jsonb,
  tracking            jsonb,                            -- carrier, number, url
  refunds             jsonb not null default '[]'::jsonb,
  email_sent          boolean not null default false,
  shipped_email_sent  boolean not null default false,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  version             integer not null default 0        -- used to stop two requests overwriting each other
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx     on public.orders (status, fulfillment);

-- Lock the table down. The server uses the service_role key, which bypasses
-- row level security. With RLS on and no policies, the public "anon" key
-- (which is visible in browsers) can read and write nothing.
alter table public.orders enable row level security;

create table if not exists public.users (
  id                  text primary key,
  email               text not null unique,
  password_hash       text not null,
  name                text,
  phone               text,
  addr                text,
  city                text,
  zip                 text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);
alter table public.users enable row level security;
