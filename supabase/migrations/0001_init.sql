-- ============================================================================
--  DomainFolio · 0001 · schema
--  Enums, tables, indexes and derived-column triggers.
--  Business rules enforced here mirror src/lib/domain-rules.ts exactly.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------- enums -------------------------------------

create type domain_status as enum ('active', 'listed', 'sold', 'expired');
create type renewal_decision as enum ('auto_renew', 'renew', 'review', 'dont_renew', 'pending');
create type sale_type as enum ('buy_now', 'make_offer', 'request_price');
create type purchase_currency as enum ('USD', 'EUR');
create type domain_activity_action as enum ('created', 'updated', 'sold', 'renewed', 'archived', 'restored', 'imported');
create type workspace_role as enum ('owner', 'admin', 'member');
create type custom_option_category as enum (
  'registrar', 'listing_platform', 'sale_platform', 'niche', 'acquisition_source', 'tag'
);

-- ------------------------------ profiles -----------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------- workspaces ----------------------------------

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  default_currency purchase_currency not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on workspace_members (user_id);

-- ------------------------------- domains -----------------------------------

create table domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  tld text,
  purchase_date date,
  expiry_date date,
  purchase_price numeric(14, 2),
  purchase_currency purchase_currency not null default 'USD',
  renewal_cost numeric(14, 2),
  registrar text,
  status domain_status not null default 'active',
  renewal_decision renewal_decision not null default 'auto_renew',
  listed_on text[],
  asking_price numeric(14, 2),
  sale_platform text,
  sale_type sale_type,
  sold_date date,
  sale_price numeric(14, 2),
  net_proceeds numeric(14, 2),
  acquisition_source text,
  niche text,
  estimated_value numeric(14, 2),
  tags text[],
  notes text,
  archived_at timestamptz,
  archive_reason text,
  last_renewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A domain is invalid when both dates exist and expiry is not after purchase.
  constraint domains_date_order check (
    purchase_date is null or expiry_date is null or expiry_date > purchase_date
  ),
  constraint domains_positive_amounts check (
    (purchase_price is null or purchase_price >= 0)
    and (renewal_cost is null or renewal_cost >= 0)
    and (asking_price is null or asking_price >= 0)
    and (sale_price is null or sale_price >= 0)
    and (estimated_value is null or estimated_value >= 0)
  ),
  constraint domains_sold_requires_date check (
    status <> 'sold' or sold_date is not null or sale_price is not null
  )
);

create unique index domains_workspace_domain_key on domains (workspace_id, domain);
create index domains_workspace_idx on domains (workspace_id);
create index domains_workspace_active_idx on domains (workspace_id) where archived_at is null;
create index domains_expiry_idx on domains (workspace_id, expiry_date);
create index domains_sold_idx on domains (workspace_id, sold_date) where sold_date is not null;

-- --------------------------- domain activity -------------------------------

create table domain_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  domain_id uuid references domains (id) on delete set null,
  action domain_activity_action not null,
  summary text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index domain_activity_workspace_idx on domain_activity (workspace_id, created_at desc);
create index domain_activity_domain_idx on domain_activity (domain_id, created_at desc);

-- --------------------------- import batches --------------------------------

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  updated_rows integer not null default 0,
  warning_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index import_batches_workspace_idx on import_batches (workspace_id, created_at desc);

-- ----------------------------- saved views ---------------------------------

create table saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  config jsonb not null default '{}'::jsonb,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_views_workspace_idx on saved_views (workspace_id);

-- --------------------------- user settings ---------------------------------

create table user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  language text not null default 'en' check (language in ('en', 'ar')),
  notifications jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- --------------------------- custom options --------------------------------

create table custom_options (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  category custom_option_category not null,
  value text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, category, value)
);

-- ------------------------------- triggers ----------------------------------

-- Normalise the domain and derive the TLD, exactly like normalizeDomain/getTld.
create or replace function public.domains_normalize()
returns trigger
language plpgsql
as $$
begin
  new.domain := regexp_replace(lower(btrim(new.domain)), '\.$', '');
  new.tld := (regexp_match(new.domain, '(\.[a-z0-9-]+)$'))[1];
  new.updated_at := now();
  return new;
end;
$$;

create trigger domains_normalize_trigger
  before insert or update on domains
  for each row execute function public.domains_normalize();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on profiles
  for each row execute function public.touch_updated_at();
create trigger workspaces_touch before update on workspaces
  for each row execute function public.touch_updated_at();
create trigger saved_views_touch before update on saved_views
  for each row execute function public.touch_updated_at();

-- Create a profile (and default settings) whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
