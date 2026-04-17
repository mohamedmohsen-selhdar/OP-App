$token = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$proj  = "qmhgckkqksnxwmxqllkp"
$h     = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$sql   = "select code, name_ar, permissions::text from roles"
$body  = [System.Text.Encoding]::UTF8.GetBytes('{"query":"' + $sql + '"}')
$r     = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$proj/database/query" -Method POST -Headers $h -Body $body -ContentType "application/json"
$r | ForEach-Object { Write-Host "$($_.code) | $($_.permissions)" }
