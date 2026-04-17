# 🏭 Manufacturing Mini-ERP — Complete Antigravity IDE Prompt Bible
### Project Codename: **FactoryOS**

---

## 📋 PROJECT SUMMARY (Read Before Starting)

| Parameter | Value |
|---|---|
| Type | Manufacturing / Production ERP |
| Users | 6–20 daily users |
| Language | Arabic + English (user toggle) |
| Theme | Dark / Light (user toggle) |
| Auth | Email + Password (Supabase Auth) |
| Stack | React + Tailwind · Supabase · Claude API · Vercel |
| Mobile | PWA — Android mobile primary |

**Modules:** Production Planning · Inventory & Warehouse · Quality Control · Maintenance & Downtime · Procurement · Sales

**Roles:** Owner/CEO · Factory Manager · Production Supervisor · Quality Inspector · Warehouse Keeper · Maintenance Technician

**AI Agents:** Arabic Command Engine · Stock Alert Agent · Production Optimization Agent

**Integrations:** WhatsApp · Email · Google Sheets

**Reporting:** PDF per record · Excel table export · Live read-only dashboard

---

## ⚙️ HOW TO USE THIS FILE

1. Follow phases **strictly in order** — each builds on the previous
2. Copy each prompt block **exactly** into Antigravity
3. `[CUSTOMIZE]` = replace with your real values
4. Commit to GitHub after every phase — never skip this
5. Test on a real Android phone at the end of each phase

---
---

# ═══════════════════════════════
# PHASE 0 — SUPABASE DATABASE
# ═══════════════════════════════
> Run ALL of Phase 0 in Supabase SQL Editor BEFORE opening Antigravity.
> Supabase Dashboard → SQL Editor → New Query → paste → Run

---

## PROMPT 0.1 — Core System Tables

```sql
-- =====================
-- SYSTEM: BRANCHES & LOCATIONS
-- =====================
create table branches (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table warehouses (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  type text default 'raw_materials', -- raw_materials | wip | finished_goods | spare_parts
  is_active boolean default true
);

create table production_lines (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  capacity_per_shift integer,
  is_active boolean default true
);

create table machines (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  line_id uuid references production_lines(id),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  status text default 'running', -- running | stopped | maintenance
  last_maintenance timestamptz,
  is_active boolean default true
);

-- =====================
-- SYSTEM: USERS & ROLES
-- =====================
create table roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, -- owner | factory_manager | supervisor | quality | warehouse | maintenance
  name_ar text not null,
  name_en text not null,
  permissions jsonb default '{}', -- { module: { view, create, edit, delete, approve } }
  can_see_all_branches boolean default false
);

create table user_profiles (
  id uuid primary key references auth.users(id),
  name_ar text not null,
  name_en text not null,
  email text not null,
  role_id uuid references roles(id),
  branch_id uuid references branches(id), -- primary branch
  allowed_branches uuid[] default '{}', -- override: extra branches this user can access
  permission_overrides jsonb default '{}', -- per-user permission tweaks on top of role
  avatar_color text default '#f59e0b',
  preferred_lang text default 'ar', -- ar | en
  preferred_theme text default 'dark', -- dark | light
  is_active boolean default true,
  created_at timestamptz default now()
);
```

---

## PROMPT 0.2 — Products, Items & BOM

```sql
-- =====================
-- PRODUCTS & MATERIALS
-- =====================
create table item_categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  type text not null -- raw_material | wip | finished_good | spare_part | packaging
);

create table items (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  category_id uuid references item_categories(id),
  unit text not null, -- kg | ltr | pcs | box | roll
  unit_cost numeric(12,2) default 0,
  reorder_level numeric(12,2) default 0,
  max_stock numeric(12,2),
  barcode text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id),
  warehouse_id uuid references warehouses(id),
  qty_on_hand numeric(12,2) default 0,
  qty_reserved numeric(12,2) default 0,
  qty_available numeric(12,2) generated always as (qty_on_hand - qty_reserved) stored,
  last_updated timestamptz default now(),
  unique(item_id, warehouse_id)
);

-- BILL OF MATERIALS (multi-stage)
create table bom_headers (
  id uuid primary key default gen_random_uuid(),
  finished_item_id uuid references items(id),
  version text default 'v1',
  output_qty numeric(12,2) default 1,
  output_unit text,
  stages jsonb default '[]', -- [{stage: 1, name_ar: "خلط", name_en: "Mixing"}]
  is_active boolean default true,
  created_at timestamptz default now()
);

create table bom_lines (
  id uuid primary key default gen_random_uuid(),
  bom_id uuid references bom_headers(id),
  stage integer default 1,
  input_item_id uuid references items(id),
  qty_required numeric(12,2) not null,
  unit text,
  notes text
);
```

---

## PROMPT 0.3 — Production Module

```sql
create table production_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  branch_id uuid references branches(id),
  line_id uuid references production_lines(id),
  bom_id uuid references bom_headers(id),
  finished_item_id uuid references items(id),
  planned_qty numeric(12,2) not null,
  produced_qty numeric(12,2) default 0,
  rejected_qty numeric(12,2) default 0,
  status text default 'draft', -- draft | approved | in_progress | completed | cancelled
  planned_start timestamptz,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  shift text, -- morning | evening | night
  supervisor_id uuid references user_profiles(id),
  approved_by uuid references user_profiles(id),
  approved_at timestamptz,
  notes text,
  raw_command text,
  is_deleted boolean default false,
  created_by uuid references user_profiles(id),
  created_at timestamptz default now()
);

create table production_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references production_orders(id),
  machine_id uuid references machines(id),
  worker_id uuid references user_profiles(id),
  stage integer default 1,
  qty_produced numeric(12,2) default 0,
  qty_rejected numeric(12,2) default 0,
  shift text,
  notes text,
  raw_command text,
  logged_at timestamptz default now()
);
```

---

## PROMPT 0.4 — Quality, Maintenance, Procurement, Sales

```sql
-- QUALITY
create table defect_logs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  machine_id uuid references machines(id),
  production_order_id uuid references production_orders(id),
  item_id uuid references items(id),
  inspector_id uuid references user_profiles(id),
  defect_type text not null,
  qty integer default 1,
  severity text default 'medium', -- low | medium | high | critical
  status text default 'open', -- open | under_review | resolved | rejected
  action_taken text,
  notes text,
  raw_command text,
  is_deleted boolean default false,
  logged_at timestamptz default now()
);

-- MAINTENANCE
create table downtime_logs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  machine_id uuid references machines(id),
  reported_by uuid references user_profiles(id),
  assigned_to uuid references user_profiles(id),
  reason text not null,
  category text default 'breakdown', -- breakdown | planned_maintenance | power | external
  status text default 'open', -- open | in_progress | resolved | escalated
  start_time timestamptz default now(),
  end_time timestamptz,
  duration_minutes integer,
  escalated_at timestamptz,
  escalated_to uuid references user_profiles(id),
  resolution_notes text,
  raw_command text,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

-- PROCUREMENT
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  contact_name text,
  phone text,
  email text,
  payment_terms text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table purchase_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text unique not null,
  branch_id uuid references branches(id),
  requested_by uuid references user_profiles(id),
  approved_by uuid references user_profiles(id),
  status text default 'draft', -- draft | pending_approval | approved | rejected | ordered
  urgency text default 'normal', -- normal | urgent | critical
  needed_by date,
  notes text,
  approved_at timestamptz,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table purchase_request_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references purchase_requests(id),
  item_id uuid references items(id),
  qty_requested numeric(12,2) not null,
  unit text,
  estimated_cost numeric(12,2),
  supplier_id uuid references suppliers(id),
  notes text
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_no text unique not null,
  request_id uuid references purchase_requests(id),
  supplier_id uuid references suppliers(id),
  branch_id uuid references branches(id),
  status text default 'sent', -- sent | partial | received | cancelled
  total_amount numeric(12,2) default 0,
  expected_delivery date,
  received_at timestamptz,
  notes text,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

-- ✅ FIX: Added missing purchase_order_lines table (was missing in original)
create table purchase_order_lines (
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

-- SALES
create table customers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  contact_name text,
  phone text,
  email text,
  credit_limit numeric(12,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table sales_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  branch_id uuid references branches(id),
  customer_id uuid references customers(id),
  sales_rep_id uuid references user_profiles(id),
  status text default 'draft', -- draft | confirmed | in_production | shipped | delivered | cancelled
  delivery_date date,
  total_amount numeric(12,2) default 0,
  notes text,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references sales_orders(id),
  item_id uuid references items(id),
  qty_ordered numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  total_price numeric(12,2) generated always as (qty_ordered * unit_price) stored,
  qty_delivered numeric(12,2) default 0,
  notes text
);
```

---

## PROMPT 0.5 — Warehouse Movements & Notifications

```sql
-- INVENTORY MOVEMENTS
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  item_id uuid references items(id),
  from_warehouse_id uuid references warehouses(id),
  to_warehouse_id uuid references warehouses(id),
  movement_type text not null, -- receipt | issue | transfer | adjustment | production_in | production_out
  qty numeric(12,2) not null,
  reference_type text, -- purchase_order | production_order | sales_order | manual
  reference_id uuid,
  performed_by uuid references user_profiles(id),
  notes text,
  raw_command text,
  moved_at timestamptz default now()
);

-- NOTIFICATIONS & ALERTS
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id),
  type text not null, -- alert | approval_request | escalation | info
  module text, -- production | inventory | maintenance | procurement | quality | sales
  title_ar text,
  title_en text,
  body_ar text,
  body_en text,
  reference_type text,
  reference_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- APPROVAL AUDIT TRAIL
create table approval_logs (
  id uuid primary key default gen_random_uuid(),
  reference_type text not null,
  reference_id uuid not null,
  action text not null, -- submitted | approved | rejected | escalated
  performed_by uuid references user_profiles(id),
  notes text,
  performed_at timestamptz default now()
);
```

---

## PROMPT 0.6 — Seed Data & RLS Policies

```sql
-- SEED: Roles
insert into roles (code, name_ar, name_en, can_see_all_branches, permissions) values
('owner', 'المالك', 'Owner', true, '{"*": {"view": true, "create": true, "edit": true, "delete": true, "approve": true}}'),
('factory_manager', 'مدير المصنع', 'Factory Manager', true, '{"production": {"view": true, "create": true, "edit": true, "approve": true}, "maintenance": {"view": true, "approve": true}, "inventory": {"view": true, "create": true}, "quality": {"view": true, "approve": true}, "procurement": {"view": true, "approve": true}, "sales": {"view": true}}'),
('supervisor', 'مشرف الإنتاج', 'Production Supervisor', false, '{"production": {"view": true, "create": true, "edit": true}, "maintenance": {"view": true, "create": true}, "inventory": {"view": true}}'),
('quality', 'مفتش الجودة', 'Quality Inspector', false, '{"quality": {"view": true, "create": true, "edit": true}, "production": {"view": true}, "inventory": {"view": true}}'),
('warehouse', 'أمين المستودع', 'Warehouse Keeper', false, '{"inventory": {"view": true, "create": true, "edit": true}, "procurement": {"view": true}}'),
('maintenance', 'فني الصيانة', 'Maintenance Technician', false, '{"maintenance": {"view": true, "create": true, "edit": true}, "production": {"view": true}}');

-- SEED: Sample branch
insert into branches (code, name_ar, name_en) values ('BR-01', 'المصنع الرئيسي', 'Main Factory');

-- ✅ FIX: Comprehensive RLS — all tables covered (original was missing many enables & select policies)

-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
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

-- USER PROFILES: own record readable by self; managers readable by managers
create policy "users read own profile" on user_profiles
  for select using (auth.uid() = id);
create policy "managers read all profiles" on user_profiles
  for select using (
    exists (
      select 1 from user_profiles up
      join roles r on r.id = up.role_id
      where up.id = auth.uid() and r.code in ('owner', 'factory_manager')
    )
  );
create policy "users update own profile" on user_profiles
  for update using (auth.uid() = id);

-- ROLES
create policy "read roles" on roles for select using (auth.uid() is not null);

-- LOOKUP TABLES: all authenticated users can read
create policy "read branches" on branches for select using (auth.uid() is not null);
create policy "read warehouses" on warehouses for select using (auth.uid() is not null);
create policy "read production_lines" on production_lines for select using (auth.uid() is not null);
create policy "read machines" on machines for select using (auth.uid() is not null);
create policy "update machines" on machines for update using (auth.uid() is not null);
create policy "read item_categories" on item_categories for select using (auth.uid() is not null);
create policy "read items" on items for select using (auth.uid() is not null);
create policy "insert items" on items for insert with check (auth.uid() is not null);
create policy "update items" on items for update using (auth.uid() is not null);
create policy "read suppliers" on suppliers for select using (auth.uid() is not null);
create policy "read customers" on customers for select using (auth.uid() is not null);
create policy "read bom_headers" on bom_headers for select using (auth.uid() is not null);
create policy "read bom_lines" on bom_lines for select using (auth.uid() is not null);

-- INVENTORY
create policy "read inventory" on inventory for select using (auth.uid() is not null);
create policy "insert inventory" on inventory for insert with check (auth.uid() is not null);
create policy "update inventory" on inventory for update using (auth.uid() is not null);

-- STOCK MOVEMENTS
create policy "read movements" on stock_movements for select using (auth.uid() is not null);
create policy "insert movements" on stock_movements for insert with check (auth.uid() is not null);

-- PRODUCTION ORDERS & LOGS
create policy "read production orders" on production_orders for select using (auth.uid() is not null);
create policy "insert production orders" on production_orders for insert with check (auth.uid() is not null);
create policy "update production orders" on production_orders for update using (auth.uid() is not null);
create policy "read production logs" on production_logs for select using (auth.uid() is not null);
create policy "insert production logs" on production_logs for insert with check (auth.uid() is not null);

-- QUALITY & MAINTENANCE
create policy "read defect logs" on defect_logs for select using (auth.uid() is not null);
create policy "insert defect logs" on defect_logs for insert with check (auth.uid() is not null);
create policy "update defect logs" on defect_logs for update using (auth.uid() is not null);
create policy "read downtime logs" on downtime_logs for select using (auth.uid() is not null);
create policy "insert downtime logs" on downtime_logs for insert with check (auth.uid() is not null);
create policy "update downtime logs" on downtime_logs for update using (auth.uid() is not null);

-- PROCUREMENT
create policy "read purchase requests" on purchase_requests for select using (auth.uid() is not null);
create policy "insert purchase requests" on purchase_requests for insert with check (auth.uid() is not null);
create policy "update purchase requests" on purchase_requests for update using (auth.uid() is not null);
create policy "read pr lines" on purchase_request_lines for select using (auth.uid() is not null);
create policy "insert pr lines" on purchase_request_lines for insert with check (auth.uid() is not null);
create policy "read purchase orders" on purchase_orders for select using (auth.uid() is not null);
create policy "insert purchase orders" on purchase_orders for insert with check (auth.uid() is not null);
create policy "update purchase orders" on purchase_orders for update using (auth.uid() is not null);
create policy "read po lines" on purchase_order_lines for select using (auth.uid() is not null);
create policy "insert po lines" on purchase_order_lines for insert with check (auth.uid() is not null);

-- SALES
create policy "read sales orders" on sales_orders for select using (auth.uid() is not null);
create policy "insert sales orders" on sales_orders for insert with check (auth.uid() is not null);
create policy "update sales orders" on sales_orders for update using (auth.uid() is not null);
create policy "read sales lines" on sales_order_lines for select using (auth.uid() is not null);
create policy "insert sales lines" on sales_order_lines for insert with check (auth.uid() is not null);

-- NOTIFICATIONS: users see only their own
create policy "users see own notifications" on notifications
  for select using (user_id = auth.uid());
create policy "insert notifications" on notifications
  for insert with check (auth.uid() is not null);
create policy "update own notifications" on notifications
  for update using (user_id = auth.uid());

-- APPROVAL LOGS
create policy "read approval logs" on approval_logs for select using (auth.uid() is not null);
create policy "insert approval logs" on approval_logs for insert with check (auth.uid() is not null);

-- ENABLE REALTIME ON KEY TABLES
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table production_orders;
alter publication supabase_realtime add table downtime_logs;
alter publication supabase_realtime add table inventory;
alter publication supabase_realtime add table machines;
```

---

## PROMPT 0.7 — Supabase Edge Functions: Secure API Proxy

```
🔐 SECURITY-CRITICAL — Deploy these 3 Edge Functions BEFORE building the frontend.
They keep Claude, WhatsApp, and Resend API keys server-side and out of the browser bundle.

SETUP (run in terminal from project root):
  supabase login
  supabase link --project-ref YOUR_PROJECT_REF
  supabase functions new ai-proxy
  supabase functions new whatsapp-proxy
  supabase functions new resend-proxy

=== supabase/functions/ai-proxy/index.ts ===
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { messages, system, model } = await req.json();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model ?? "claude-sonnet-4-5", // check docs.anthropic.com for latest model ID
      max_tokens: 1024,
      system,
      messages,
    }),
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
});

=== supabase/functions/whatsapp-proxy/index.ts ===
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { to, templateName, parameters, lang } = await req.json();
  const phoneId = Deno.env.get("WHATSAPP_PHONE_ID")!;
  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("WHATSAPP_TOKEN")!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: lang === "ar" ? "ar" : "en_US" },
        components: [{
          type: "body",
          parameters: parameters.map((p: string) => ({ type: "text", text: p })),
        }],
      },
    }),
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
});

=== supabase/functions/resend-proxy/index.ts ===
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const payload = await req.json();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
});

SET SECRETS (run once in terminal):
  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
  supabase secrets set WHATSAPP_TOKEN=your_meta_bearer_token
  supabase secrets set WHATSAPP_PHONE_ID=your_phone_number_id
  supabase secrets set RESEND_API_KEY=re_...

DEPLOY:
  supabase functions deploy ai-proxy
  supabase functions deploy whatsapp-proxy
  supabase functions deploy resend-proxy

HOW THE FRONTEND CALLS THESE (use this pattern in claude.js / whatsapp.js / emailNotifications.js):
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ system, messages }),
  });
  const data = await res.json();
```

---
---

# ═══════════════════════════════
# PHASE 1 — PROJECT SCAFFOLD
# ═══════════════════════════════

---

## PROMPT 1.1 — Initialize Project

```
Create a new React + Vite + Tailwind CSS project called "factory-os".

DEPENDENCIES TO INSTALL:
- @supabase/supabase-js
- react-router-dom
- @tanstack/react-query
- react-hook-form
- date-fns
- lucide-react (icons)
- recharts (charts for dashboard)
- jspdf + jspdf-autotable (PDF export)
- xlsx (Excel export)
- i18next + react-i18next (Arabic/English translations)
- @zxing/browser @zxing/library (barcode scanner — see PROMPT 12.2)

ENV FILE (.env):
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# ⚠️ SECURITY — The 3 keys below are SERVER-SIDE ONLY.
# They must NEVER be prefixed with VITE_ — doing so embeds them in the browser bundle.
# Set them as Supabase Edge Function secrets via the CLI (see Phase 0.7):
#   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
#   supabase secrets set WHATSAPP_TOKEN=your_meta_bearer_token
#   supabase secrets set WHATSAPP_PHONE_ID=your_phone_number_id
#   supabase secrets set RESEND_API_KEY=re_...
# The frontend never calls Anthropic / Meta / Resend directly — it calls the Edge Function proxy.

GLOBAL CSS (index.css):
- Import Google Fonts: Cairo (Arabic) + Inter (English)
- CSS variables for both dark and light themes:
  --bg-primary, --bg-secondary, --bg-card
  --text-primary, --text-secondary
  --accent (amber #f59e0b), --accent-dark (#d97706)
  --danger (#ef4444), --success (#22c55e), --warning (#f97316)
- Dark theme: bg-primary = #0f172a, bg-secondary = #1e293b, bg-card = #1e293b
- Light theme: bg-primary = #f8fafc, bg-secondary = #ffffff, bg-card = #ffffff
- Apply Cairo font when lang=ar, Inter when lang=en
- Root element: font-family based on lang attribute

Add .gitignore that excludes .env
```

---

## PROMPT 1.2 — Folder Structure

```
Create this complete folder and file structure with empty placeholder exports:

/src
  /lib
    supabase.js
    claude.js              ← calls ai-proxy Edge Function (see Phase 0.7)
    i18n.js
    permissions.js
    offlineQueue.js
    exportUtils.js         ← PDF + Excel helpers
    whatsapp.js            ← calls whatsapp-proxy Edge Function (see Phase 0.7)
    emailNotifications.js  ← calls resend-proxy Edge Function (see Phase 0.7)
    googleSheets.js        ← calls google-sheets-proxy Edge Function (see PROMPT 10.3)
  /supabase
    /functions
      /ai-proxy
        index.ts           ← Claude proxy (full code in Phase 0.7)
      /whatsapp-proxy
        index.ts           ← WhatsApp proxy (full code in Phase 0.7)
      /resend-proxy
        index.ts           ← Resend email proxy (full code in Phase 0.7)
      /google-sheets-proxy
        index.ts           ← Google Sheets export proxy (full code in PROMPT 10.3)
  /hooks
    useAuth.js
    usePermissions.js
    useOffline.js
    useNotifications.js
    useTranslation.js      ← wraps i18next
  /context
    AuthContext.jsx
    ThemeContext.jsx
    LangContext.jsx
  /components
    /layout
      AppShell.jsx          ← main layout wrapper with sidebar
      Sidebar.jsx
      TopBar.jsx
      BottomNav.jsx         ← mobile only
    /ui
      Button.jsx
      Input.jsx
      Select.jsx
      Modal.jsx
      Toast.jsx
      Badge.jsx
      Avatar.jsx
      Spinner.jsx
      ConfirmDialog.jsx
      ColorDot.jsx          ← colored status indicator
      Tooltip.jsx
      BarcodeScanner.jsx    ← camera scanner (see PROMPT 12.2)
    /views
      TableView.jsx
      KanbanView.jsx
      CalendarView.jsx
      DetailView.jsx
      GalleryView.jsx
    /forms
      DynamicField.jsx      ← field with conditional show/hide/required logic
      FormBuilder.jsx
    /ai
      CommandInput.jsx
      VoiceButton.jsx
      ConfirmCommandCard.jsx
      AgentPanel.jsx
  /screens
    /auth
      LoginScreen.jsx
    /dashboard
      DashboardScreen.jsx
    /production
      ProductionScreen.jsx
      ProductionOrderDetail.jsx
    /inventory
      InventoryScreen.jsx
      StockMovementDetail.jsx
    /quality
      QualityScreen.jsx
    /maintenance
      MaintenanceScreen.jsx
    /procurement
      ProcurementScreen.jsx
    /sales
      SalesScreen.jsx
    /settings
      SettingsScreen.jsx
      UsersScreen.jsx
      RolesScreen.jsx
  /agents
    stockAlertAgent.js
    productionOptAgent.js
    arabicCommandAgent.js
  App.jsx
  main.jsx
  routes.jsx
```

---

## PROMPT 1.3 — Routing & App Shell

```
Build App.jsx and routes.jsx:

ROUTES:
/login                    → LoginScreen (public)
/dashboard                → DashboardScreen (protected)
/production               → ProductionScreen (protected)
/production/:id           → ProductionOrderDetail (protected)
/inventory                → InventoryScreen (protected)
/quality                  → QualityScreen (protected)
/maintenance              → MaintenanceScreen (protected)
/procurement              → ProcurementScreen (protected)
/sales                    → SalesScreen (protected)
/settings                 → SettingsScreen (protected, owner/manager only)
/settings/users           → UsersScreen (protected, owner only)
/settings/roles           → RolesScreen (protected, owner only)

PROTECTION: Wrap all non-login routes with an AuthGuard component:
- Reads user from AuthContext
- If not logged in → redirect to /login
- If logged in but no permission for this module → show "غير مصرح / Not Authorized" screen

AppShell wraps all protected screens and renders:
- Sidebar (desktop: always visible left sidebar)
- TopBar (mobile: top bar with menu toggle)
- BottomNav (mobile only, fixed bottom)
- Main content area
- Toast notification stack
- Global command input floating button (🎤 bottom-right FAB)
```

---
---

# ═══════════════════════════════
# PHASE 2 — AUTH & PERMISSIONS
# ═══════════════════════════════

---

## PROMPT 2.1 — AuthContext & Login Screen

```
Build the complete authentication system:

/src/context/AuthContext.jsx:
- Use Supabase Auth (email + password)
- On mount: call supabase.auth.getSession() and supabase.auth.onAuthStateChange()
- When session exists: fetch user_profiles record joined with roles using auth.user.id
- Store in context: { user, profile, role, permissions, isLoading, login, logout }
- login(email, password): calls supabase.auth.signInWithPassword
- logout(): calls supabase.auth.signOut + clear local state

LoginScreen.jsx:
DESIGN:
- Full screen, dark background
- Centered card (max-width 400px)
- Logo: 🏭 + "FactoryOS" large, amber
- Subtitle switches between Arabic/English based on browser language
- Email input + Password input (show/hide toggle)
- "تسجيل الدخول / Sign In" button (amber, full width)
- Language toggle at top right: AR | EN
- Error states in Arabic and English

BEHAVIOR:
- Show spinner during auth
- On success: navigate to /dashboard
- On error: show specific error message (wrong password / email not found)
- Remember last email in localStorage
```

---

## PROMPT 2.2 — Permissions System

```
Build /src/lib/permissions.js:

This is the central permission engine. It controls what every user can do.

PERMISSION STRUCTURE (from roles table):
{
  "production": { "view": true, "create": true, "edit": true, "delete": false, "approve": false },
  "inventory": { "view": true, "create": false },
  "*": { ... }   ← owner wildcard
}

FUNCTIONS TO EXPORT:

1. canDo(profile, module, action) → boolean
   - Check role permissions first
   - Then apply permission_overrides from user_profiles (can add OR remove permissions)
   - Owner with "*" wildcard returns true for everything

2. canSeeBranch(profile, branchId) → boolean
   - If role.can_see_all_branches → true
   - Else check profile.branch_id === branchId OR branchId in profile.allowed_branches

3. filterByBranch(profile, records) → filtered records
   - Filters an array of records by accessible branch_ids

4. getAccessibleBranches(profile, allBranches) → branches[]

Build /src/hooks/usePermissions.js:
- Wraps the above functions with the current user profile from AuthContext
- Exposes: { can, canSeeBranch, accessibleBranches }
- Usage: const { can } = usePermissions(); can('production', 'create')
```

---
---

# ═══════════════════════════════
# PHASE 3 — UI SYSTEM
# ═══════════════════════════════

---

## PROMPT 3.1 — Theme & Language System

```
Build the theme and language toggle system:

/src/context/ThemeContext.jsx:
- Stores theme: 'dark' | 'light' in localStorage + state
- On mount: read from localStorage, apply to document.documentElement class
- Dark: add class 'dark' to html element
- Light: remove class 'dark'
- Expose: { theme, toggleTheme }

/src/context/LangContext.jsx:
- Stores lang: 'ar' | 'en' in localStorage + state
- On change: update document.documentElement.lang and document.documentElement.dir
- ar → dir="rtl", lang="ar", font-family: Cairo
- en → dir="ltr", lang="en", font-family: Inter
- Expose: { lang, toggleLang, isRTL }

/src/lib/i18n.js:
Set up i18next with two language files:
- /src/locales/ar.json — all Arabic strings
- /src/locales/en.json — all English strings

Key translation keys to include:
modules: production, inventory, quality, maintenance, procurement, sales, dashboard, settings
actions: save, cancel, delete, edit, view, approve, reject, submit, confirm, back
status: draft, approved, in_progress, completed, cancelled, open, resolved
fields: name, code, quantity, date, notes, status, branch, machine, worker
messages: saved_successfully, error_occurred, confirm_delete, no_data, loading, unauthorized
```

---

## PROMPT 3.2 — Core UI Components

```
Build the following reusable components in /src/components/ui/:

1. Button.jsx
Props: variant (primary|secondary|danger|ghost), size (sm|md|lg), loading, disabled, icon, children
- primary: amber bg, dark text
- danger: red bg, white text  
- RTL-aware icon placement

2. Input.jsx
Props: label, labelAr, labelEn, type, value, onChange, error, required, disabled, placeholder
- Shows label in current language
- Red border + error message on validation failure
- RTL-aware padding

3. Badge.jsx
Props: status, size
Status color map:
- draft → gray
- approved / completed / resolved → green
- in_progress / open → amber
- cancelled / rejected → red
- critical / escalated → red pulsing

4. ColorDot.jsx
A small colored circle indicating status — used in table rows
Same color map as Badge

5. Modal.jsx
Props: isOpen, onClose, title, children, size (sm|md|lg|fullscreen)
- Backdrop blur
- RTL-aware title + close button placement
- Trap focus when open
- Mobile: slides up from bottom (sheet style)

6. ConfirmDialog.jsx
Props: isOpen, onConfirm, onCancel, message, messageAr, confirmLabel, danger
- Used for all destructive actions
- Shows spinner during confirm action

7. Toast.jsx (global)
- Position: top-center
- Types: success (green), error (red), warning (amber), info (blue)
- Auto-dismiss after 3 seconds
- RTL-aware text direction
- Export: showToast(message, type) utility function
```

---

## PROMPT 3.3 — Five View Components

```
Build the 5 view types in /src/components/views/:

All 5 views accept the same core props:
- data: array of records
- columns: array of column definitions { key, labelAr, labelEn, type, width, colorRule }
- onRowClick(record): open detail view
- onEdit(record): open edit modal
- actions: array of { labelAr, labelEn, icon, onClick, permission, condition }
- isLoading: boolean
- emptyMessage: { ar, en }

1. TableView.jsx
- Sortable columns (click header to sort)
- Sticky header
- Row striping (alternating subtle bg)
- Inline ColorDot for status columns
- Calculated fields displayed with bold amber color
- Locked rows shown with 🔒 icon and reduced opacity
- Mobile: horizontal scroll with fixed first column

2. KanbanView.jsx
- Columns = distinct status values from data
- Cards draggable between columns (drag updates record status via callback)
- Card shows: title, assigned user avatar, date, colored badge
- Column header shows count + total if numeric field specified
- Mobile: horizontal scroll between columns

3. CalendarView.jsx
- Month grid view
- Dots on dates that have records
- Click date → show list of records for that day
- Records colored by status
- Navigate prev/next month
- Used for: production orders (planned_start), maintenance schedules

4. DetailView.jsx
- Full screen overlay for a single record
- Header: record title + status badge + action buttons
- Sections: auto-generated from column definitions
- Sub-tables: related records (e.g. BOM lines under production order)
- Activity timeline at bottom (approval_logs for this record)
- Floating action bar on mobile

5. GalleryView.jsx
- Grid of cards (2 cols mobile, 3 cols tablet)
- Each card: icon/emoji based on type + name + status badge + key metric
- Tap → opens DetailView
- Used for: machines, items, suppliers, customers
```

---
---

# ═══════════════════════════════
# PHASE 4 — CONDITIONAL LOGIC ENGINE
# ═══════════════════════════════

---

## PROMPT 4.1 — Dynamic Field & Conditional Rules

```
Build DynamicField.jsx and the conditional logic engine:

CONCEPT: Every field in a form can have rules that control:
- visibility (show/hide based on other field values)
- required (become required based on conditions)
- color (highlight if value meets threshold)
- locked (read-only after status change)

RULE SCHEMA (stored in column definitions):
{
  showIf: { field: "status", operator: "equals", value: "in_progress" },
  requiredIf: { field: "category", operator: "equals", value: "breakdown" },
  colorRules: [
    { operator: "lt", value: 10, color: "red" },       ← qty < 10 → red
    { operator: "lt", value: 50, color: "amber" },      ← qty < 50 → amber
    { operator: "gte", value: 50, color: "green" }
  ],
  lockedWhen: ["completed", "cancelled"]               ← lock field when record is these statuses
}

DynamicField.jsx:
Props: fieldDef (column definition), value, onChange, formValues (all current form field values), recordStatus

BEHAVIOR:
1. Evaluate showIf against formValues → if false, render null
2. Evaluate requiredIf against formValues → add required validation
3. Apply colorRules to current value → apply text/border color class
4. If recordStatus in lockedWhen → render as disabled read-only text

OPERATORS: equals | not_equals | gt | gte | lt | lte | contains | is_empty | is_not_empty

Build a helper: evaluateRule(rule, formValues) → boolean
```

---

## PROMPT 4.2 — Calculated Fields

```
Add calculated field support to the form and table systems:

CALCULATED FIELD DEFINITION in column schema:
{
  key: "total_cost",
  type: "calculated",
  formula: "qty * unit_cost",
  dependencies: ["qty", "unit_cost"],
  format: "currency",
  labelAr: "التكلفة الإجمالية",
  labelEn: "Total Cost"
}

BUILD: /src/lib/calculatedFields.js

Functions:
1. evaluateFormula(formula, fieldValues) → number
   - Parse formula string safely (NO eval — use a simple expression parser)
   - Support: +, -, *, /, parentheses, field references by name
   - Return null if any dependency is missing or non-numeric

2. applyCalculations(formValues, columnDefs) → enrichedFormValues
   - For every calculated column, compute value and add to formValues
   - Recalculate when any dependency changes

3. formatCalculatedValue(value, format) → string
   - currency → "1,234.50 ج.م"
   - percentage → "23.5%"
   - integer → "1,234"
   - decimal → "12.34"

INTEGRATION:
- In TableView: calculated columns auto-computed on each row, displayed amber bold
- In DynamicField: type="calculated" fields are always read-only, update live as other fields change
- In forms: use useEffect with dependencies array to trigger recalculation
```

---
---

# ═══════════════════════════════
# PHASE 5 — MODULE SCREENS
# ═══════════════════════════════

---

## PROMPT 5.1 — Production Module

```
Build ProductionScreen.jsx and ProductionOrderDetail.jsx:

ProductionScreen.jsx:
- Top: module title "الإنتاج / Production" + branch selector (filtered by user access) + "أمر إنتاج جديد" button (if has create permission)
- View toggle: Table | Kanban | Calendar (icons, top right)
- Filters bar: branch, line, status, date range, shift
- Table columns:
  { key: "order_no", labelAr: "رقم الأمر", labelEn: "Order No" }
  { key: "finished_item", labelAr: "المنتج", labelEn: "Product" }
  { key: "planned_qty", labelAr: "الكمية المطلوبة", labelEn: "Planned Qty" }
  { key: "produced_qty", labelAr: "المنتج فعلياً", labelEn: "Produced Qty" }
  { key: "completion_pct", type: "calculated", formula: "(produced_qty / planned_qty) * 100", labelAr: "نسبة الإنجاز %", colorRules: [{operator: "lt", value: 50, color: "red"}, {operator: "lt", value: 90, color: "amber"}, {operator: "gte", value: 90, color: "green"}] }
  { key: "status", type: "badge" }
  { key: "planned_start", type: "date" }
  { key: "supervisor", labelAr: "المشرف", labelEn: "Supervisor" }

Kanban: columns = [draft, approved, in_progress, completed, cancelled]

Calendar: events = production orders by planned_start date

NEW ORDER FORM fields (with conditional rules):
- branch_id (required)
- line_id (required, filtered by branch)
- bom_id (required → auto-loads finished_item_id)
- planned_qty (required, numeric)
- planned_start + planned_end (date/time)
- shift (required): morning | evening | night
- supervisor_id (required)
- notes (optional)
- showIf rule: bom lines table only shows after bom_id is selected

APPROVAL FLOW:
- Status: draft → [submit for approval] → pending_approval → [approve/reject by manager] → approved → [start] → in_progress → [complete] → completed
- Buttons shown based on status + permissions
- On approve: insert into approval_logs, send notification to supervisor

AUTO-STATUS: When produced_qty >= planned_qty → auto-set status to 'completed' via Supabase trigger or client-side check on log submission
```

---

## PROMPT 5.2 — Inventory & Warehouse Module

```
Build InventoryScreen.jsx with 3 sub-tabs: Stock Levels | Movements | Items

SUB-TAB 1: Stock Levels
Table columns:
  { key: "item_code", labelAr: "الكود", labelEn: "Code" }
  { key: "item_name", labelAr: "الصنف", labelEn: "Item" }
  { key: "warehouse", labelAr: "المستودع", labelEn: "Warehouse" }
  { key: "qty_on_hand", labelAr: "الكمية الفعلية", labelEn: "On Hand" }
  { key: "qty_reserved", labelAr: "محجوز", labelEn: "Reserved" }
  { key: "qty_available", labelAr: "المتاح", labelEn: "Available", colorRules: [
    { operator: "lte", value: "reorder_level", color: "red" },
    { operator: "lte", value: "reorder_level * 1.2", color: "amber" }
  ]}
  { key: "reorder_level", labelAr: "حد إعادة الطلب", labelEn: "Reorder Level" }

- Red rows = stock at or below reorder level (whole row highlighted)
- Action: "تسجيل حركة / Record Movement" button per row

SUB-TAB 2: Movements (stock_movements table)
Table: date, item, movement_type (colored badge), qty, from_warehouse, to_warehouse, performed_by

MOVEMENT FORM (modal):
  - movement_type (receipt | issue | transfer | adjustment)
  - item_id (searchable select)
  - qty (required, positive)
  - from_warehouse / to_warehouse (conditional: transfer shows both, receipt shows only to)
  - reference_type + reference_id (optional link to order)
  - On save: update inventory table (increment/decrement qty_on_hand)

SUB-TAB 3: Items (Gallery View)
- Item cards: code, name, category badge, current total stock across all warehouses
- Filter by category type
- Add/Edit item form with all fields
- BOM viewer: if item has a BOM, show stages and input materials
```

---

## PROMPT 5.3 — Quality Control Module

```
Build QualityScreen.jsx:

Table columns:
  { key: "logged_at", type: "datetime", labelAr: "وقت التسجيل" }
  { key: "machine", labelAr: "الماكينة" }
  { key: "item_name", labelAr: "الصنف" }
  { key: "defect_type", labelAr: "نوع العطلة" }
  { key: "qty", labelAr: "الكمية" }
  { key: "severity", type: "badge", labelAr: "الخطورة", colorMap: { low: "green", medium: "amber", high: "orange", critical: "red" } }
  { key: "status", type: "badge" }
  { key: "inspector", labelAr: "المفتش" }

NEW DEFECT FORM:
  Fields: machine_id, production_order_id (optional), item_id, defect_type (select or free text), qty, severity, notes
  Conditional: if severity = "critical" → action_taken field becomes REQUIRED
  Locked: all fields locked when status = "resolved" or "rejected"

WORKFLOW:
  open → [review by quality manager] → under_review → [resolve/reject] → resolved | rejected
  If severity = "critical": auto-escalate → create notification for factory manager

STATS HEADER (above table):
  4 KPI cards: Total Today | Open | Critical | Resolved Rate %
```

---

## PROMPT 5.4 — Maintenance & Downtime Module

```
Build MaintenanceScreen.jsx:

Table columns:
  { key: "machine", labelAr: "الماكينة" }
  { key: "reason", labelAr: "السبب" }
  { key: "category", type: "badge", labelAr: "النوع" }
  { key: "status", type: "badge" }
  { key: "start_time", type: "datetime" }
  { key: "duration_minutes", labelAr: "المدة (دقيقة)", colorRules: [
    { operator: "gt", value: 120, color: "red" },
    { operator: "gt", value: 60, color: "amber" }
  ]}
  { key: "assigned_to", labelAr: "المسؤول" }

NEW DOWNTIME FORM:
  Fields: machine_id (required), reason (required), category, assigned_to
  Conditional: category = "planned_maintenance" → show scheduled_date field
  Conditional: category = "breakdown" → reason becomes required + urgency field shows

ESCALATION LOGIC (client-side + Supabase Edge Function):
  - When a downtime log's duration exceeds 120 minutes and status is still "open" or "in_progress":
    auto-update status to "escalated"
    create notification for factory_manager role users
    set escalated_at and escalated_to fields
  - Implement via Supabase scheduled function OR check on every page load for open logs > 2hrs

RESOLUTION FLOW:
  open → in_progress → resolved
  On resolve: set end_time = now(), calculate duration_minutes = (end_time - start_time) / 60
  Update machine.status back to 'running'

MACHINE STATUS VIEW (Gallery sub-tab):
  All machines as cards with live status dot: 🟢 running | 🔴 stopped | 🟡 maintenance
  Real-time via Supabase Realtime subscription on machines table
```

---

## PROMPT 5.5 — Procurement Module

```
Build ProcurementScreen.jsx with 2 sub-tabs: Requests | Orders

SUB-TAB 1: Purchase Requests
Table: request_no, branch, requested_by, status (badge), urgency (badge), needed_by, total_estimated_cost (calculated from lines)

NEW REQUEST FORM:
  Header fields: branch_id, urgency, needed_by, notes
  Line items sub-form (repeatable rows):
    - item_id (searchable), qty_requested, unit, estimated_cost, supplier_id
    - calculated field per line: line_total = qty_requested * estimated_cost
    - calculated field in footer: grand_total = sum of all line_total
  Conditional: urgency = "critical" → needed_by becomes required

APPROVAL WORKFLOW:
  draft → [submit] → pending_approval → [approve by manager] → approved → [convert to PO] → ordered
  On submit: notify all users with approve permission on procurement module
  On approve: insert approval_log entry

SUB-TAB 2: Purchase Orders (po_no, supplier, status, total, expected_delivery)
  Convert approved request → PO with one click
  PO status: sent → partial → received
  On receive: trigger stock_movement (receipt type) for each line item → update inventory
```

---

## PROMPT 5.6 — Sales Module

```
Build SalesScreen.jsx with 2 sub-tabs: Orders | Customers

SUB-TAB 1: Sales Orders
Table: order_no, customer, status (badge), delivery_date, total_amount, fulfillment_pct (calculated)

NEW ORDER FORM:
  Header: customer_id, delivery_date, branch_id, notes
  Line items (repeatable):
    - item_id (searchable, only finished_goods type)
    - qty_ordered, unit_price
    - line_total = qty_ordered * unit_price (calculated, read-only)
    - Check available stock live: if qty_ordered > qty_available → show warning (amber)
  Footer: grand_total = sum of all line_total

STATUS FLOW:
  draft → confirmed → [link to production order] → in_production → shipped → delivered

Conditional: status = "shipped" → actual_ship_date field becomes required and visible

SUB-TAB 2: Customers (Gallery view)
  Customer cards: name, total orders count, last order date, outstanding balance
  Add/Edit customer form
```

---
---

# ═══════════════════════════════
# PHASE 6 — DASHBOARD & KPIs
# ═══════════════════════════════

---

## PROMPT 6.1 — Dashboard Screen

```
Build DashboardScreen.jsx — the home screen for all users:

LAYOUT: 
- Top: greeting in Arabic/English + date + branch selector
- KPI row (4 cards, horizontal scroll on mobile):
  1. Today's Production (sum produced_qty for today)
  2. Open Defects (count defect_logs where status='open')  
  3. Machines Down (count machines where status='stopped' or 'maintenance')
  4. Pending Approvals (count requests pending this user's approval)

- Charts row (recharts):
  1. Production trend - line chart last 7 days (daily produced_qty)
  2. Defects by severity - bar chart (last 30 days)
  3. Stock levels - horizontal bar for top 10 low-stock items

- Recent Activity feed: last 20 entries across all modules (union query), grouped by module with icon

- Alerts panel: stock below reorder level + open downtimes > 2hrs + pending approvals
  Each alert has: icon, message in current language, "view" link → relevant module

PERMISSIONS: KPI cards and sections only shown if user has view permission for that module.

Owner/Manager sees all. Supervisor sees only production + maintenance. etc.

LIVE UPDATES: Subscribe to notifications table via Supabase Realtime — new notifications appear in alerts panel live.
```

---

## PROMPT 6.2 — Live Read-Only Dashboard (Shared Link)

```
Build a public read-only dashboard at route /share/:token

PURPOSE: Owner generates a share link that anyone can open (no login required) to monitor live KPIs.

IMPLEMENTATION:
1. In SettingsScreen: "Generate Share Link" button
   - Generate a random token, store in localStorage as "dashboard_share_token"
   - Display the full URL: https://yourapp.vercel.app/share/TOKEN
   - "Copy Link" + "Revoke Link" buttons

2. /share/:token route (public, no AuthGuard):
   - Read token from URL params
   - Compare to stored token (via a public Supabase table: share_tokens)
   - If valid: show read-only dashboard with:
     - No edit/create/delete buttons
     - Live KPIs refreshing every 30 seconds
     - "Live 🔴" indicator showing it's real-time
     - Branded header: "FactoryOS — Live Dashboard"
   - If invalid token: show "رابط غير صالح / Invalid Link"

3. Create share_tokens table:
   create table share_tokens (
     id uuid primary key default gen_random_uuid(),
     token text unique not null,
     created_by uuid references user_profiles(id),
     is_active boolean default true,
     created_at timestamptz default now()
   );
   alter table share_tokens enable row level security;
   create policy "public can read active tokens" on share_tokens for select using (is_active = true);
```

---
---

# ═══════════════════════════════
# PHASE 7 — WORKFLOW & AUTOMATION ENGINE
# ═══════════════════════════════

---

## PROMPT 7.1 — Approval Chain System

```
Build a reusable approval engine used across procurement, production orders, and defect escalations:

/src/lib/approvalEngine.js

Functions:

1. submitForApproval(referenceType, referenceId, submittedBy, notifyRoles)
   - Update record status to 'pending_approval'
   - Insert approval_log entry: { action: 'submitted', performed_by: submittedBy }
   - Create notification for each user with the notifyRoles that has approve permission
   - Returns: { success, error }

2. approveRecord(referenceType, referenceId, approvedBy, nextStatus, notes)
   - Update record status to nextStatus (e.g. 'approved')
   - Set approved_by + approved_at fields
   - Insert approval_log entry: { action: 'approved' }
   - Create success notification for the original submitter
   - Returns: { success, error }

3. rejectRecord(referenceType, referenceId, rejectedBy, notes)
   - Update record status to 'rejected'  
   - Insert approval_log entry: { action: 'rejected', notes }
   - Create notification for the submitter with rejection notes
   - Returns: { success, error }

4. getApprovalHistory(referenceType, referenceId)
   - Fetch all approval_log entries for this record
   - Join with user_profiles for approver names
   - Returns sorted array for timeline display

INTEGRATION: Use these functions in all module forms when status change buttons are clicked.
```

---

## PROMPT 7.2 — Auto-Status & Escalation Engine

```
Build the automation engine that runs on the client side:

/src/lib/automationEngine.js

AUTOMATION 1: Production order auto-complete
- When production_log is submitted and sum(produced_qty) for an order >= planned_qty:
  - Auto-update order status to 'completed'
  - Set actual_end = now()
  - Show toast: "✅ تم اكتمال أمر الإنتاج / Production Order Completed"
  - Create notification for factory_manager

AUTOMATION 2: Stock below reorder level alert
- After every stock_movement insert:
  - Re-fetch the affected item's inventory
  - If qty_available <= reorder_level: create notification (type: 'alert', module: 'inventory')
  - If qty_available <= 0: create CRITICAL notification
  - This also triggers the Stock Alert Agent (see Phase 9)

AUTOMATION 3: Downtime escalation
- Run a check every 5 minutes (setInterval) on the client:
  - Fetch all downtime_logs where status in ('open', 'in_progress') and start_time < now - 2 hours
  - For each: update status to 'escalated', set escalated_at, notify factory_manager users
  - Show persistent amber banner: "⚠️ ماكينة [X] متوقفة منذ أكثر من ساعتين"

AUTOMATION 4: Critical defect auto-escalation  
- On new defect_log INSERT where severity = 'critical':
  - Immediately create notification for factory_manager
  - Display urgent toast regardless of current screen

Build a useAutomation() hook that initializes all automations when the app loads and the user is authenticated.
```

---
---

# ═══════════════════════════════
# PHASE 8 — ARABIC COMMAND ENGINE
# ═══════════════════════════════

---

## PROMPT 8.1 — Multi-Module Arabic Command Parser

```
Build the complete Arabic command engine in /src/agents/arabicCommandAgent.js and /src/lib/claude.js:

This agent accepts an Egyptian Arabic command and can update ANY of the 6 modules.

CLAUDE API CALL (routed through Supabase Edge Function — see Phase 0.7):
Model: claude-sonnet-4-5   ← verify the latest model ID at docs.anthropic.com before building
Endpoint: POST ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy
Auth header: Bearer <supabase_session.access_token>  (NOT a Claude key — that stays server-side)

⚠️ NEVER call https://api.anthropic.com directly from the browser.
   Your API key will be visible in browser DevTools → Network tab.

SYSTEM PROMPT (use exactly this — do not modify):
---
أنت مساعد ERP ذكي لإدارة مصنع. مهمتك إنك تفهم أوامر العمال والمديرين باللغة العربية المصرية وتحولها لـ JSON منظم لتحديث قاعدة البيانات.

الأنظمة المتاحة:
1. إنتاج → module: "production" | actions: log_production, create_order, update_status
2. مستودع/تخزين → module: "inventory" | actions: record_movement, adjust_stock
3. جودة/عطلات → module: "quality" | actions: log_defect
4. صيانة/توقفات → module: "maintenance" | actions: log_downtime, resolve_downtime
5. مشتريات → module: "procurement" | actions: create_request
6. مبيعات → module: "sales" | actions: update_order_status

البيانات المتاحة في السياق:
{{CONTEXT_JSON}}

رد دايماً بـ JSON بس، بالشكل ده:
{
  "module": "production",
  "action": "log_production",
  "data": {
    "machine_code": "M-01",
    "quantity": 500,
    "shift": "صباحي"
  },
  "confidence": 0.95,
  "summary_ar": "تسجيل 500 وحدة على ماكينة 1",
  "summary_en": "Log 500 units on Machine 1",
  "missing_fields": []
}

لو في معلومات ناقصة:
{
  "module": "production",
  "action": "log_production",
  "data": { "quantity": 500 },
  "confidence": 0.6,
  "summary_ar": "محتاج تحدد الماكينة",
  "summary_en": "Need to specify the machine",
  "missing_fields": ["machine_code"]
}

لو الأمر غير مفهوم:
{
  "module": "unknown",
  "action": "unclear",
  "confidence": 0,
  "summary_ar": "مش فاهم الأمر، ممكن تعيد؟",
  "summary_en": "Command unclear, please rephrase",
  "missing_fields": []
}
---

CONTEXT_JSON should be dynamically built from:
- Available machines: [{code, name_ar}]
- Available warehouses: [{code, name_ar}]  
- Available items: [{code, name_ar}] (top 50 most used)
- Current user's branch + role

FUNCTION: async parseArabicCommand(commandText, userContext) → parsedResult

CONFIDENCE THRESHOLD: if confidence < 0.65 → return unclear, do NOT execute
```

---

## PROMPT 8.2 — Command Input UI (Global FAB)

```
Build the global floating Arabic command interface:

FLOATING ACTION BUTTON (FAB):
- Fixed position: bottom-right (LTR) / bottom-left (RTL)
- Circle button, 64px, amber bg, 🎤 icon
- Tapping opens the CommandSheet (bottom sheet modal)

CommandSheet component:
- Slides up from bottom, 60% screen height
- Header: "الأمر بالعربي / Arabic Command" + close button
- Large text area (5 lines min): Arabic keyboard, RTL, Cairo font 18px
- Placeholder: "مثال: سجلت 500 وحدة على ماكينة 1..."
- VoiceButton (ar-EG, Web Speech API) — fills textarea on result
- Quick command chips (horizontal scroll): 
  "📦 إنتاج" | "❌ عطلة" | "🔧 توقف" | "🏪 مستودع" | "🛒 مشتريات"
- "تحليل الأمر" button (amber, full width) → calls parseArabicCommand

ON RESULT (if confidence >= 0.65):
- Replace textarea with ConfirmCommandCard showing:
  - Module icon + name
  - summary_ar (large bold)
  - Parsed data fields as key-value rows
  - Confidence bar (color-coded)
  - Missing fields in amber warning if any
  - "تأكيد وحفظ / Confirm & Save" + "تعديل / Edit" buttons

ON CONFIRM:
- Route to correct Supabase insert based on module + action
- Show success toast with summary_ar
- Close sheet, refresh relevant screen

MISSING FIELDS FLOW:
- If missing_fields is not empty: show inline input for each missing field BEFORE confirming
- Only enable confirm button when all required fields are filled
```

---
---

# ═══════════════════════════════
# PHASE 9 — AI AGENTS
# ═══════════════════════════════

---

## PROMPT 9.1 — Stock Alert Agent

```
Build /src/agents/stockAlertAgent.js:

This agent runs automatically and generates intelligent reorder recommendations.

TRIGGER: Called by automationEngine after every stock movement + on dashboard load

FUNCTION: async runStockAlertAgent(userProfile)

STEP 1: Fetch all items where qty_available <= reorder_level from inventory view
STEP 2: Fetch last 30 days of stock_movements for these items (usage pattern)
STEP 3: Call Claude API with this data:

AGENT PROMPT:
---
أنت وكيل ذكي لإدارة المخزون في مصنع. حلل البيانات دي وقدم توصيات الشراء:

المواد تحت حد الأمان:
{{LOW_STOCK_ITEMS}}

حركة المخزون آخر 30 يوم:
{{MOVEMENT_HISTORY}}

رد بـ JSON:
{
  "recommendations": [
    {
      "item_code": "RAW-001",
      "item_name_ar": "مادة خام أ",
      "current_qty": 5,
      "reorder_level": 20,
      "recommended_order_qty": 100,
      "urgency": "critical",
      "reason_ar": "الكمية صفر خلال 3 أيام على الأساس المتوسط"
    }
  ],
  "summary_ar": "3 أصناف تحت الحد الأمان، صنف واحد حرج"
}
---

STEP 4: Display results in Dashboard alerts panel
STEP 5: For items with urgency="critical": create notification for warehouse keeper + manager
STEP 6: "إنشاء طلب شراء / Create Purchase Request" button per recommendation → pre-fill procurement form

Run this agent: on dashboard mount + every 30 minutes via setInterval (only if user has inventory view permission)
```

---

## PROMPT 9.2 — Production Optimization Agent

```
Build /src/agents/productionOptAgent.js:

This agent analyzes production data and surfaces bottlenecks.

TRIGGER: Manually via "تحليل الإنتاج / Analyze Production" button on Dashboard (manager/owner only)
Also runs automatically every morning at first dashboard load of the day.

FUNCTION: async runProductionOptAgent(branchId, dateRange)

STEP 1: Fetch last 7 days of:
  - production_orders (planned vs actual qty, planned vs actual duration)
  - downtime_logs per machine (total duration per machine)
  - defect_logs (defects per machine, per product)
  - production_logs (output per machine per shift)

STEP 2: Call Claude API:

AGENT PROMPT:
---
أنت مستشار تحسين إنتاج لمصنع تصنيع. حلل البيانات دي وحدد:
1. الاختناقات (الماكينات أو الخطوط اللي بتعطل الإنتاج)
2. أكثر الماكينات توقفاً
3. أعلى معدل عطلات جودة
4. الشيفت الأكثر إنتاجية
5. توصيات عملية (3-5 توصيات فقط)

بيانات الإنتاج (7 أيام):
{{PRODUCTION_DATA}}

بيانات التوقفات:
{{DOWNTIME_DATA}}

بيانات العطلات:
{{DEFECT_DATA}}

رد بـ JSON:
{
  "bottlenecks": [{ "machine": "M-03", "issue_ar": "...", "impact_ar": "..." }],
  "top_downtime_machines": [...],
  "quality_issues": [...],
  "best_shift": "...",
  "recommendations": [
    { "priority": 1, "action_ar": "...", "expected_impact_ar": "..." }
  ],
  "overall_health_score": 72,
  "summary_ar": "..."
}
---

STEP 3: Display in a dedicated "تقرير التحسين / Optimization Report" panel on Dashboard
- Health score as a circular progress gauge (recharts RadialBar)
- Bottlenecks as red cards
- Recommendations as numbered action cards
- "Export as PDF" button for the report
```

---
---

# ═══════════════════════════════
# PHASE 10 — INTEGRATIONS
# ═══════════════════════════════

---

## PROMPT 10.1 — Email Notifications (Resend)

```
Set up email notifications using the Resend API (free tier: 3,000 emails/month):

Add to .env: VITE_RESEND_API_KEY=your_key

Build /src/lib/emailNotifications.js:

Function: async sendEmail({ to, subject_ar, subject_en, body_ar, body_en, lang })
- Call the resend-proxy Edge Function: POST ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-proxy
  (see Phase 0.7 — sends email server-side so RESEND_API_KEY is never exposed in the browser)
- Authorization: Bearer <supabase_session.access_token>
- Template: bilingual HTML email
  - Arabic content right-aligned, Cairo font
  - English content left-aligned, Inter font
  - FactoryOS branding (amber header)
  - Clean table layout for data

EMAIL TRIGGERS (call from automationEngine):
1. Approval requests: "لديك طلب موافقة / Approval Required" → sent to approvers
2. Approval decisions: "تم الموافقة / Approved" or "تم الرفض / Rejected" → sent to requester
3. Critical defect: "عطلة حرجة / Critical Defect Detected" → sent to manager
4. Downtime escalation: "توقف ماكينة > ساعتين / Machine Down > 2hrs" → sent to manager
5. Stock critical: "مخزون حرج / Critical Stock Level" → sent to warehouse keeper + manager

In SettingsScreen: email toggle switches per notification type (users can opt out of specific emails)
```

---

## PROMPT 10.2 — WhatsApp Notifications (WhatsApp Business API)

```
Set up WhatsApp notifications using the WhatsApp Cloud API (Meta):

⚠️ DO NOT add WHATSAPP_TOKEN or WHATSAPP_PHONE_ID to .env as VITE_ variables.
They are already set as Edge Function secrets (see Phase 0.7).
The frontend only needs VITE_SUPABASE_URL (already in .env).

Build /src/lib/whatsapp.js:

Function: async sendWhatsApp({ to, templateName, parameters, lang })
- POST to ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-proxy  (← Edge Function, see Phase 0.7)
- Authorization: Bearer <supabase_session.access_token>  (NOT the Meta bearer token — that stays server-side)
- Use template messages (required by WhatsApp Business API)

⚠️ NEVER call graph.facebook.com directly from the browser.
   Your Meta token will be exposed in DevTools → Network.

TEMPLATES TO CREATE in Meta Business Manager:
1. "approval_request" → "لديك طلب موافقة على [1] رقم [2]. افتح التطبيق للمراجعة."
2. "critical_alert" → "تنبيه حرج من FactoryOS: [1]. يرجى المراجعة الفورية."
3. "order_completed" → "تم اكتمال أمر الإنتاج [1]. الكمية: [2] وحدة."

Store WhatsApp numbers in user_profiles.phone field.

TRIGGER POINTS: Same as email triggers — critical defects, downtimes, approvals.

In SettingsScreen: WhatsApp toggle per user. Each user can add their WhatsApp number.
```

---

## PROMPT 10.3 — Google Sheets Export (via Edge Function)

```
Build Google Sheets export using a Supabase Edge Function with a Google Service Account.
This avoids complex OAuth flows in the browser and keeps credentials server-side.

⚠️ DO NOT use browser-side OAuth for Google Sheets — it is complex, fragile, and
   exposes credentials. Use a service account (JSON key) stored in Edge Function secrets.

SETUP (one-time):
1. Go to Google Cloud Console → create a project → enable Google Sheets API
2. Create a Service Account → download the JSON key file
3. Store the key in Supabase secrets:
   supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{ ...paste JSON content... }'
4. Create the Edge Function: supabase functions new google-sheets-proxy

=== supabase/functions/google-sheets-proxy/index.ts ===
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9";

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { rows, headers_ar, headers_en, sheetTitle } = await req.json();

  // Authenticate with service account
  const serviceAccountKey = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")!);
  const auth = new GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const accessToken = (await auth.getAccessToken()) as string;

  // Create spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { title: sheetTitle } }),
  });
  const sheet = await createRes.json();
  const spreadsheetId = sheet.spreadsheetId;

  // Write data (Arabic headers row 1, English headers row 2, data from row 3)
  const values = [headers_ar, headers_en, ...rows];
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }
  );

  return new Response(
    JSON.stringify({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` }),
    { headers: { "Content-Type": "application/json" } }
  );
});

DEPLOY:
  supabase functions deploy google-sheets-proxy

FRONTEND (/src/lib/googleSheets.js):
  async function exportToGoogleSheets({ rows, headers_ar, headers_en, sheetTitle }) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-proxy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ rows, headers_ar, headers_en, sheetTitle }),
      }
    );
    const { url } = await res.json();
    window.open(url, "_blank"); // open the created sheet
  }

SHEET FORMAT:
- Row 1: Arabic column headers (bold, amber background #f59e0b)
- Row 2: English column headers (italic, light gray background)
- Data rows: dates formatted as DD/MM/YYYY, numbers with 2 decimal places
- Status columns: human-readable text, not raw status codes

EXPORT POINTS: Add "Export to Sheets 📊" button to every TableView component toolbar.
```

---
---

# ═══════════════════════════════
# PHASE 11 — REPORTING & EXPORT
# ═══════════════════════════════

---

## PROMPT 11.1 — PDF Export

```
Build /src/lib/exportUtils.js with PDF generation using jspdf + jspdf-autotable:

Function: generatePDF({ title_ar, title_en, subtitle, data, columns, lang, metadata })
- Page size: A4
- Header: FactoryOS logo (text-based) + report title in current language + date + branch
- Table: auto-formatted with alternating row colors, amber header
- Footer: page number + generation timestamp + user name
- Arabic text: use a Unicode-compatible font (load Amiri or Cairo as base64 font)
- RTL layout when lang='ar': flip table direction

SPECIFIC REPORT TEMPLATES:

1. Production Order Report: order details + BOM lines + production log entries + approval history
2. Purchase Order: PO header + line items + supplier info + totals + signature line
3. Quality Defect Report: defect details + images placeholder + resolution notes
4. Downtime Report: machine + duration + cause + resolution + impact calculation
5. Inventory Report: stock levels per warehouse + movements summary + low stock list

ADD "Export PDF" button:
- In DetailView component (every record detail)
- In each module screen header (exports current filtered table view)
```

---

## PROMPT 11.2 — Excel Export

```
Add Excel export to exportUtils.js using the xlsx library:

Function: exportToExcel({ data, columns, sheetName, fileName, lang })
- Create workbook with one sheet
- Row 1: Arabic column headers (bold, amber fill #f59e0b)
- Row 2: English column headers (bold, light gray fill)
- Data rows starting row 3
- Column widths auto-calculated from content
- Date columns formatted as DD/MM/YYYY
- Number columns right-aligned
- Status columns with conditional formatting color (green/red/amber)
- Auto-filter on header row
- Freeze top 2 rows

MULTI-SHEET EXPORT for summary reports:
Function: exportMultiSheetExcel(sheets) where sheets = [{name, data, columns}]
- One sheet per module
- Summary sheet at front with cross-module KPIs

Add "Export Excel" button to every TableView (next to PDF export button).
```

---
---

# ═══════════════════════════════
# PHASE 12 — MOBILE PWA & OFFLINE
# ═══════════════════════════════

---

## PROMPT 12.1 — Offline Queue & PWA

```
Build full offline support:

/src/lib/offlineQueue.js:
- saveToQueue(module, action, data): save pending operation to localStorage array
- processQueue(): iterate queue, execute each operation against Supabase, clear on success
- Each item: { id, module, action, data, timestamp, retryCount, status }
- Max retries: 3. After 3 fails → move to failedQueue, notify user

/src/hooks/useOffline.js:
- Listen to window online/offline events
- On come back online: auto-call processQueue()
- Return: { isOnline, pendingCount, failedCount }

OFFLINE BANNER component:
- When offline: persistent amber top banner "🔴 أنت غير متصل | Offline — commands saved locally"
- Shows pendingCount: "3 عمليات في الانتظار"
- When back online: green flash "🟢 متصل — جاري المزامنة"

IN ConfirmCommandCard: if offline → save to queue instead of Supabase
IN all forms: same behavior

PWA MANIFEST (/public/manifest.json):
{
  "name": "FactoryOS",
  "short_name": "FactoryOS",
  "description": "Manufacturing ERP System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#f59e0b",
  "orientation": "portrait-primary",
  "lang": "ar",
  "dir": "rtl",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}

SERVICE WORKER: cache app shell + static assets. Network-first for API calls.
```

---

## PROMPT 12.2 — Barcode Scanner (Camera-based, No Plugins)

```
Add camera barcode scanning using @zxing/browser — works natively in Android Chrome PWA.

INSTALL: npm install @zxing/browser @zxing/library

Build /src/components/ui/BarcodeScanner.jsx:

SCANNER COMPONENT:
- On open: request camera via navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
- Use BrowserMultiFormatReader from @zxing/browser for real-time frame scanning
- Auto-detects: EAN-13, EAN-8, QR Code, Code 128, Code 39
- Shows live camera viewfinder inside a modal overlay
- On successful scan: short vibration (navigator.vibrate(100)) + green flash
- Calls props.onScan(value) then auto-closes
- On close without scan: calls props.onClose()

Props:
  isOpen: boolean
  onScan(value: string): callback
  onClose(): callback

USAGE — add a 📷 icon button next to these fields:
1. InventoryScreen → item search input (look up item by barcode field)
2. StockMovementDetail → item_id selector
3. Items form (Gallery sub-tab) → barcode field (scan to auto-populate)
4. ProcurementScreen → item_id in purchase request line form

LOOKUP PATTERN (in InventoryScreen):
  const handleScan = async (barcode) => {
    const { data: item, error } = await supabase
      .from('items').select('*').eq('barcode', barcode).single();
    if (item) {
      setSelectedItem(item);
      showToast('تم العثور على الصنف / Item found', 'success');
    } else {
      showToast('الباركود غير معروف / Barcode not found', 'error');
    }
  };

PWA NOTE: Camera requires HTTPS. Vercel provides this automatically.
For local dev: Chrome allows camera access on localhost (not 127.0.0.1).
```

---
---

# ═══════════════════════════════
# PHASE 13 — SETTINGS & ADMIN
# ═══════════════════════════════

---

## PROMPT 13.1 — Settings, Users & Roles Admin

```
Build SettingsScreen.jsx (owner/manager only) with 4 tabs:

TAB 1: Users
- Table: name, email, role, branch, status (active/inactive)
- Add user: email invite via Supabase auth.admin.inviteUserByEmail
- Edit user: change role, branch_id, allowed_branches, permission_overrides
- Permission overrides UI: for each module, show checkboxes for view/create/edit/approve
  - Checkboxes pre-filled from role permissions
  - Overrides shown in different color (amber = overridden from role)
- Deactivate: soft-delete (is_active = false), not delete from auth

TAB 2: Roles
- List of roles with their permissions
- Edit permissions matrix: rows = modules, columns = view/create/edit/approve
- Toggle checkboxes per cell
- Owner role is read-only (cannot be edited)

TAB 3: Branches & Locations
- Manage branches (add/edit/deactivate)
- Under each branch: manage warehouses + production lines + machines
- Machine form: code, name, line assignment, initial status

TAB 4: Integrations & Preferences
- Email notifications: toggle per notification type
- WhatsApp: enter phone number per user, toggle per notification type
- Google Sheets: connect Google account button
- Share Dashboard: generate/revoke link
- Language default: AR | EN
- Theme default: dark | light
```

---
---

# ═══════════════════════════════
# PHASE 14 — DEPLOYMENT
# ═══════════════════════════════

---

## PROMPT 14.1 — Production Build & Deploy

```
Prepare FactoryOS for production deployment on Vercel:

1. Create vercel.json in project root:
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }
  ]
}

2. Environment variables to add in Vercel dashboard:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ANTHROPIC_API_KEY
VITE_WHATSAPP_TOKEN
VITE_WHATSAPP_PHONE_ID
VITE_RESEND_API_KEY

3. Run: npm run build
Fix any TypeScript or import errors before deploying.

4. Add a /src/lib/errorBoundary.jsx global error boundary showing:
"حصل خطأ في النظام / System Error — tap to reload"

5. DEPLOYMENT STEPS:
a. Push to GitHub (git add . && git commit -m "FactoryOS v1.0" && git push)
b. Go to vercel.com → New Project → Import from GitHub
c. Add all env variables
d. Deploy → Vercel gives you a URL (e.g. factory-os.vercel.app)
e. Share that URL with your team

6. CUSTOM DOMAIN (optional): Add your domain in Vercel project settings
```

---
---

# ═══════════════════════════════
# APPENDIX A — TROUBLESHOOTING
# ═══════════════════════════════

---

## FIX: Arabic text is LTR or misaligned
```
Add dir="rtl" to index.html <html> element.
Add className="text-right" to all Arabic text containers.
For flex layouts: use flex-row-reverse when in RTL mode.
For the language toggle: dynamically set document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
```

## FIX: Supabase RLS blocking data
```
Go to Supabase Dashboard → Authentication → Policies.
For the table that's returning empty: check if a SELECT policy exists.
Temporarily test with: create policy "test" on TABLE_NAME for select using (true);
Then tighten the policy once data flows correctly.
```

## FIX: Calculated fields showing NaN
```
In evaluateFormula, add null checks before every arithmetic operation:
if (!fieldValues[dep] || isNaN(fieldValues[dep])) return null;
Display null calculated values as "—" not NaN.
```

## FIX: Claude API returning HTML instead of JSON
```
The model occasionally adds markdown fences. Add this cleanup before JSON.parse:
const clean = text.replace(/```json|```/g, '').trim();
Also add to the system prompt: "رد بـ JSON فقط بدون أي نص إضافي أو backticks"
```

## FIX: WhatsApp messages not delivering
```
WhatsApp Business API requires:
1. Approved message templates (not free-text)
2. The recipient must have messaged your number first (within 24hr window) OR you use approved templates
3. Test numbers must be added in Meta developer dashboard
Use templates for all automated messages.
```

## FIX: Voice input not working on Android
```
Web Speech API requires HTTPS. Vercel provides HTTPS automatically.
On localhost: use localhost (not 127.0.0.1) — Chrome allows mic on localhost.
Create the SpeechRecognition instance fresh each time start() is called.
Add: recognition.lang = 'ar-EG'; recognition.continuous = false; recognition.interimResults = false;
```

---

# ═══════════════════════════════
# APPENDIX B — ARABIC COMMAND EXAMPLES
# ═══════════════════════════════

## Print this and give to every worker/manager

```
📦 إنتاج:
"سجلت 500 وحدة على ماكينة 1 الشيفت الصباحي"
"خط 2 أنتج 1200 قطعة منتج أ"
"غير حالة أمر الإنتاج 1042 لـ مكتمل"

❌ جودة:
"في خدوش على ماكينة 3، 15 قطعة، خطورة عالية"
"سجل عطلة كسر على خط 1، 5 وحدات"

🔧 صيانة:
"وقفت ماكينة 2 بسبب عطل كهربائي"
"خلصت صيانة ماكينة 4"

🏪 مستودع:
"استلمت 200 كيلو مادة خام أ من المورد"
"صرفنا 50 كرتون لخط الإنتاج 1"
"نقلت 100 قطعة من مستودع أ لمستودع ب"

🛒 مشتريات:
"محتاجين 500 كيلو مادة خام ج عاجل"
"وافق على طلب الشراء رقم PR-2024-051"
```

---

*FactoryOS Prompt Bible — Version 2.1 (Security-Hardened)*
*Compiled by: Software & Project Management Consultant*
*Stack: React · Vite · Tailwind · Supabase · Claude API · Vercel · Resend · WhatsApp Cloud API*
*Modules: Production · Inventory · Quality · Maintenance · Procurement · Sales*
*Edge Functions: ai-proxy · whatsapp-proxy · resend-proxy · google-sheets-proxy*
*Phases: 14 + 1 security phase (0.7) | Prompts: 35+ | Estimated Build Time: 6–10 weeks*

**Security Fixes Applied (v2.1):**
- ✅ All 3rd-party API keys moved server-side via Supabase Edge Functions
- ✅ Comprehensive RLS policies for all 24 tables
- ✅ Missing `purchase_order_lines` table added
- ✅ Google Sheets OAuth replaced with service account Edge Function
- ✅ Camera-based barcode scanner added (PROMPT 12.2)
- ✅ Claude model string updated + pointed to latest docs
