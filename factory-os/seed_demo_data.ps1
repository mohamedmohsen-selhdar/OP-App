$mgmtToken = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$projectRef = "qmhgckkqksnxwmxqllkp"
$headers = @{ "Authorization" = "Bearer $mgmtToken"; "Content-Type" = "application/json" }

function Run-SQL($sql) {
    $b = @{ query = $sql } | ConvertTo-Json -Depth 10
    $r = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" -Method POST -Headers $headers -Body $b -ErrorAction Stop
    return $r
}

Write-Host "===> Seeding factory demo data..." -ForegroundColor Cyan

# ── 1. Item Categories
Write-Host "  1. Categories..." -ForegroundColor Yellow
Run-SQL @"
insert into item_categories (id, code, name_ar, name_en) values
  (gen_random_uuid(), 'CAT-RM', 'مواد خام', 'Raw Materials'),
  (gen_random_uuid(), 'CAT-FG', 'منتجات تامة', 'Finished Goods'),
  (gen_random_uuid(), 'CAT-SF', 'منتجات نصف مصنعة', 'Semi-Finished'),
  (gen_random_uuid(), 'CAT-PK', 'مواد التعبئة', 'Packaging')
on conflict (code) do nothing;
"@ | Out-Null

# ── 2. Items
Write-Host "  2. Items..." -ForegroundColor Yellow
Run-SQL @"
insert into items (id, code, name_ar, name_en, type, unit, min_stock, category_id) values
  (gen_random_uuid(), 'RM-001', 'بولي إيثيلين خام', 'Raw Polyethylene',  'raw_material',   'كجم',  500,  (select id from item_categories where code='CAT-RM')),
  (gen_random_uuid(), 'RM-002', 'صبغة صناعية حمراء','Industrial Dye Red','raw_material',   'لتر',  50,   (select id from item_categories where code='CAT-RM')),
  (gen_random_uuid(), 'RM-003', 'حبيبات PVC',        'PVC Granules',      'raw_material',   'كجم',  300,  (select id from item_categories where code='CAT-RM')),
  (gen_random_uuid(), 'RM-004', 'مستربتش أبيض',     'White Masterbatch', 'raw_material',   'كجم',  100,  (select id from item_categories where code='CAT-RM')),
  (gen_random_uuid(), 'SF-001', 'أنبوب PVC خام',     'Raw PVC Pipe',      'semi_finished',  'متر',  200,  (select id from item_categories where code='CAT-SF')),
  (gen_random_uuid(), 'FG-001', 'أنبوب PVC 25مم',    'PVC Pipe 25mm',     'finished_good',  'متر',  1000, (select id from item_categories where code='CAT-FG')),
  (gen_random_uuid(), 'FG-002', 'أنبوب PVC 50مم',    'PVC Pipe 50mm',     'finished_good',  'متر',  800,  (select id from item_categories where code='CAT-FG')),
  (gen_random_uuid(), 'FG-003', 'خرطوم مياه 3/4',   'Water Hose 3/4',    'finished_good',  'متر',  500,  (select id from item_categories where code='CAT-FG')),
  (gen_random_uuid(), 'PK-001', 'كرتون تعبئة كبير', 'Large Carton Box',  'packaging',      'قطعة', 200,  (select id from item_categories where code='CAT-PK')),
  (gen_random_uuid(), 'PK-002', 'شريط لاصق',         'Adhesive Tape',     'packaging',      'لفة',  50,   (select id from item_categories where code='CAT-PK'))
on conflict (code) do nothing;
"@ | Out-Null

# ── 3. Machines
Write-Host "  3. Machines..." -ForegroundColor Yellow
Run-SQL @"
insert into machines (id, code, name_ar, name_en, line_id, status, is_active) values
  (gen_random_uuid(), 'MCH-001', 'خط بثق رقم 1',    'Extruder Line 1',   (select id from production_lines limit 1 offset 0), 'running', true),
  (gen_random_uuid(), 'MCH-002', 'خط بثق رقم 2',    'Extruder Line 2',   (select id from production_lines limit 1 offset 0), 'running', true),
  (gen_random_uuid(), 'MCH-003', 'ماكينة تعبئة',    'Packaging Machine', (select id from production_lines limit 1 offset 1), 'running', true),
  (gen_random_uuid(), 'MCH-004', 'ماكينة طباعة',    'Printing Machine',  (select id from production_lines limit 1 offset 1), 'idle',    true),
  (gen_random_uuid(), 'MCH-005', 'كومبريسور هواء',  'Air Compressor',    (select id from production_lines limit 1 offset 0), 'running', true)
on conflict (code) do nothing;
"@ | Out-Null

# ── 4. Suppliers
Write-Host "  4. Suppliers..." -ForegroundColor Yellow
Run-SQL @"
insert into suppliers (id, code, name_ar, name_en, phone, is_active) values
  (gen_random_uuid(), 'SUP-001', 'شركة الكيماويات المتحدة',    'United Chemicals Co.',   '01012345678', true),
  (gen_random_uuid(), 'SUP-002', 'مصنع البلاستيك العربي',       'Arab Plastics Factory',  '01023456789', true),
  (gen_random_uuid(), 'SUP-003', 'شركة التعبئة والتغليف الحديثة','Modern Packaging Co.',  '01034567890', true),
  (gen_random_uuid(), 'SUP-004', 'مورد الخامات الوطني',          'National Raw Supplier', '01045678901', true)
on conflict (code) do nothing;
"@ | Out-Null

# ── 5. Customers
Write-Host "  5. Customers..." -ForegroundColor Yellow
Run-SQL @"
insert into customers (id, code, name_ar, name_en, phone, is_active) values
  (gen_random_uuid(), 'CUS-001', 'شركة الإنشاءات الحديثة',    'Modern Construction Co.', '01056789012', true),
  (gen_random_uuid(), 'CUS-002', 'مقاولات النيل',              'Nile Contracting',        '01067890123', true),
  (gen_random_uuid(), 'CUS-003', 'شركة المشاريع الكبرى',       'Major Projects Co.',      '01078901234', true),
  (gen_random_uuid(), 'CUS-004', 'تجار الجملة المتحدون',        'United Wholesalers',      '01089012345', true)
on conflict (code) do nothing;
"@ | Out-Null

# ── 6. BOM Headers + Lines
Write-Host "  6. BOM (Bill of Materials)..." -ForegroundColor Yellow
Run-SQL @"
insert into bom_headers (id, code, name_ar, name_en, finished_item_id, is_active) values
  (gen_random_uuid(), 'BOM-001', 'مواصفة أنبوب PVC 25مم', 'PVC Pipe 25mm BOM', (select id from items where code='FG-001'), true),
  (gen_random_uuid(), 'BOM-002', 'مواصفة أنبوب PVC 50مم', 'PVC Pipe 50mm BOM', (select id from items where code='FG-002'), true),
  (gen_random_uuid(), 'BOM-003', 'مواصفة خرطوم مياه',     'Water Hose BOM',    (select id from items where code='FG-003'), true)
on conflict (code) do nothing;
"@ | Out-Null

Run-SQL @"
insert into bom_lines (id, bom_id, item_id, qty_required, unit) values
  (gen_random_uuid(), (select id from bom_headers where code='BOM-001'), (select id from items where code='RM-003'), 1.2, 'كجم'),
  (gen_random_uuid(), (select id from bom_headers where code='BOM-001'), (select id from items where code='RM-004'), 0.05, 'كجم'),
  (gen_random_uuid(), (select id from bom_headers where code='BOM-002'), (select id from items where code='RM-003'), 2.5, 'كجم'),
  (gen_random_uuid(), (select id from bom_headers where code='BOM-002'), (select id from items where code='RM-004'), 0.08, 'كجم'),
  (gen_random_uuid(), (select id from bom_headers where code='BOM-003'), (select id from items where code='RM-001'), 0.8, 'كجم'),
  (gen_random_uuid(), (select id from bom_headers where code='BOM-003'), (select id from items where code='RM-002'), 0.02, 'لتر')
on conflict do nothing;
"@ | Out-Null

# ── 7. Inventory (seed stock levels)
Write-Host "  7. Inventory stock..." -ForegroundColor Yellow
Run-SQL @"
insert into inventory (id, item_id, warehouse_id, qty_on_hand, qty_reserved, qty_available) values
  (gen_random_uuid(), (select id from items where code='RM-001'), (select id from warehouses where code='WH-RM'), 1200, 200, 1000),
  (gen_random_uuid(), (select id from items where code='RM-002'), (select id from warehouses where code='WH-RM'), 80,   10,  70),
  (gen_random_uuid(), (select id from items where code='RM-003'), (select id from warehouses where code='WH-RM'), 600,  100, 500),
  (gen_random_uuid(), (select id from items where code='RM-004'), (select id from warehouses where code='WH-RM'), 30,   0,   30),
  (gen_random_uuid(), (select id from items where code='FG-001'), (select id from warehouses where code='WH-FG'), 2500, 0,   2500),
  (gen_random_uuid(), (select id from items where code='FG-002'), (select id from warehouses where code='WH-FG'), 400,  0,   400),
  (gen_random_uuid(), (select id from items where code='FG-003'), (select id from warehouses where code='WH-FG'), 0,    0,   0),
  (gen_random_uuid(), (select id from items where code='PK-001'), (select id from warehouses where code='WH-RM'), 150,  0,   150),
  (gen_random_uuid(), (select id from items where code='PK-002'), (select id from warehouses where code='WH-RM'), 20,   0,   20)
on conflict do nothing;
"@ | Out-Null

# ── 8. Sample Production Orders
Write-Host "  8. Production orders..." -ForegroundColor Yellow
$adminId = "ad386b69-09ad-417c-ba5a-5fa8ca476235"
Run-SQL @"
insert into production_orders (id, code, bom_id, line_id, planned_qty, actual_qty, planned_start, planned_end, status, created_by) values
  (gen_random_uuid(), 'PO-20260416-1001', (select id from bom_headers where code='BOM-001'), (select id from production_lines limit 1 offset 0), 5000, 3200, '2026-04-14', '2026-04-18', 'in_progress', '$adminId'),
  (gen_random_uuid(), 'PO-20260416-1002', (select id from bom_headers where code='BOM-002'), (select id from production_lines limit 1 offset 1), 2000, 0,    '2026-04-16', '2026-04-20', 'approved',    '$adminId'),
  (gen_random_uuid(), 'PO-20260416-1003', (select id from bom_headers where code='BOM-003'), (select id from production_lines limit 1 offset 0), 3000, 3000, '2026-04-10', '2026-04-15', 'done',        '$adminId'),
  (gen_random_uuid(), 'PO-20260416-1004', (select id from bom_headers where code='BOM-001'), (select id from production_lines limit 1 offset 0), 1000, 0,    '2026-04-17', '2026-04-21', 'draft',       '$adminId')
on conflict (code) do nothing;
"@ | Out-Null

# ── 9. Sample Defect + Downtime
Write-Host "  9. Defects & downtime..." -ForegroundColor Yellow
Run-SQL @"
insert into defect_logs (id, order_id, defect_type, qty_defective, severity, status, root_cause, corrective_action, inspector_id) values
  (gen_random_uuid(), (select id from production_orders where code='PO-20260416-1001'), 'انكماش في القطر', 45, 'medium', 'open', 'ارتفاع درجة حرارة البثق', 'ضبط درجة الحرارة على 185 درجة', '$adminId'),
  (gen_random_uuid(), (select id from production_orders where code='PO-20260416-1001'), 'تغير اللون',      12, 'low',    'open', 'عدم تجانس المستربتش',      'زيادة وقت الخلط 30 ثانية',      '$adminId')
on conflict do nothing;
"@ | Out-Null

Run-SQL @"
insert into downtime_logs (id, machine_id, reason, start_time, end_time, status, reported_by) values
  (gen_random_uuid(), (select id from machines where code='MCH-001'), 'صيانة دورية مجدولة',   now() - interval '5 hours', now() - interval '3 hours', 'resolved', '$adminId'),
  (gen_random_uuid(), (select id from machines where code='MCH-002'), 'عطل في موتور التغذية', now() - interval '2 hours', null,                       'open',     '$adminId')
on conflict do nothing;
"@ | Out-Null

# ── 10. Sample Purchase & Sales Orders
Write-Host "  10. Purchase & Sales orders..." -ForegroundColor Yellow
Run-SQL @"
insert into purchase_orders (id, code, supplier_id, total_amount, expected_date, status, created_by) values
  (gen_random_uuid(), 'PUR-20260416-2001', (select id from suppliers where code='SUP-001'), 45000, '2026-04-20', 'sent',     '$adminId'),
  (gen_random_uuid(), 'PUR-20260416-2002', (select id from suppliers where code='SUP-002'), 18500, '2026-04-22', 'draft',    '$adminId'),
  (gen_random_uuid(), 'PUR-20260416-2003', (select id from suppliers where code='SUP-003'), 7200,  '2026-04-18', 'received', '$adminId')
on conflict (code) do nothing;
"@ | Out-Null

Run-SQL @"
insert into sales_orders (id, code, customer_id, total_amount, expected_delivery, payment_terms, status, created_by) values
  (gen_random_uuid(), 'SO-20260416-3001', (select id from customers where code='CUS-001'), 62000, '2026-04-19', 'credit_30', 'confirmed',  '$adminId'),
  (gen_random_uuid(), 'SO-20260416-3002', (select id from customers where code='CUS-002'), 28500, '2026-04-21', 'cash',      'draft',       '$adminId'),
  (gen_random_uuid(), 'SO-20260416-3003', (select id from customers where code='CUS-003'), 95000, '2026-04-17', 'credit_15', 'delivered',   '$adminId')
on conflict (code) do nothing;
"@ | Out-Null

Write-Host "`n=== All demo data seeded successfully! ===" -ForegroundColor Green
Write-Host "  - 10 items (raw materials + finished goods)"
Write-Host "  - 5 machines"
Write-Host "  - 4 suppliers + 4 customers"
Write-Host "  - 3 BOMs"
Write-Host "  - 9 inventory entries"
Write-Host "  - 4 production orders"
Write-Host "  - 2 defects + 2 downtime logs"
Write-Host "  - 3 purchase orders + 3 sales orders"
