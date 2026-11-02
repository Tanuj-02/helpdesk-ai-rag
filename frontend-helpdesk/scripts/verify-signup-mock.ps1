<#
Run against a locally started frontend in mock mode. This creates only mock
in-memory accounts and refuses to run when the BFF is configured for live APIs.
#>
param([string]$BaseUrl = 'http://localhost:3000')

$ErrorActionPreference = 'Stop'
$config = Invoke-RestMethod -Uri "$BaseUrl/api/config" -TimeoutSec 20
if ($config.mode -ne 'mock') {
    throw 'Signup smoke test requires HELPDESK_API_MODE=mock.'
}

$signupPage = Invoke-WebRequest -Uri "$BaseUrl/register-company" -UseBasicParsing -TimeoutSec 20
$invitePage = Invoke-WebRequest -Uri "$BaseUrl/register?token=sample" -UseBasicParsing -TimeoutSec 20
$loginPage = Invoke-WebRequest -Uri "$BaseUrl/login" -UseBasicParsing -TimeoutSec 20
if ($signupPage.StatusCode -ne 200 -or $invitePage.StatusCode -ne 200 -or $loginPage.StatusCode -ne 200) {
    throw 'An authentication page did not load.'
}
if ($signupPage.Content -notmatch 'Show password' -or $loginPage.Content -notmatch 'Show password') {
    throw 'Password visibility controls did not render.'
}

$suffix = [guid]::NewGuid().ToString('N')
$adminEmail = "admin-$suffix@example.test"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$payload = @{
    companyName = 'Signup Smoke Company'
    companyEmail = "company-$suffix@example.test"
    adminName = 'Signup Smoke Admin'
    adminEmail = $adminEmail
    password = 'temporary-test-password'
} | ConvertTo-Json -Compress
$created = Invoke-WebRequest -Uri "$BaseUrl/api/auth/register-company" -Method POST `
    -ContentType 'application/json' -Body $payload -WebSession $session -UseBasicParsing -TimeoutSec 20
if ($created.StatusCode -ne 201) { throw 'Company registration did not return 201.' }

$loginBody = @{ email = $adminEmail; password = 'temporary-test-password' } | ConvertTo-Json -Compress
$login = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST `
    -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing -TimeoutSec 20
$current = Invoke-RestMethod -Uri "$BaseUrl/api/auth/session" -WebSession $session -TimeoutSec 20
$users = Invoke-RestMethod -Uri "$BaseUrl/api/admin/users" -WebSession $session -TimeoutSec 20
if ($login.StatusCode -ne 200 -or $login.Content -match '"token"') {
    throw 'Login failed or exposed the session token in its response.'
}
if ($current.role -ne 'ADMIN' -or $current.companyId -eq 1 -or $users.content.Count -ne 1) {
    throw 'New company session or tenant-scoped users are incorrect.'
}

Write-Output 'Signup mock smoke test passed.'
