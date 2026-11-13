create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create table if not exists public.public_app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.public_app_state enable row level security;
grant usage on schema public to anon, authenticated;
grant select on public.public_app_state to anon, authenticated;
grant select, insert, update, delete on public.app_state to authenticated;

drop policy if exists "Public reads published application state" on public.public_app_state;
create policy "Public reads published application state"
  on public.public_app_state for select to anon, authenticated
  using (true);

drop policy if exists "Admins read application state" on public.app_state;
create policy "Admins read application state"
  on public.app_state for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins insert application state" on public.app_state;
create policy "Admins insert application state"
  on public.app_state for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins update application state" on public.app_state;
create policy "Admins update application state"
  on public.app_state for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins delete application state" on public.app_state;
create policy "Admins delete application state"
  on public.app_state for delete to authenticated
  using ((select public.is_admin()));

create or replace function public.public_state_value(p_key text, state_value jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_key not in (
    'uk_destinations_delta',
    'uk_packages_delta',
    'uk_blogs',
    'uk_itinerary_templates',
    'uk_site_settings',
    'uk_gallery_submissions'
  ) then
    raise exception 'Public access is not allowed for this state key';
  end if;

  if state_value is null then
    return null;
  end if;

  if p_key in ('uk_destinations_delta', 'uk_packages_delta') then
    return jsonb_build_object(
      'overrides',
        coalesce((
          select jsonb_object_agg(
            entry_key,
            case
              when lower(coalesce(entry_value->>'status', 'published')) = 'published' then entry_value
              else jsonb_build_object('status', entry_value->>'status')
            end
          )
          from jsonb_each(coalesce(state_value->'overrides', '{}'::jsonb)) as e(entry_key, entry_value)
        ), '{}'::jsonb),
      'additions',
        coalesce((
          select jsonb_agg(entry)
          from jsonb_array_elements(coalesce(state_value->'additions', '[]'::jsonb)) as a(entry)
          where lower(coalesce(entry->>'status', 'published')) = 'published'
        ), '[]'::jsonb),
      'deletedIds', coalesce(state_value->'deletedIds', '[]'::jsonb)
    );
  elsif p_key in ('uk_blogs', 'uk_itinerary_templates') then
    return coalesce((
      select jsonb_agg(entry)
      from jsonb_array_elements(state_value) as a(entry)
      where lower(coalesce(entry->>'status', 'published')) = 'published'
    ), '[]'::jsonb);
  elsif p_key = 'uk_gallery_submissions' then
    return coalesce((
      select jsonb_agg(entry - 'email' - 'rejectionReason')
      from jsonb_array_elements(state_value) as a(entry)
      where entry->>'status' = 'approved'
    ), '[]'::jsonb);
  end if;

  return state_value;
end;
$$;

create or replace function public.read_public_state(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.public_state_value(p_key, value)
  from public.app_state
  where key = p_key;
$$;

revoke all on function public.read_public_state(text) from public;
grant execute on function public.read_public_state(text) to anon, authenticated;
revoke all on function public.public_state_value(text, jsonb) from public;
grant execute on function public.public_state_value(text, jsonb) to authenticated;

create or replace function public.sync_public_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  state_key text;
  state_value jsonb;
  visible_value jsonb;
begin
  state_key := coalesce(new.key, old.key);
  state_value := case when tg_op = 'DELETE' then null else new.value end;

  if state_key not in (
    'uk_destinations_delta',
    'uk_packages_delta',
    'uk_blogs',
    'uk_itinerary_templates',
    'uk_site_settings',
    'uk_gallery_submissions'
  ) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  visible_value := public.public_state_value(state_key, state_value);
  if visible_value is null then
    delete from public.public_app_state where key = state_key;
  else
    insert into public.public_app_state(key, value, updated_at)
    values (state_key, visible_value, now())
    on conflict (key) do update
      set value = excluded.value, updated_at = excluded.updated_at;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_public_state_after_change on public.app_state;
create trigger sync_public_state_after_change
  after insert or update or delete on public.app_state
  for each row execute function public.sync_public_state();

insert into public.public_app_state(key, value)
select key, public.public_state_value(key, value)
from public.app_state
where key in (
  'uk_destinations_delta',
  'uk_packages_delta',
  'uk_blogs',
  'uk_itinerary_templates',
  'uk_site_settings',
  'uk_gallery_submissions'
)
on conflict (key) do update
  set value = excluded.value, updated_at = now();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_state'
    ) then
      alter publication supabase_realtime add table public.app_state;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'public_app_state'
    ) then
      alter publication supabase_realtime add table public.public_app_state;
    end if;
  end if;
end;
$$;

create or replace function public.submit_public_record(p_key text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_value jsonb;
  notification_value jsonb;
  record_title text;
  record_message text;
  notification_kind text;
begin
  if p_key = 'uk_inquiries' then
    if length(trim(coalesce(p_payload->>'name', ''))) not between 1 and 120
      or length(trim(coalesce(p_payload->>'email', ''))) not between 3 and 254
      or trim(p_payload->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or length(coalesce(p_payload->>'message', '')) > 5000 then
      raise exception 'Please provide valid inquiry details';
    end if;
    record_value := jsonb_build_object(
      'id', 'inq_' || gen_random_uuid()::text,
      'status', 'New',
      'date', now(),
      'name', left(trim(p_payload->>'name'), 120),
      'email', left(trim(p_payload->>'email'), 254),
      'phone', left(coalesce(p_payload->>'phone', ''), 50),
      'source', left(coalesce(p_payload->>'source', 'Contact'), 40),
      'inquiryType', left(coalesce(p_payload->>'inquiryType', 'General Inquiry'), 80),
      'destination', left(coalesce(p_payload->>'destination', ''), 120),
      'travelDate', left(coalesce(p_payload->>'travelDate', ''), 40),
      'travellers', left(coalesce(p_payload->>'travellers', ''), 10),
      'message', left(coalesce(p_payload->>'message', ''), 5000),
      'itinerary', left(coalesce(p_payload->>'itinerary', ''), 2000)
    );
    notification_kind := 'inquiry';
    record_title := case when record_value->>'source' = 'Plan My Trip' then 'New trip request' else 'New inquiry received' end;
    record_message := 'From ' || (record_value->>'name') ||
      case when coalesce(record_value->>'destination', '') <> '' then ' — ' || (record_value->>'destination') else '' end;
  elsif p_key = 'uk_gallery_submissions' then
    if length(trim(coalesce(p_payload->>'visitorName', ''))) not between 1 and 120
      or length(trim(coalesce(p_payload->>'email', ''))) not between 3 and 254
      or trim(p_payload->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or coalesce(p_payload->>'image', '') not like 'https://%/storage/v1/object/public/site-assets/gallery/%' then
      raise exception 'Please provide valid gallery submission details';
    end if;
    record_value := jsonb_build_object(
      'id', 'sub_' || gen_random_uuid()::text,
      'status', 'pending',
      'date', now(),
      'rejectionReason', null,
      'image', left(p_payload->>'image', 1500),
      'place', left(coalesce(p_payload->>'place', ''), 120),
      'region', left(coalesce(p_payload->>'region', ''), 60),
      'title', left(coalesce(p_payload->>'title', ''), 180),
      'caption', left(coalesce(p_payload->>'caption', ''), 1000),
      'visitorName', left(trim(p_payload->>'visitorName'), 120),
      'email', left(trim(p_payload->>'email'), 254)
    );
    notification_kind := 'gallery';
    record_title := 'New gallery image submitted';
    record_message := '"' || coalesce(record_value->>'title', 'Untitled') ||
      '" from ' || coalesce(record_value->>'visitorName', 'a visitor');
  else
    raise exception 'Public submissions are not allowed for this state key';
  end if;

  notification_value := jsonb_build_object(
    'id', 'ntf_' || gen_random_uuid()::text,
    'type', notification_kind,
    'title', record_title,
    'message', record_message,
    'link', case when notification_kind = 'inquiry' then '/admin/inquiries' else '/admin/gallery' end,
    'timestamp', now(),
    'read', false
  );

  insert into public.app_state(key, value)
  values (p_key, jsonb_build_array(record_value))
  on conflict (key) do update
    set value = case
      when jsonb_typeof(public.app_state.value) = 'array'
        then public.app_state.value || jsonb_build_array(record_value)
      else jsonb_build_array(record_value)
    end,
    updated_at = now();

  insert into public.app_state(key, value)
  values (
    'uk_admin_notifications',
    jsonb_build_array(notification_value)
  )
  on conflict (key) do update
    set value = (
      select coalesce(jsonb_agg(entry order by ordinal), '[]'::jsonb)
      from jsonb_array_elements(
        jsonb_build_array(notification_value) || coalesce(public.app_state.value, '[]'::jsonb)
      ) with ordinality as entries(entry, ordinal)
      where ordinal <= 100
    ),
    updated_at = now();

  return record_value;
end;
$$;

revoke all on function public.submit_public_record(text, jsonb) from public;
grant execute on function public.submit_public_record(text, jsonb) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view site assets" on storage.objects;
create policy "Public can view site assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-assets');

drop policy if exists "Admins upload site assets" on storage.objects;
create policy "Admins upload site assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-assets' and (select public.is_admin()));

drop policy if exists "Visitors upload gallery submissions" on storage.objects;
create policy "Visitors upload gallery submissions"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1] = 'gallery'
  );

drop policy if exists "Admins update site assets" on storage.objects;
create policy "Admins update site assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-assets' and (select public.is_admin()))
  with check (bucket_id = 'site-assets' and (select public.is_admin()));

drop policy if exists "Admins delete site assets" on storage.objects;
create policy "Admins delete site assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-assets' and (select public.is_admin()));
