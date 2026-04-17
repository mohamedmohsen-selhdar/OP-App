$token = "sbp_9dcda10b6134390e16f9ed7c0d6e087315da0868"
$projectId = "qmhgckkqksnxwmxqllkp"
$functionId = "pulse-proxy"
$headers = @{ 
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$code = Get-Content -Path "c:\Users\Pioneer\OneDrive\Desktop\AG\OP APP\factory-os\supabase\functions\pulse-proxy\index.ts" -Raw

# Supabase Management API for Functions (Create or Update)
# POST /v1/projects/{ref}/functions
# Body: { name: string, slug: string, body: string, verify_jwt: boolean }

$body = @{
    name = "Pulse Proxy Overlay"
    slug = $functionId
    body = $code
    verify_jwt = $false
} | ConvertTo-Json

Write-Host "Deploying Pulse Proxy Function..." -ForegroundColor Cyan

try {
    # Check if exists first
    Invoke-RestMethod -Method Get -Uri "https://api.supabase.com/v1/projects/$projectId/functions/$functionId" -Headers $headers -ErrorAction SilentlyContinue
    $exists = $true
} catch {
    $exists = $false
}

try {
    if ($exists) {
        Write-Host "Updating existing function..."
        Invoke-RestMethod -Method Patch -Uri "https://api.supabase.com/v1/projects/$projectId/functions/$functionId" -Headers $headers -Body $body
    } else {
        Write-Host "Creating new function..."
        Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$projectId/functions" -Headers $headers -Body $body
    }
    Write-Host "Success!" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
}
