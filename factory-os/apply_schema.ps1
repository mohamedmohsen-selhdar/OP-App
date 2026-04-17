$token = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$projectId = "qmhgckkqksnxwmxqllkp"
$baseUrl = "https://api.supabase.com/v1/projects/$projectId/database/query"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

function Run-SQL($name, $sql) {
    Write-Host "`n===> Running: $name" -ForegroundColor Cyan
    $body = @{ query = $sql } | ConvertTo-Json -Depth 10
    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "    OK" -ForegroundColor Green
        return $true
    } catch {
        $err = $_.ErrorDetails.Message
        if (-not $err) { $err = $_.Exception.Message }
        Write-Host "    ERROR: $err" -ForegroundColor Red
        return $false
    }
}

# ── MIGRATION 1: Core System Tables ─────────────────────────
$sql1 = @"
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  type text default 'raw_materials',
  is_active boolean default true
);

create table if not exists production_lines (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  capacity_per_shift integer,
  is_active boolean default true
);

create table if not exists machines (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  line_id uuid references production_lines(id),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  status text default 'running',
  last_maintenance timestamptz,
  is_active boolean default true
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  permissions jsonb default '{}',
  can_see_all_branches boolean default false,
  is_active boolean default true
);

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name_ar text,
  full_name_en text,
  role_id uuid references roles(id),
  branch_id uuid references branches(id),
  allowed_branches uuid[] default '{}',
  phone text,
  avatar_url text,
  permission_overrides jsonb default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);
"@
Run-SQL "Core System Tables (branches, warehouses, lines, machines, roles, user_profiles)" $sql1

# ── MIGRATION 2: Inventory Tables ───────────────────────────
$sql2 = @"
create table if not exists item_categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  parent_id uuid references item_categories(id),
  is_active boolean default true
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  category_id uuid references item_categories(id),
  type text default 'raw_material',
  unit text not null,
  unit_price numeric(12,2),
  min_stock numeric(12,2) default 0,
  max_stock numeric(12,2),
  barcode text,
  description text,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id),
  warehouse_id uuid references warehouses(id),
  qty_on_hand numeric(12,2) default 0,
  qty_reserved numeric(12,2) default 0,
  qty_available numeric(12,2) generated always as (qty_on_hand - qty_reserved) stored,
  last_counted timestamptz,
  unique(item_id, warehouse_id)
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id),
  warehouse_id uuid references warehouses(id),
  type text not null,
  qty numeric(12,2) not null,
  ref_type text,
  ref_id uuid,
  notes text,
  created_by uuid references user_profiles(id),
  created_at timestamptz default now()
);
"@
Run-SQL "Inventory Tables (item_categories, items, inventory, stock_movements)" $sql2

# ── MIGRATION 3: BOM & Production Tables ────────────────────
$sql3 = @"
create table if not exists bom_headers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  finished_item_id uuid references items(id),
  version integer default 1,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now()
);

create table if not exists bom_lines (
  id uuid primary key default gen_random_uuid(),
  bom_id uuid references bom_headers(id) on delete cascade,
  item_id uuid references items(id),
  qty_required numeric(12,2) not null,
  unit text,
  notes text
);

create table if not exists production_orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  bom_id uuid references bom_headers(id),
  line_id uuid references production_lines(id),
  planned_qty numeric(12,2) not null,
  actual_qty numeric(12,2) default 0,
  status text default 'draft',
  planned_start date,
  planned_end date,
  actual_start timestamptz,
  actual_end timestamptz,
  notes text,
  created_by uuid references user_profiles(id),
  approved_by uuid references user_profiles(id),
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists production_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references production_orders(id),
  machine_id uuid references machines(id),
  worker_id uuid references user_profiles(id),
  shift text,
  qty_produced numeric(12,2) not null,
  logged_at timestamptz default now(),
  notes text
);
"@
Run-SQL "BOM & Production Tables (bom_headers, bom_lines, production_orders, production_logs)" $sql3

# ── MIGRATION 4: Quality & Maintenance Tables ───────────────
$sql4 = @"
create table if not exists defect_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references production_orders(id),
  machine_id uuid references machines(id),
  inspector_id uuid references user_profiles(id),
  defect_type text not null,
  qty_defective numeric(12,2) not null,
  severity text default 'low',
  status text default 'open',
  root_cause text,
  corrective_action text,
  resolved_at timestamptz,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists downtime_logs (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id),
  reported_by uuid references user_profiles(id),
  reason text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_minutes integer generated always as (
    case when end_time is not null
    then extract(epoch from (end_time - start_time))::integer / 60
    else null end
  ) stored,
  status text default 'open',
  escalated boolean default false,
  notes text,
  is_deleted boolean default false,
  created_at timestamptz default now()
);
"@
Run-SQL "Quality & Maintenance Tables (defect_logs, downtime_logs)" $sql4

# ── MIGRATION 5: Procurement Tables ─────────────────────────
$sql5 = @"
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text,
  phone text,
  email text,
  address text,
  payment_terms text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists purchase_requests (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  requested_by uuid references user_profiles(id),
  branch_id uuid references branches(id),
  status text default 'draft',
  urgency text default 'normal',
  notes text,
  approved_by uuid references user_profiles(id),
  approved_at timestamptz,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists purchase_request_lines (
  id uuid primary key default gen_random_uuid(),
  pr_id uuid references purchase_requests(id) on delete cascade,
  item_id uuid references items(id),
  qty_requested numeric(12,2) not null,
  unit text,
  estimated_price numeric(12,2),
  notes text
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  pr_id uuid references purchase_requests(id),
  supplier_id uuid references suppliers(id),
  status text default 'draft',
  expected_delivery date,
  actual_delivery date,
  total_amount numeric(12,2),
  payment_status text default 'unpaid',
  created_by uuid references user_profiles(id),
  approved_by uuid references user_profiles(id),
  received_at timestamptz,
  notes text,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  po_id uuid references purchase_orders(id) on delete cascade,
  item_id uuid references items(id),
  qty_ordered numeric(12,2) not null,
  qty_received numeric(12,2) default 0,
  unit text,
  unit_price numeric(12,2),
  total_price numeric(12,2) generated always as (qty_ordered * unit_price) stored,
  notes text,
  unique(po_id, item_id)
);
"@
Run-SQL "Procurement Tables (suppliers, purchase_requests, purchase_request_lines, purchase_orders, purchase_order_lines)" $sql5

# ── MIGRATION 6: Sales Tables ────────────────────────────────
$sql6 = @"
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text,
  phone text,
  email text,
  address text,
  credit_limit numeric(12,2),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_id uuid references customers(id),
  status text default 'draft',
  delivery_date date,
  total_amount numeric(12,2),
  notes text,
  created_by uuid references user_profiles(id),
  approved_by uuid references user_profiles(id),
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  so_id uuid references sales_orders(id) on delete cascade,
  item_id uuid references items(id),
  qty_ordered numeric(12,2) not null,
  qty_delivered numeric(12,2) default 0,
  unit_price numeric(12,2),
  total_price numeric(12,2) generated always as (qty_ordered * unit_price) stored,
  notes text
);
"@
Run-SQL "Sales Tables (customers, sales_orders, sales_order_lines)" $sql6

# ── MIGRATION 7: Notifications & Approvals ──────────────────
$sql7 = @"
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  type text not null,
  title_ar text,
  title_en text,
  body_ar text,
  body_en text,
  ref_type text,
  ref_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists approval_logs (
  id uuid primary key default gen_random_uuid(),
  ref_type text not null,
  ref_id uuid not null,
  action text not null,
  actor_id uuid references user_profiles(id),
  notes text,
  created_at timestamptz default now()
);
"@
Run-SQL "Notifications & Approvals Tables" $sql7

Write-Host "`n===> All schema migrations complete!" -ForegroundColor Yellow
