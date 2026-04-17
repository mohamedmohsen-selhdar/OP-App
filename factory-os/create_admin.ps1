$mgmtToken = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaGdja2txa3NueHdteHFsbGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQzMDQ5OCwiZXhwIjoyMDg3MDA2NDk4fQ.Yqi6JDYdYmHTCSQrighHYUVmg7_OARXA5Q_lqVnas2c"
$supabaseUrl = "https://qmhgckkqksnxwmxqllkp.supabase.co"
$projectRef  = "qmhgckkqksnxwmxqllkp"

$authHeaders = @{ "Authorization" = "Bearer $serviceKey"; "apikey" = $serviceKey; "Content-Type" = "application/json" }
$mgmtHeaders = @{ "Authorization" = "Bearer $mgmtToken"; "Content-Type" = "application/json" }

function Run-SQL($sql) {
    $body = @{ query = $sql } | ConvertTo-Json -Depth 5
    return Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" -Method POST -Headers $mgmtHeaders -Body $body -ErrorAction Stop
}

# Step 1 — Add missing columns to user_profiles if they don't exist
Write-Host "===> Patching user_profiles schema..." -ForegroundColor Cyan
Run-SQL "alter table user_profiles add column if not exists full_name_ar text; alter table user_profiles add column if not exists full_name_en text; alter table user_profiles add column if not exists phone text; alter table user_profiles add column if not exists avatar_url text;" | Out-Null
Write-Host "    Schema patched!" -ForegroundColor Green

# Step 2 — Create admin@factoryos.app
Write-Host "===> Creating admin@factoryos.app..." -ForegroundColor Cyan
$body = @{ email = "admin@factoryos.app"; password = "FactoryOS@2024"; email_confirm = $true } | ConvertTo-Json
try {
    $newUser = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" -Method POST -Headers $authHeaders -Body $body -ErrorAction Stop
    $adminId = $newUser.id
    Write-Host "    Created! ID: $adminId" -ForegroundColor Green
} catch {
    Write-Host "    Already exists or error — will look it up..." -ForegroundColor Yellow
    $allUsers = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users?per_page=50" -Headers $authHeaders
    $existing = $allUsers.users | Where-Object { $_.email -eq "admin@factoryos.app" }
    if ($existing) {
        $adminId = $existing.id
        Write-Host "    Found: $adminId" -ForegroundColor Green
    } else {
        Write-Host "    Cannot create user. Check Supabase dashboard." -ForegroundColor Red
        $adminId = $null
    }
}

# Step 3 — Assign Owner role to admin user
if ($adminId) {
    Write-Host "===> Assigning Owner role to admin@factoryos.app..." -ForegroundColor Cyan
    Run-SQL "insert into user_profiles (id, name_en, role_id, branch_id) values ('$adminId', 'Admin', (select id from roles where code = 'owner'), (select id from branches where code = 'BR-01')) on conflict (id) do update set name_en = 'Admin', role_id = (select id from roles where code = 'owner'), branch_id = (select id from branches where code = 'BR-01');" | Out-Null
    Write-Host "    Done!" -ForegroundColor Green
}

# Step 4 — Assign Owner role to your Gmail too
$gmailId = "ad386b69-09ad-417c-ba5a-5fa8ca476235"
Write-Host "===> Assigning Owner role to Gmail account..." -ForegroundColor Cyan
Run-SQL "insert into user_profiles (id, name_en, role_id, branch_id) values ('$gmailId', 'Mohamed', (select id from roles where code = 'owner'), (select id from branches where code = 'BR-01')) on conflict (id) do update set name_en = 'Mohamed', role_id = (select id from roles where code = 'owner'), branch_id = (select id from branches where code = 'BR-01');" | Out-Null
Write-Host "    Done!" -ForegroundColor Green

Write-Host "`n=== All set! Log in at http://localhost:5174 ===" -ForegroundColor Yellow
Write-Host "  admin@factoryos.app / FactoryOS@2024"
Write-Host "  mohamedmohsen.whitecorp@gmail.com / (your password)"
