$token = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$headers = @{ "Authorization" = "Bearer $token" }
$r = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/qmhgckkqksnxwmxqllkp/api-keys" -Headers $headers
$r | ConvertTo-Json -Depth 5
