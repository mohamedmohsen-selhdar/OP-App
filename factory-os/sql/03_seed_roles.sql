-- Seed: Roles with full permissions JSON
insert into roles (code, name_ar, name_en, permissions, can_see_all_branches) values
('owner', 'المالك / المدير التنفيذي', 'Owner / CEO',
 '{"*": true}'::jsonb,
 true),
('factory_manager', 'مدير المصنع', 'Factory Manager',
 '{"production":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"inventory":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"quality":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"maintenance":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"procurement":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"sales":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"settings":{"view":true}}'::jsonb,
 true),
('production_supervisor', 'مشرف الإنتاج', 'Production Supervisor',
 '{"production":{"view":true,"create":true,"edit":true},"inventory":{"view":true},"quality":{"view":true,"create":true},"maintenance":{"view":true,"create":true},"procurement":{"view":false},"sales":{"view":false},"settings":{"view":false}}'::jsonb,
 false),
('quality_inspector', 'مفتش الجودة', 'Quality Inspector',
 '{"production":{"view":true},"inventory":{"view":true},"quality":{"view":true,"create":true,"edit":true},"maintenance":{"view":true},"procurement":{"view":false},"sales":{"view":false},"settings":{"view":false}}'::jsonb,
 false),
('warehouse_keeper', 'أمين المستودع', 'Warehouse Keeper',
 '{"production":{"view":true},"inventory":{"view":true,"create":true,"edit":true},"quality":{"view":false},"maintenance":{"view":false},"procurement":{"view":true,"create":true},"sales":{"view":true},"settings":{"view":false}}'::jsonb,
 false),
('maintenance_tech', 'فني الصيانة', 'Maintenance Technician',
 '{"production":{"view":true},"inventory":{"view":true},"quality":{"view":false},"maintenance":{"view":true,"create":true,"edit":true},"procurement":{"view":false},"sales":{"view":false},"settings":{"view":false}}'::jsonb,
 false)
on conflict (code) do nothing;
