$token = "sbp_9dcda10b6134390e16f9ed7c0d6e087315da0868"
$projectId = "qmhgckkqksnxwmxqllkp"
$slug = "pulse-proxy"
$headers = @{ 
    "Authorization" = "Bearer $token"
}

$filePath = "c:\Users\Pioneer\OneDrive\Desktop\AG\OP APP\factory-os\supabase\functions\pulse-proxy\index.ts"
$metadata = '{"entrypoint_path": "index.ts", "name": "Pulse Proxy", "verify_jwt": false}'

Write-Host "Deploying Edge Function via Multipart API..." -ForegroundColor Cyan

# Prepare Multipart Form Data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"
$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"metadata`"",
    "Content-Type: application/json",
    "",
    $metadata,
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"index.ts`"",
    "Content-Type: text/plain",
    "",
    (Get-Content $filePath -Raw),
    "--$boundary--"
) -join $LF

$headers["Content-Type"] = "multipart/form-data; boundary=$boundary"

try {
    $url = "https://api.supabase.com/v1/projects/$projectId/functions/deploy?slug=$slug"
    $response = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $bodyLines
    $response | ConvertTo-Json
    Write-Host "Deployment Successful!" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
}
