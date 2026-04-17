$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaGdja2txa3NueHdteHFsbGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQzMDQ5OCwiZXhwIjoyMDg3MDA2NDk4fQ.Yqi6JDYdYmHTCSQrighHYUVmg7_OARXA5Q_lqVnas2c"
$supabaseUrl = "https://qmhgckkqksnxwmxqllkp.supabase.co"
$headers = @{ "Authorization" = "Bearer $serviceKey"; "apikey" = $serviceKey }

# List all auth users
$resp = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users?per_page=50" -Headers $headers
Write-Host "Total users: $($resp.total)"
$resp.users | ForEach-Object { Write-Host "  - $($_.id)  $($_.email)" }
