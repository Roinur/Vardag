create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  google_avatar text := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    google_avatar
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

update public.profiles profile
set avatar_url = coalesce(
  nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
  nullif(auth_user.raw_user_meta_data ->> 'picture', ''),
  profile.avatar_url
)
from auth.users auth_user
where auth_user.id = profile.id
  and coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(auth_user.raw_user_meta_data ->> 'picture', '')
  ) is not null;
