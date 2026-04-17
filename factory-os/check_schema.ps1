$token = "sbp_f8a9b21d30acdc6fa7d6c1607c409da09a00808f"
$proj  = "qmhgckkqksnxwmxqllkp"
$h     = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$sql   = "select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('item_categories','items','machines','suppliers','customers','bom_headers','bom_lines','inventory','production_orders','purchase_orders','sales_orders','downtime_logs','defect_logs') order by table_name, ordinal_position"
$body  = [System.Text.Encoding]::UTF8.GetBytes(('{"query":"' + ($sql -replace '"','\"') + '"}'))
$r     = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$proj/database/query" -Method POST -Headers $h -Body $body -ContentType "application/json"
$r | ForEach-Object { "$($_.table_name) | $($_.column_name)" }
