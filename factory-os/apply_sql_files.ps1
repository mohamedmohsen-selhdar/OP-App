$token = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$projectId = "qmhgckkqksnxwmxqllkp"
$baseUrl = "https://api.supabase.com/v1/projects/$projectId/database/query"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

$sqlDir = Join-Path $PSScriptRoot "sql"

foreach ($file in Get-ChildItem $sqlDir -Filter "*.sql" | Sort-Object Name) {
    Write-Host "`n===> $($file.Name)" -ForegroundColor Cyan
    $sql = Get-Content $file.FullName -Raw -Encoding UTF8
    $body = [ordered]@{ query = $sql } | ConvertTo-Json -Depth 10
    try {
        $r = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "    OK" -ForegroundColor Green
    } catch {
        $err = $_.ErrorDetails.Message
        if (-not $err) { $err = $_.Exception.Message }
        Write-Host "    ERROR: $err" -ForegroundColor Red
    }
}

Write-Host "`n=== All SQL files applied ===" -ForegroundColor Yellow
