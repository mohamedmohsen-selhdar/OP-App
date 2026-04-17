-- Seed: Branch
insert into branches (code, name_ar, name_en, address)
values ('BR-01', 'المصنع الرئيسي', 'Main Factory', 'القاهرة، مصر')
on conflict (code) do nothing;

-- Seed: Warehouses
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

-- Seed: Production Lines
insert into production_lines (branch_id, code, name_ar, name_en, capacity_per_shift)
select b.id, 'LINE-01', 'خط الإنتاج الأول', 'Production Line 1', 500
from branches b where b.code = 'BR-01'
on conflict (code) do nothing;

insert into production_lines (branch_id, code, name_ar, name_en, capacity_per_shift)
select b.id, 'LINE-02', 'خط الإنتاج الثاني', 'Production Line 2', 400
from branches b where b.code = 'BR-01'
on conflict (code) do nothing;

-- Seed: Item Categories
insert into item_categories (name_ar, name_en) values
('مواد خام', 'Raw Materials'),
('منتجات تامة', 'Finished Products'),
('قطع غيار', 'Spare Parts'),
('مواد تعبئة', 'Packaging Materials')
on conflict do nothing;
