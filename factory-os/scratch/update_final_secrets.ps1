$token = "sbp_9dcda10b6134390e16f9ed7c0d6e087315da0868"
$projectId = "qmhgckkqksnxwmxqllkp"
$headers = @{ 
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$secrets = @(
    @{ name = "VAPID_PUBLIC_KEY"; value = "BPwh61SXS0GpOPRhLbYVEBjaOs9DHrZVg6h1cncw7zXCQv2r7dOrqQ1pQwzm482K907-apYk4y01pnkexqg_1ZU" },
    @{ name = "VAPID_PRIVATE_KEY"; value = "PsAXu6gyKxEpHGtUB0lNhdjAQCLU0EsXaj2HHWwj8JY" },
    @{ name = "RESEND_API_KEY"; value = "re_8T3w9BgN_Lr1j3QWqEPH7QZVhLis4XSmv" },
    @{ name = "SUPABASE_SERVICE_ROLE_KEY"; value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaGdja2txa3NueHdteHFsbGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQzMDQ5OCwiZXhwIjoyMDg3MDA2NDk4fQ.Yqi6JDYdYmHTCSQrighHYUVmg7_OARXA5Q_lqVnas2c" }
)

Write-Host "Updating Supabase Secrets..." -ForegroundColor Cyan

foreach ($s in $secrets) {
    Write-Host "Setting $($s.name)..."
    try {
        $body = @($s) | ConvertTo-Json
        Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$projectId/secrets" -Headers $headers -Body $body
        Write-Host "Success!" -ForegroundColor Green
    } catch {
        Write-Host "Error setting $($s.name): $($_.Exception.Message)" -ForegroundColor Red
    }
}
