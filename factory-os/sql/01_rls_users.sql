-- User profiles RLS policies (drop first to avoid duplicate errors)
drop policy if exists users_read_own_profile on user_profiles;
drop policy if exists users_update_own_profile on user_profiles;
drop policy if exists read_roles on roles;

create policy users_read_own_profile
  on user_profiles for select
  using (auth.uid() = id);

create policy users_update_own_profile
  on user_profiles for update
  using (auth.uid() = id);

create policy read_roles
  on roles for select
  using (auth.uid() is not null);
