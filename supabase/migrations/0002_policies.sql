-- ============================================================================
--  DomainFolio · 0002 · security & RPCs
--  Membership helpers, row-level security, and the atomic write paths
--  (create_workspace, renew/archive/restore, load_demo_data).
-- ============================================================================

-- ---------------------------- helper functions ------------------------------

-- SECURITY DEFINER so policies on workspace_members never recurse.
create or replace function public.is_workspace_member(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = wid and m.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role_of(wid uuid)
returns workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.workspace_members m
  where m.workspace_id = wid and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_manage_workspace(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.workspace_role_of(wid) in ('owner', 'admin'), false);
$$;

-- True when the two users share at least one workspace (for member lists).
create or replace function public.shares_workspace(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = other_user
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.workspace_role_of(uuid) to authenticated;
grant execute on function public.can_manage_workspace(uuid) to authenticated;
grant execute on function public.shares_workspace(uuid) to authenticated;

-- -------------------------------- RLS ---------------------------------------

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table domains enable row level security;
alter table domain_activity enable row level security;
alter table import_batches enable row level security;
alter table saved_views enable row level security;
alter table user_settings enable row level security;
alter table custom_options enable row level security;

-- profiles
create policy profiles_select_own on profiles
  for select using (id = auth.uid() or public.shares_workspace(id));
create policy profiles_insert_own on profiles
  for insert with check (id = auth.uid());
create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspaces
create policy workspaces_select_member on workspaces
  for select using (public.is_workspace_member(id));
create policy workspaces_insert_owner on workspaces
  for insert with check (owner_id = auth.uid());
create policy workspaces_update_manager on workspaces
  for update using (public.can_manage_workspace(id)) with check (public.can_manage_workspace(id));
create policy workspaces_delete_owner on workspaces
  for delete using (owner_id = auth.uid());

-- workspace_members
create policy members_select_self_or_member on workspace_members
  for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
create policy members_insert_manager on workspace_members
  for insert with check (public.can_manage_workspace(workspace_id));
create policy members_update_manager on workspace_members
  for update using (public.can_manage_workspace(workspace_id));
create policy members_delete_manager on workspace_members
  for delete using (public.can_manage_workspace(workspace_id));

-- domains — every action is scoped to a workspace the caller belongs to.
create policy domains_select_member on domains
  for select using (public.is_workspace_member(workspace_id));
create policy domains_insert_member on domains
  for insert with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());
create policy domains_update_member on domains
  for update using (public.is_workspace_member(workspace_id));
create policy domains_delete_member on domains
  for delete using (public.can_manage_workspace(workspace_id));

-- domain_activity
create policy activity_select_member on domain_activity
  for select using (public.is_workspace_member(workspace_id));
create policy activity_insert_member on domain_activity
  for insert with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

-- import_batches
create policy batches_select_member on import_batches
  for select using (public.is_workspace_member(workspace_id));
create policy batches_insert_member on import_batches
  for insert with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

-- saved_views
create policy views_select on saved_views
  for select using (user_id = auth.uid() or (is_shared and public.is_workspace_member(workspace_id)));
create policy views_insert on saved_views
  for insert with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());
create policy views_update_own on saved_views
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy views_delete_own on saved_views
  for delete using (user_id = auth.uid());

-- user_settings — personal
create policy settings_all_own on user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- custom_options
create policy options_select_member on custom_options
  for select using (public.is_workspace_member(workspace_id));
create policy options_write_manager on custom_options
  for all using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));

-- -------------------------------- RPCs --------------------------------------

create or replace function public.create_workspace(p_name text, p_default_currency text default 'USD')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'Workspace name is required';
  end if;

  insert into public.workspaces (owner_id, name, default_currency)
  values (v_uid, btrim(p_name), coalesce(nullif(p_default_currency, '')::purchase_currency, 'USD'))
  returning id into v_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_id, v_uid, 'owner');

  return v_id;
end;
$$;

-- Renewal: expiry = today + 1 year, active, pending, cost recorded, and an
-- activity row compatible with the legacy reader (action 'updated', changes.activityKind = 'renewal').
create or replace function public.renew_domain(
  p_domain_id uuid,
  p_renewal_cost numeric,
  p_note text default null
)
returns domains
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_prev_expiry date;
  v_prev_cost numeric;
  v_row domains;
  v_new_expiry date := (current_date + interval '1 year')::date;
begin
  select expiry_date, renewal_cost into v_prev_expiry, v_prev_cost
  from domains where id = p_domain_id for update;

  if not found then
    raise exception 'Domain not found or not accessible';
  end if;

  update domains
     set expiry_date = v_new_expiry,
         status = 'active',
         renewal_decision = 'pending',
         renewal_cost = coalesce(p_renewal_cost, renewal_cost),
         last_renewed_at = now()
   where id = p_domain_id
   returning * into v_row;

  insert into domain_activity (workspace_id, user_id, domain_id, action, summary, changes)
  values (
    v_row.workspace_id,
    auth.uid(),
    v_row.id,
    'updated',
    'Renewed ' || v_row.domain,
    jsonb_build_object(
      'activityKind', 'renewal',
      'expiry_date', jsonb_build_object('from', v_prev_expiry, 'to', v_new_expiry),
      'renewal_cost', jsonb_build_object('from', v_prev_cost, 'to', v_row.renewal_cost)
    ) || case when p_note is null then '{}'::jsonb else jsonb_build_object('note', p_note) end
  );

  return v_row;
end;
$$;

-- Archive is idempotent and never deletes.
create or replace function public.archive_domain(p_domain_id uuid, p_reason text default null)
returns domains
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row domains;
begin
  select * into v_row from domains where id = p_domain_id for update;
  if not found then
    raise exception 'Domain not found or not accessible';
  end if;

  if v_row.archived_at is not null then
    return v_row; -- already archived: no-op, no duplicate activity
  end if;

  update domains
     set archived_at = now(), archive_reason = nullif(btrim(coalesce(p_reason, '')), '')
   where id = p_domain_id
   returning * into v_row;

  insert into domain_activity (workspace_id, user_id, domain_id, action, summary, changes)
  values (
    v_row.workspace_id, auth.uid(), v_row.id, 'archived', 'Archived ' || v_row.domain,
    case when v_row.archive_reason is null then null else jsonb_build_object('reason', v_row.archive_reason) end
  );

  return v_row;
end;
$$;

-- Restore is the inverse, and equally idempotent.
create or replace function public.restore_domain(p_domain_id uuid)
returns domains
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row domains;
begin
  select * into v_row from domains where id = p_domain_id for update;
  if not found then
    raise exception 'Domain not found or not accessible';
  end if;

  if v_row.archived_at is null then
    return v_row; -- already active
  end if;

  update domains
     set archived_at = null, archive_reason = null
   where id = p_domain_id
   returning * into v_row;

  insert into domain_activity (workspace_id, user_id, domain_id, action, summary)
  values (v_row.workspace_id, auth.uid(), v_row.id, 'restored', 'Restored ' || v_row.domain);

  return v_row;
end;
$$;

-- Demo data: only ever runs into an empty workspace, so it can't duplicate.
create or replace function public.load_demo_data(p_workspace_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Not a member of this workspace';
  end if;

  if exists (select 1 from domains where workspace_id = p_workspace_id) then
    return 0;
  end if;

  insert into domains (
    workspace_id, user_id, domain, purchase_date, expiry_date,
    purchase_price, purchase_currency, renewal_cost, registrar,
    status, renewal_decision, listed_on, asking_price, sale_platform, sale_type,
    sold_date, sale_price, net_proceeds, acquisition_source, niche, estimated_value, tags, notes
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
    d.notes
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

grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.renew_domain(uuid, numeric, text) to authenticated;
grant execute on function public.archive_domain(uuid, text) to authenticated;
grant execute on function public.restore_domain(uuid) to authenticated;
grant execute on function public.load_demo_data(uuid) to authenticated;
