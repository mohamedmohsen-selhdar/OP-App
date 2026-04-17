$token = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$projectId = "qmhgckkqksnxwmxqllkp"
$baseUrl = "https://api.supabase.com/v1/projects/$projectId/database/query"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

function Run-SQL {
    param([string]$name, [string]$sql)
    Write-Host "`n===> $name" -ForegroundColor Cyan
    $body = [ordered]@{ query = $sql } | ConvertTo-Json -Depth 10
    try {
        $r = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "    OK" -ForegroundColor Green
    } catch {
        $err = $_.ErrorDetails.Message
        if (-not $err) { $err = $_.Exception.Message }
        Write-Host "    ERROR: $err" -ForegroundColor Red
    }
}

# FIX 1 — user_profiles RLS (the managers policy uses single-quotes inside SQL strings)
# Solution: pass using raw strings, avoid quoting issues by calling separate simpler policies
Run-SQL "RLS user_profiles fix" "
create policy if not exists users_read_own_profile
  on user_profiles for select
  using (auth.uid() = id);

create policy if not exists users_update_own_profile
  on user_profiles for update
  using (auth.uid() = id);

create policy if not exists read_roles
  on roles for select
  using (auth.uid() is not null);
"

# FIX 2 — Seed data (break into individual inserts, no JSON in body)
Run-SQL "Seed branches" "
insert into branches (code, name_ar, name_en, address)
values ('BR-01', 'المصنع الرئيسي', 'Main Factory', 'القاهرة، مصر')
on conflict (code) do nothing;
"

Run-SQL "Seed warehouses" "
insert into warehouses (branch_id, code, name_ar, name_en, type)
select b.id, 'WH-RAW', 'مستودع المواد الخام', 'Raw Materials Warehouse', 'raw_materials'
from branches b where b.code = 'BR-01'
on conflict (code) do nothing;

insert into warehouses (branch_id, code, name_ar, name_en, type)
select b.id, 'WH-FIN', 'مستودع المنتجات التامة', 'Finished Goods Warehouse', 'finished_goods'
from branches b where b.code = 'BR-01'
on conflict (code) do nothing;

insert into warehouses (branch_id, code, name_ar, name_en, type)
select b.id, 'WH-SPS', 'مستودع قطع الغيار', 'Spare Parts Warehouse', 'spare_parts'
from branches b where b.code = 'BR-01'
on conflict (code) do nothing;
"

Run-SQL "Seed production lines" "
insert into production_lines (branch_id, code, name_ar, name_en, capacity_per_shift)
select b.id, 'LINE-01', 'خط الإنتاج الأول', 'Production Line 1', 500
from branches b where b.code = 'BR-01'
on conflict (code) do nothing;

insert into production_lines (branch_id, code, name_ar, name_en, capacity_per_shift)
select b.id, 'LINE-02', 'خط الإنتاج الثاني', 'Production Line 2', 400
from branches b where b.code = 'BR-01'
on conflict (code) do nothing;
"

Run-SQL "Seed roles" "
insert into roles (code, name_ar, name_en, permissions, can_see_all_branches) values
('owner', 'المالك / المدير التنفيذي', 'Owner / CEO', '{""*"": true}'::jsonb, true),
('factory_manager', 'مدير المصنع', 'Factory Manager', '{""production"":{""view"":true,""create"":true,""edit"":true,""delete"":false,""approve"":true},""inventory"":{""view"":true,""create"":true,""edit"":true,""delete"":false,""approve"":true},""quality"":{""view"":true,""create"":true,""edit"":true,""delete"":false,""approve"":true},""maintenance"":{""view"":true,""create"":true,""edit"":true,""delete"":false,""approve"":true},""procurement"":{""view"":true,""create"":true,""edit"":true,""delete"":false,""approve"":true},""sales"":{""view"":true,""create"":true,""edit"":true,""delete"":false,""approve"":true},""settings"":{""view"":true}}'::jsonb, true),
('production_supervisor', 'مشرف الإنتاج', 'Production Supervisor', '{""production"":{""view"":true,""create"":true,""edit"":true},""inventory"":{""view"":true},""quality"":{""view"":true,""create"":true},""maintenance"":{""view"":true,""create"":true},""procurement"":{""view"":false},""sales"":{""view"":false},""settings"":{""view"":false}}'::jsonb, false),
('quality_inspector', 'مفتش الجودة', 'Quality Inspector', '{""production"":{""view"":true},""inventory"":{""view"":true},""quality"":{""view"":true,""create"":true,""edit"":true},""maintenance"":{""view"":true},""procurement"":{""view"":false},""sales"":{""view"":false},""settings"":{""view"":false}}'::jsonb, false),
('warehouse_keeper', 'أمين المستودع', 'Warehouse Keeper', '{""production"":{""view"":true},""inventory"":{""view"":true,""create"":true,""edit"":true},""quality"":{""view"":false},""maintenance"":{""view"":false},""procurement"":{""view"":true,""create"":true},""sales"":{""view"":true},""settings"":{""view"":false}}'::jsonb, false),
('maintenance_tech', 'فني الصيانة', 'Maintenance Technician', '{""production"":{""view"":true},""inventory"":{""view"":true},""quality"":{""view"":false},""maintenance"":{""view"":true,""create"":true,""edit"":true},""procurement"":{""view"":false},""sales"":{""view"":false},""settings"":{""view"":false}}'::jsonb, false)
on conflict (code) do nothing;
"

Run-SQL "Seed item categories" "
insert into item_categories (name_ar, name_en) values
('مواد خام', 'Raw Materials'),
('منتجات تامة', 'Finished Products'),
('قطع غيار', 'Spare Parts'),
('مواد تعبئة', 'Packaging Materials')
on conflict do nothing;
"

# FIX 3 — Auto-profile trigger (avoid ->> operator in string)
Run-SQL "Auto-profile trigger" "
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as \$\$
begin
  insert into public.user_profiles (id, full_name_en)
  values (new.id, (new.raw_user_meta_data ->> 'full_name'))
  on conflict (id) do nothing;
  return new;
end;
\$\$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
"

Write-Host "`n=== Complete ===" -ForegroundColor Yellow
