$mgmtToken = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$projectRef = "qmhgckkqksnxwmxqllkp"
$mgmtHeaders = @{ "Authorization" = "Bearer $mgmtToken"; "Content-Type" = "application/json" }

function Run-SQL($sql) {
    $b = @{ query = $sql } | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" -Method POST -Headers $mgmtHeaders -Body $b -ErrorAction Stop
}

Write-Host "===> Seeding role permissions..." -ForegroundColor Cyan

$sql = @"
update roles set permissions = '{"*": true}'::jsonb                                    where code = 'owner';
update roles set permissions = '{"production":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"inventory":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"quality":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"maintenance":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"procurement":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"sales":{"view":true,"create":true,"edit":true,"delete":false,"approve":true},"settings":{"view":true,"create":false,"edit":false,"delete":false,"approve":false}}'::jsonb where code = 'factory_manager';
update roles set permissions = '{"production":{"view":true,"create":true,"edit":true,"delete":false,"approve":false},"inventory":{"view":true,"create":false},"quality":{"view":true,"create":true},"maintenance":{"view":true,"create":true},"procurement":{"view":false},"sales":{"view":false},"settings":{"view":false}}'::jsonb where code = 'production_supervisor';
update roles set permissions = '{"production":{"view":true,"create":false},"inventory":{"view":true,"create":false},"quality":{"view":true,"create":true,"edit":true},"maintenance":{"view":true,"create":false},"procurement":{"view":false},"sales":{"view":false},"settings":{"view":false}}'::jsonb where code = 'quality_inspector';
update roles set permissions = '{"production":{"view":true,"create":false},"inventory":{"view":true,"create":true,"edit":true},"quality":{"view":false},"maintenance":{"view":false},"procurement":{"view":true,"create":true},"sales":{"view":true,"create":false},"settings":{"view":false}}'::jsonb where code = 'warehouse_keeper';
update roles set permissions = '{"production":{"view":true,"create":false},"inventory":{"view":true,"create":false},"quality":{"view":false},"maintenance":{"view":true,"create":true,"edit":true},"procurement":{"view":false},"sales":{"view":false},"settings":{"view":false}}'::jsonb where code = 'maintenance_tech';
"@

try {
    Run-SQL $sql | Out-Null
    Write-Host "    Done! All role permissions seeded." -ForegroundColor Green
} catch {
    Write-Host "    Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
