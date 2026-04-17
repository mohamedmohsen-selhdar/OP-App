$token = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$projectId = "qmhgckkqksnxwmxqllkp"
$baseUrl = "https://api.supabase.com/v1/projects/$projectId/database/query"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

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

# 8 - Enable RLS
Run-SQL "Enable RLS" @'
alter table branches enable row level security;
alter table warehouses enable row level security;
alter table production_lines enable row level security;
alter table machines enable row level security;
alter table roles enable row level security;
alter table user_profiles enable row level security;
alter table item_categories enable row level security;
alter table items enable row level security;
alter table inventory enable row level security;
alter table bom_headers enable row level security;
alter table bom_lines enable row level security;
alter table production_orders enable row level security;
alter table production_logs enable row level security;
alter table defect_logs enable row level security;
alter table downtime_logs enable row level security;
alter table suppliers enable row level security;
alter table purchase_requests enable row level security;
alter table purchase_request_lines enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_lines enable row level security;
alter table customers enable row level security;
alter table sales_orders enable row level security;
alter table sales_order_lines enable row level security;
alter table stock_movements enable row level security;
alter table notifications enable row level security;
alter table approval_logs enable row level security;
'@

# 9 - user_profiles policies
Run-SQL "RLS user_profiles" @'
create policy "users read own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "managers read all profiles"
  on user_profiles for select
  using (
    exists (
      select 1 from user_profiles up
      join roles r on r.id = up.role_id
      where up.id = auth.uid()
        and r.code in (''owner'',''factory_manager'')
    )
  );

create policy "users update own profile"
  on user_profiles for update
  using (auth.uid() = id);

create policy "read roles"
  on roles for select
  using (auth.uid() is not null);
'@

# 10 - Lookup tables
Run-SQL "RLS lookup tables" @'
create policy "read branches"         on branches          for select using (auth.uid() is not null);
create policy "read warehouses"       on warehouses        for select using (auth.uid() is not null);
create policy "read lines"            on production_lines  for select using (auth.uid() is not null);
create policy "read machines"         on machines          for select using (auth.uid() is not null);
create policy "update machines"       on machines          for update using (auth.uid() is not null);
create policy "read item_categories"  on item_categories   for select using (auth.uid() is not null);
create policy "read items"            on items             for select using (auth.uid() is not null);
create policy "insert items"          on items             for insert with check (auth.uid() is not null);
create policy "update items"          on items             for update using (auth.uid() is not null);
create policy "read suppliers"        on suppliers         for select using (auth.uid() is not null);
create policy "read customers"        on customers         for select using (auth.uid() is not null);
create policy "read bom_headers"      on bom_headers       for select using (auth.uid() is not null);
create policy "read bom_lines"        on bom_lines         for select using (auth.uid() is not null);
'@

# 11 - Inventory
Run-SQL "RLS inventory and stock" @'
create policy "read inventory"   on inventory       for select using (auth.uid() is not null);
create policy "insert inventory" on inventory       for insert with check (auth.uid() is not null);
create policy "update inventory" on inventory       for update using (auth.uid() is not null);
create policy "read movements"   on stock_movements for select using (auth.uid() is not null);
create policy "insert movements" on stock_movements for insert with check (auth.uid() is not null);
'@

# 12 - Production
Run-SQL "RLS production" @'
create policy "read prod orders"   on production_orders for select using (auth.uid() is not null);
create policy "insert prod orders" on production_orders for insert with check (auth.uid() is not null);
create policy "update prod orders" on production_orders for update using (auth.uid() is not null);
create policy "read prod logs"     on production_logs   for select using (auth.uid() is not null);
create policy "insert prod logs"   on production_logs   for insert with check (auth.uid() is not null);
'@

# 13 - Quality and Maintenance
Run-SQL "RLS quality and maintenance" @'
create policy "read defect logs"     on defect_logs   for select using (auth.uid() is not null);
create policy "insert defect logs"   on defect_logs   for insert with check (auth.uid() is not null);
create policy "update defect logs"   on defect_logs   for update using (auth.uid() is not null);
create policy "read downtime logs"   on downtime_logs for select using (auth.uid() is not null);
create policy "insert downtime logs" on downtime_logs for insert with check (auth.uid() is not null);
create policy "update downtime logs" on downtime_logs for update using (auth.uid() is not null);
'@

# 14 - Procurement
Run-SQL "RLS procurement" @'
create policy "read pr"         on purchase_requests      for select using (auth.uid() is not null);
create policy "insert pr"       on purchase_requests      for insert with check (auth.uid() is not null);
create policy "update pr"       on purchase_requests      for update using (auth.uid() is not null);
create policy "read pr lines"   on purchase_request_lines for select using (auth.uid() is not null);
create policy "insert pr lines" on purchase_request_lines for insert with check (auth.uid() is not null);
create policy "read po"         on purchase_orders        for select using (auth.uid() is not null);
create policy "insert po"       on purchase_orders        for insert with check (auth.uid() is not null);
create policy "update po"       on purchase_orders        for update using (auth.uid() is not null);
create policy "read po lines"   on purchase_order_lines   for select using (auth.uid() is not null);
create policy "insert po lines" on purchase_order_lines   for insert with check (auth.uid() is not null);
'@

# 15 - Sales
Run-SQL "RLS sales" @'
create policy "read so"         on sales_orders      for select using (auth.uid() is not null);
create policy "insert so"       on sales_orders      for insert with check (auth.uid() is not null);
create policy "update so"       on sales_orders      for update using (auth.uid() is not null);
create policy "read so lines"   on sales_order_lines for select using (auth.uid() is not null);
create policy "insert so lines" on sales_order_lines for insert with check (auth.uid() is not null);
'@

# 16 - Notifications
Run-SQL "RLS notifications and approvals" @'
create policy "own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "insert notifications"
  on notifications for insert
  with check (auth.uid() is not null);

create policy "update own notifications"
  on notifications for update
  using (user_id = auth.uid());

create policy "read approval logs"
  on approval_logs for select
  using (auth.uid() is not null);

create policy "insert approval logs"
  on approval_logs for insert
  with check (auth.uid() is not null);
'@

# 17 - Realtime
Run-SQL "Realtime subscriptions" @'
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table production_orders;
alter publication supabase_realtime add table downtime_logs;
alter publication supabase_realtime add table inventory;
alter publication supabase_realtime add table machines;
'@

# 18 - Seed data
Run-SQL "Seed data" @'
insert into branches (code, name_ar, name_en, address)
values (''BR-01'', ''المصنع الرئيسي'', ''Main Factory'', ''القاهرة، مصر'')
on conflict (code) do nothing;

insert into warehouses (branch_id, code, name_ar, name_en, type)
select b.id, ''WH-RAW'', ''مستودع المواد الخام'', ''Raw Materials Warehouse'', ''raw_materials''
from branches b where b.code = ''BR-01''
on conflict (code) do nothing;

insert into warehouses (branch_id, code, name_ar, name_en, type)
select b.id, ''WH-FIN'', ''مستودع المنتجات التامة'', ''Finished Goods Warehouse'', ''finished_goods''
from branches b where b.code = ''BR-01''
on conflict (code) do nothing;

insert into warehouses (branch_id, code, name_ar, name_en, type)
select b.id, ''WH-SPS'', ''مستودع قطع الغيار'', ''Spare Parts Warehouse'', ''spare_parts''
from branches b where b.code = ''BR-01''
on conflict (code) do nothing;

insert into production_lines (branch_id, code, name_ar, name_en, capacity_per_shift)
select b.id, ''LINE-01'', ''خط الإنتاج الأول'', ''Production Line 1'', 500
from branches b where b.code = ''BR-01''
on conflict (code) do nothing;

insert into production_lines (branch_id, code, name_ar, name_en, capacity_per_shift)
select b.id, ''LINE-02'', ''خط الإنتاج الثاني'', ''Production Line 2'', 400
from branches b where b.code = ''BR-01''
on conflict (code) do nothing;

insert into roles (code, name_ar, name_en, permissions, can_see_all_branches) values
(''owner'', ''المالك / المدير التنفيذي'', ''Owner / CEO'',
 ''{"*": true}''::jsonb, true),
(''factory_manager'', ''مدير المصنع'', ''Factory Manager'',
 ''{"production":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"inventory":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"quality":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"maintenance":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"procurement":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"sales":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"settings":{"view":true}}''::jsonb, true),
(''production_supervisor'', ''مشرف الإنتاج'', ''Production Supervisor'',
 ''{"production":{"view":true,"create":true,"edit":true},"inventory":{"view":true},"quality":{"view":true,"create":true},"maintenance":{"view":true,"create":true},"procurement":{"view":false},"sales":{"view":false},"settings":{"view":false}}''::jsonb, false),
(''quality_inspector'', ''مفتش الجودة'', ''Quality Inspector'',
 ''{"production":{"view":true},"inventory":{"view":true},"quality":{"view":true,"create":true,"edit":true},"maintenance":{"view":true},"procurement":{"view":false},"sales":{"view":false},"settings":{"view":false}}''::jsonb, false),
(''warehouse_keeper'', ''أمين المستودع'', ''Warehouse Keeper'',
 ''{"production":{"view":true},"inventory":{"view":true,"create":true,"edit":true},"quality":{"view":false},"maintenance":{"view":false},"procurement":{"view":true,"create":true},"sales":{"view":true},"settings":{"view":false}}''::jsonb, false),
(''maintenance_tech'', ''فني الصيانة'', ''Maintenance Technician'',
 ''{"production":{"view":true},"inventory":{"view":true},"quality":{"view":false},"maintenance":{"view":true,"create":true,"edit":true},"procurement":{"view":false},"sales":{"view":false},"settings":{"view":false}}''::jsonb, false)
on conflict (code) do nothing;

insert into item_categories (name_ar, name_en) values
(''مواد خام'', ''Raw Materials''),
(''منتجات تامة'', ''Finished Products''),
(''قطع غيار'', ''Spare Parts''),
(''مواد تعبئة'', ''Packaging Materials'')
on conflict do nothing;
'@

# 19 - Auto-profile trigger
Run-SQL "Auto-create user_profile trigger" @'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name_en)
  values (new.id, new.raw_user_meta_data ->> ''full_name'')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
'@

Write-Host "`n===> All done!" -ForegroundColor Yellow
