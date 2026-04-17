$token = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$proj  = "qmhgckkqksnxwmxqllkp"
$h     = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$sql   = "select up.id, up.name_en, up.name_ar, r.code as role_code, r.permissions::text from user_profiles up left join roles r on r.id = up.role_id limit 10"
$body  = [System.Text.Encoding]::UTF8.GetBytes('{"query":"' + $sql + '"}')
$r     = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$proj/database/query" -Method POST -Headers $h -Body $body -ContentType "application/json"
$r | ForEach-Object { Write-Host "$($_.name_en) | role=$($_.role_code) | perms=$($_.permissions)" }
