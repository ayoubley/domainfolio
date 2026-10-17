-- ============================================================================
--  DomainFolio · 0003 · extended domain fields & folders
--  Adds the registry/detail fields the Domains table shows, plus a folders
--  table used to organise the portfolio and drive the row action submenu.
--  Run AFTER 0001 and 0002.
-- ============================================================================

-- ------------------------------- folders -----------------------------------

create table folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  color text not null default 'slate',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index folders_workspace_idx on folders (workspace_id, sort_order);

create trigger folders_touch before update on folders
  for each row execute function public.touch_updated_at();

alter table folders enable row level security;

create policy folders_select_member on folders
  for select using (public.is_workspace_member(workspace_id));
create policy folders_insert_member on folders
  for insert with check (public.is_workspace_member(workspace_id));
create policy folders_update_member on folders
  for update using (public.is_workspace_member(workspace_id));
create policy folders_delete_member on folders
  for delete using (public.can_manage_workspace(workspace_id));

-- --------------------------- extra domain columns --------------------------
-- These are registrar/detail fields. This app has no registrar integration, so
-- they are stored values the user can edit (and the demo seeder fills in).

alter table domains
  add column folder_id uuid references folders (id) on delete set null,
  add column registered_date date,
  add column min_offer numeric(14, 2),
  add column auto_renew boolean not null default false,
  add column privacy boolean not null default false,
  add column locked boolean not null default false,
  add column nameservers text[] not null default '{}',
  add column url_forwarding text,
  add column source text not null default 'manual',
  add column registry_status text;

alter table domains
  add constraint domains_source_valid check (source in ('manual', 'imported')),
  add constraint domains_registry_status_valid check (
    registry_status is null
    or registry_status in ('active', 'grace', 'redemption', 'hold', 'expired')
  ),
  add constraint domains_min_offer_positive check (min_offer is null or min_offer >= 0);

create index domains_folder_idx on domains (folder_id);
create index domains_source_idx on domains (workspace_id, source);

-- ---------------------- demo seed (now fills new fields) -------------------

create or replace function public.load_demo_data(p_workspace_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
  v_folder_premium uuid;
  v_folder_watchlist uuid;
  v_folder_expiring uuid;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Not a member of this workspace';
  end if;

  if exists (select 1 from domains where workspace_id = p_workspace_id) then
    return 0;
  end if;

  insert into folders (workspace_id, name, color, sort_order)
  values
    (p_workspace_id, 'Premium', 'violet', 0),
    (p_workspace_id, 'Watchlist', 'amber', 1),
    (p_workspace_id, 'Expiring soon', 'red', 2),
    (p_workspace_id, 'Brandable', 'blue', 3)
  on conflict (workspace_id, name) do nothing;

  select id into v_folder_premium from folders where workspace_id = p_workspace_id and name = 'Premium';
  select id into v_folder_watchlist from folders where workspace_id = p_workspace_id and name = 'Watchlist';
  select id into v_folder_expiring from folders where workspace_id = p_workspace_id and name = 'Expiring soon';

  insert into domains (
    workspace_id, user_id, domain, purchase_date, expiry_date,
    purchase_price, purchase_currency, renewal_cost, registrar,
    status, renewal_decision, listed_on, asking_price, sale_platform, sale_type,
    sold_date, sale_price, net_proceeds, acquisition_source, niche, estimated_value, tags, notes,
    folder_id, registered_date, min_offer, auto_renew, privacy, locked, nameservers,
    source, registry_status
  )
  select
    p_workspace_id,
    v_uid,
    d.domain,
    current_date - d.age_days,
    (current_date - d.age_days + interval '1 year')::date,
    d.price,
    'USD',
    d.renewal,
    d.registrar,
    d.status::domain_status,
    d.decision::renewal_decision,
    case when d.listed then array[coalesce(d.platform, 'Dan.com')] else null end,
    d.asking,
    d.platform,
    case when d.sold_ago is null then null else 'buy_now'::sale_type end,
    case when d.sold_ago is null then null else current_date - d.sold_ago end,
    d.sale_price,
    d.net_proceeds,
    d.source,
    d.niche,
    d.estimated_value,
    case when d.tags is null then null else string_to_array(d.tags, '|') end,
    d.notes,
    case
      when (365 - d.age_days) between 0 and 60 then v_folder_expiring
      when d.asking is not null then v_folder_premium
      when d.registrar = 'GoDaddy' then v_folder_watchlist
      else null
    end,
    current_date - d.age_days,
    case when d.asking is null then null else round(d.asking * 0.7) end,
    (d.decision = 'auto_renew'),
    (d.age_days % 4) <> 0,
    d.status <> 'expired',
    case d.registrar
      when 'Cloudflare' then array['ns1.cloudflare.com', 'ns2.cloudflare.com']
      when 'GoDaddy' then array['ns1.godaddy.com', 'ns2.godaddy.com']
      else array['dns1.registrar-servers.com', 'dns2.registrar-servers.com']
    end,
    case when (d.age_days % 3) = 0 then 'imported' else 'manual' end,
    case
      when d.status = 'expired' then 'redemption'
      when d.status = 'active' and d.age_days >= 365 then 'grace'
      else null
    end
  from (values
    ('novacrest.com',               60,  1200,  12, 'Namecheap',  'active', 'auto_renew', false, null,  null, null,  null, null, 'Brandable', 'Hand registration', 2600,  'premium|short', null),
    ('luminouslabs.ai',             45,  2400,  25, 'Namecheap',  'active', 'renew',      true,  12000, null, null,  null, null, 'Brandable', 'Dropcatch auction', 12000, 'ai|premium',    'Strong .ai name, hold for a strategic buyer.'),
    ('quickroute.io',              200,   650,  30, 'Cloudflare', 'active', 'review',     false, null,  null, null,  null, null, 'Keyword',   'Expired domain auction', 1800, 'logistics', null),
    ('harborandmain.com',          400,   900,  14, 'GoDaddy',    'active', 'dont_renew', false, null,  null, null,  null, null, 'Geo',       'Hand registration', 700,  null,            'Expired — decide whether to drop.'),
    ('subtleinteriors.com',        320,  1500,  15, 'Namecheap',  'active', 'review',     true,  8500,  null, null,  null, null, 'Brandable', 'Brokered purchase', 6400, 'interiors',     null),
    ('cryptoledger.pro',           120,  5000,  45, 'Namecheap',  'active', 'auto_renew', true,  25000, null, null,  null, null, 'Keyword',   'Auction',           19000,'crypto',        null),
    ('feedlytics.com',              30,   300,  12, 'Cloudflare', 'listed', 'pending',    true,  2400,  null, null,  null, null, 'Brandable', 'Hand registration', 2400, 'saas',          null),
    ('greenleafcafe.com',          500,   400,  12, 'GoDaddy',    'expired','dont_renew', false, null,  null, null,  null, null, 'Geo',       'Hand registration', 300,  'food',          'Likely to drop.'),
    ('brightpathmentors.com',      150,  1800,  16, 'Namecheap',  'active', 'renew',      true,  9900,  null, null,  null, null, 'Brandable', 'Broker',            7400, 'education',     null),
    ('solarpunkcity.com',           90,   700,  13, 'Cloudflare', 'active', 'auto_renew', false, null,  null, null,  null, null, 'Trend',     'Hand registration', 2100, 'trend|green',   null),
    ('petvitals.io',               250,  1100,  32, 'Namecheap',  'listed', 'auto_renew', true,  6800,  null, null,  null, null, 'Brandable', 'Dropcatch auction', 5400, 'pets|health',   null),
    ('silentauctionhub.com',       365,   950,  14, 'Namecheap',  'active', 'review',     false, null,  null, null,  null, null, 'Keyword',   'Hand registration', 1500, 'events',        null),
    ('medflow.health',              75,  3200,  55, 'Cloudflare', 'active', 'renew',      true,  18000, null, null,  null, null, 'Keyword',   'Auction',           15500, 'health|saas',  null),
    ('urbannest.co',                40,   800,  28, 'Namecheap',  'active', 'auto_renew', false, null,  null, null,  null, null, 'Brandable', 'Hand registration', 2800, 'realestate',    null),
    ('thevintageedit.com',         700,   600,  12, 'GoDaddy',    'sold',   'dont_renew', false, null,   300,   4200,  3900, 'Dan.com', 'Brandable', 'Hand registration', 4200, 'fashion',      'Sold to an end user.'),
    ('cloudcrest.dev',              55,  1500,  24, 'Cloudflare', 'active', 'auto_renew', true,  11500, null, null,  null, null, 'Keyword',   'Dropcatch',         8800, 'devtools',      null),
    ('fintechpulse.news',          180,  1200,  18, 'Namecheap',  'active', 'review',     false, null,  null, null,  null, null, 'Keyword',   'Auction',           3600, 'finance|media', null),
    ('ecoquest.org',               220,   900,  22, 'GoDaddy',    'active', 'renew',      false, null,  null, null,  null, null, 'Geo',       'Hand registration', 1900, 'green|nonprofit', null),
    ('ninthwave.xyz',               35,   250,  10, 'Namecheap',  'active', 'auto_renew', false, null,  null, null,  null, null, 'Brandable', 'Hand registration', 900,  'short',         null),
    ('codepilot.app',               95,  2600,  30, 'Cloudflare', 'listed', 'renew',      true,  14000, null, null,  null, null, 'Brandable', 'Broker',            12500, 'ai|saas',      null),
    ('summitridgeproperties.com',  330,  1400,  14, 'Namecheap',  'active', 'review',     false, null,  null, null,  null, null, 'Geo',       'Hand registration', 1300, 'realestate',    null),
    ('quietluxuryhome.com',        280,  2000,  15, 'Namecheap',  'active', 'renew',      true,  15000, null, null,  null, null, 'Brandable', 'Broker',            11000, 'realestate',   null),
    ('dataloop.tech',              130,  3100,  40, 'Cloudflare', 'active', 'auto_renew', true,  21000, null, null,  null, null, 'Keyword',   'Auction',           17500, 'data|saas',    null),
    ('simplebudgetpro.com',         60,   500,  12, 'Namecheap',  'sold',   'dont_renew', false, null,   800,   2600,  2450, 'Dan.com', 'Keyword', 'Hand registration', 2600, 'finance',      'Quick flip.'),
    ('wanderfultrips.com',         420,   700,  13, 'GoDaddy',    'expired','dont_renew', false, null,  null, null,  null, null, 'Geo',       'Hand registration', 400,  'travel',        'Let it lapse.'),
    ('aircraftparts.online',       160,  1800,  26, 'Cloudflare', 'active', 'review',     false, null,  null, null,  null, null, 'Keyword',   'Dropcatch',         2900, 'industrial',    null),
    ('musecreative.studio',         25,   900,  30, 'Namecheap',  'active', 'auto_renew', false, null,  null, null,  null, null, 'Brandable', 'Hand registration', 3100, 'creative',      null),
    ('legalbridge.law',            340,  4500,  60, 'Namecheap',  'active', 'renew',      true,  28000, null, null,  null, null, 'Keyword',   'Auction',           22000, 'legal',         null),
    ('freshmealprep.com',          110,  1000,  12, 'Namecheap',  'listed', 'pending',    true,  5200,  null, null,  null, null, 'Brandable', 'Hand registration', 4600, 'food',          null),
    ('quantumleap.ventures',       200,  5500,  75, 'Cloudflare', 'active', 'review',     false, null,  null, null,  null, null, 'Trend',     'Broker',            9800, 'vc|trend',      null)
  ) as d(
    domain, age_days, price, renewal, registrar, status, decision, listed, asking,
    sold_ago, sale_price, net_proceeds, platform, niche, source, estimated_value, tags, notes
  );

  get diagnostics v_count = row_count;

  insert into domain_activity (workspace_id, user_id, action, summary, changes)
  values (
    p_workspace_id, v_uid, 'imported',
    'Loaded ' || v_count || ' demo domains',
    jsonb_build_object('demo', true, 'count', v_count)
  );

  return v_count;
end;
$$;

grant execute on function public.load_demo_data(uuid) to authenticated;
