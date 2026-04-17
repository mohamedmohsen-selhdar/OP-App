$mgmtToken = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaGdja2txa3NueHdteHFsbGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQzMDQ5OCwiZXhwIjoyMDg3MDA2NDk4fQ.Yqi6JDYdYmHTCSQrighHYUVmg7_OARXA5Q_lqVnas2c"
$supabaseUrl = "https://qmhgckkqksnxwmxqllkp.supabase.co"
$projectRef  = "qmhgckkqksnxwmxqllkp"

$authH = @{ "Authorization" = "Bearer $serviceKey"; "apikey" = $serviceKey; "Content-Type" = "application/json" }
$mgmtH = @{ "Authorization" = "Bearer $mgmtToken"; "Content-Type" = "application/json" }

function Run-SQL($sql) {
    $b = @{ query = $sql } | ConvertTo-Json -Depth 5
    return Invoke-RestMethod `
        -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" `
        -Method POST -Headers $mgmtH -Body $b -ErrorAction Stop
}

# 1 — Fix the broken trigger (it used full_name_en but column is name_en)
Write-Host "===> Fixing signup trigger..." -ForegroundColor Cyan
$triggerSQL = @"
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as
\$func\$
begin
  insert into public.user_profiles (id, name_en, email)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.email)
  on conflict (id) do nothing;
  return new;
end;
\$func\$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
"@
Run-SQL $triggerSQL | Out-Null
Write-Host "    Trigger fixed!" -ForegroundColor Green

# 2 — Now create the admin user (trigger will no longer block it)
Write-Host "===> Creating admin@factoryos.app..." -ForegroundColor Cyan
$newUserBody = '{"email":"admin@factoryos.app","password":"FactoryOS@2024","email_confirm":true}'
$newUser = Invoke-RestMethod `
    -Uri "$supabaseUrl/auth/v1/admin/users" `
    -Method POST -Headers $authH -Body $newUserBody -ErrorAction Stop
$adminId = $newUser.id
Write-Host "    Created! ID: $adminId" -ForegroundColor Green

# 3 — Make them Owner
Write-Host "===> Setting Owner role..." -ForegroundColor Cyan
Run-SQL "update user_profiles set role_id=(select id from roles where code='owner'), branch_id=(select id from branches where code='BR-01') where id='$adminId';" | Out-Null
Write-Host "    Done!" -ForegroundColor Green

# 4 — Also fix Gmail account
$gmailId = "ad386b69-09ad-417c-ba5a-5fa8ca476235"
Write-Host "===> Setting Owner role for Gmail account..." -ForegroundColor Cyan
Run-SQL "insert into user_profiles(id,name_en,email,role_id,branch_id) values('$gmailId','Mohamed','mohamedmohsen.whitecorp@gmail.com',(select id from roles where code='owner'),(select id from branches where code='BR-01')) on conflict(id) do update set role_id=(select id from roles where code='owner'),branch_id=(select id from branches where code='BR-01');" | Out-Null
Write-Host "    Done!" -ForegroundColor Green

Write-Host "`n=== All accounts ready ===" -ForegroundColor Yellow
Write-Host "  admin@factoryos.app / FactoryOS@2024"
Write-Host "  mohamedmohsen.whitecorp@gmail.com / (your existing password)"
