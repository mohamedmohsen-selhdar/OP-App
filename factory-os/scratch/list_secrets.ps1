$token = "sbp_9dcda10b6134390e16f9ed7c0d6e087315da0868"
$projectId = "qmhgckkqksnxwmxqllkp"
$headers = @{ "Authorization" = "Bearer $token" }

try {
    $r = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectId/secrets" -Headers $headers
    $r | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
