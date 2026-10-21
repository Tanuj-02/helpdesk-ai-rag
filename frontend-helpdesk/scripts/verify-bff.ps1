<#
.SYNOPSIS
    End-to-end check of the frontend BFF layer against a running server.

.DESCRIPTION
    Exercises the mock/live BFF without needing the Java backend: session
    handling, role-scoped ticket lists, the admin surface, pagination, the AI
    stream, and the proxy redirects. Every check asserts a real expectation,
    so a regression shows up as FAIL rather than as a plausible-looking 200.

.PARAMETER BaseUrl
    Where the app is served. Defaults to the dev server.

.EXAMPLE
    npm run dev
    powershell -ExecutionPolicy Bypass -File scripts/verify-bff.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/verify-bff.ps1 -BaseUrl http://localhost:3112
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$script:Pass = 0
$script:Fail = 0

function Write-Head($text) {
    Write-Host ""
    Write-Host "== $text" -ForegroundColor Cyan
}

function Assert-Equal($label, $actual, $expected) {
    if ("$actual" -eq "$expected") {
        Write-Host ("  PASS  {0}" -f $label) -ForegroundColor Green
        $script:Pass++
    }
    else {
        Write-Host ("  FAIL  {0}" -f $label) -ForegroundColor Red
        Write-Host ("        expected: {0}" -f $expected) -ForegroundColor Red
        Write-Host ("        actual:   {0}" -f $actual) -ForegroundColor Red
        $script:Fail++
    }
}

function Assert-True($label, $condition, $detail = "") {
    # Guard against the classic trap: a caller that forgets to parenthesise a
    # comparison passes a bare 0, and `if (0)` is False in PowerShell. Only
    # [bool] survives, so reject anything non-boolean loudly instead of
    # silently reporting a bogus FAIL.
    if ($condition -isnot [bool]) {
        Write-Host ("  FAIL  {0} -- condition was {1} '{2}', expected a [bool]. Wrap the comparison in parentheses." -f $label, $condition.GetType().Name, $condition) -ForegroundColor Red
        $script:Fail++
        return
    }
    if ($condition) {
        Write-Host ("  PASS  {0}" -f $label) -ForegroundColor Green
        $script:Pass++
    }
    else {
        Write-Host ("  FAIL  {0} {1}" -f $label, $detail) -ForegroundColor Red
        $script:Fail++
    }
}

function New-Session {
    $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    return $s
}

function Login($email, $session) {
    $body = @{ email = $email; password = "password" } | ConvertTo-Json -Compress
    Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -ContentType "application/json" `
        -Body $body -WebSession $session -UseBasicParsing -TimeoutSec 20 | Out-Null
    return $session
}

function Get-Status($Uri, $Session, $Method = "GET", $Body = $null) {
    # Returns just the status code; body is ignored on purpose.
    $params = @{ Uri = $Uri; Method = $Method; WebSession = $Session; UseBasicParsing = $true; TimeoutSec = 20 }
    if ($Body) { $params.ContentType = "application/json"; $params.Body = $Body }
    try {
        return (Invoke-WebRequest @params).StatusCode
    }
    catch {
        return [int]$_.Exception.Response.StatusCode
    }
}

function Get-Redirect($Uri, $Session) {
    # Returns "status|location", following nothing.
    try {
        $r = Invoke-WebRequest -Uri $Uri -WebSession $Session -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 20
        return "{0}|{1}" -f $r.StatusCode, $r.Headers["Location"]
    }
    catch {
        return "{0}|{1}" -f [int]$_.Exception.Response.StatusCode, $_.Exception.Response.Headers["Location"]
    }
}

function Get-Json($Uri, $Session) {
    (Invoke-WebRequest -Uri $Uri -WebSession $Session -UseBasicParsing -TimeoutSec 20).Content | ConvertFrom-Json
}

function Send-Json($Uri, $Session, $Method, $Body) {
    # Returns @{ Status; Content } for a mutating call, where both halves matter.
    # Get-Status discards the body, which is wrong for the AI-config endpoints:
    # the point of those checks is that the response never echoes the key back.
    $params = @{
        Uri         = $Uri
        Method      = $Method
        WebSession  = $Session
        UseBasicParsing = $true
        TimeoutSec  = 20
    }
    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Compress)
    }
    try {
        $r = Invoke-WebRequest @params
        return @{ Status = [int]$r.StatusCode; Content = $r.Content }
    }
    catch {
        $resp = $_.Exception.Response
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $text = $reader.ReadToEnd()
        return @{ Status = [int]$resp.StatusCode; Content = $text }
    }
}

function Get-PageStatus($Uri, $Session) {
    # Page status without following redirects, so the proxy's 307 can be asserted.
    $params = @{
        Uri = $Uri; UseBasicParsing = $true; MaximumRedirection = 0; TimeoutSec = 30
    }
    if ($Session) { $params.WebSession = $Session }
    try {
        return [int](Invoke-WebRequest @params).StatusCode
    }
    catch {
        return [int]$_.Exception.Response.StatusCode
    }
}

# --------------------------------------------------------------------------

Write-Host "Verifying $BaseUrl" -ForegroundColor White

try {
    $null = Invoke-WebRequest -Uri "$BaseUrl/login" -UseBasicParsing -TimeoutSec 10
}
catch {
    Write-Host "Cannot reach $BaseUrl. Start the app first:  npm run dev" -ForegroundColor Red
    exit 1
}

Write-Head "Unauthenticated access"
$anon = New-Session
Assert-Equal "no session -> 401"                 (Get-Status "$BaseUrl/api/auth/session" $anon) 401
Assert-Equal "no token -> 403"                   (Get-Status "$BaseUrl/api/ticket/my-tickets" $anon) 403
Assert-Equal "anonymous /tickets -> /login"      (Get-Redirect "$BaseUrl/tickets" $anon) "307|/login?next=%2Ftickets"

Write-Head "Employee (sam@acme.com)"
$emp = Login "sam@acme.com" (New-Session)
$session = Get-Json "$BaseUrl/api/auth/session" $emp
Assert-Equal "session role"    $session.role "EMPLOYEE"
Assert-Equal "session userId"  $session.userId 4
$cookies = @($emp.Cookies.GetCookies($BaseUrl))
$hdToken = @($cookies | Where-Object { $_.Name -eq "hd_token" })
$hdName = @($cookies | Where-Object { $_.Name -eq "hd_name" })
Assert-True "token cookie is set once"   (($hdToken.Count -eq 1))
Assert-True "token is httpOnly"         ((($hdToken.Count -eq 1) -and [bool]$hdToken[0].HttpOnly))
Assert-True "name cookie is readable"   ((($hdName.Count -eq 1) -and -not $hdName[0].HttpOnly))

$mine = Get-Json "$BaseUrl/api/ticket/my-tickets?page=0&size=20&sort=createdAt,desc" $emp
# NOTE the wrapping parentheses. Without them PowerShell's command argument
# parser hands Assert-True the bare integer 0 and swallows `-eq 0` as extra
# tokens; `if (0)` is then False. Always parenthesise a comparison here.
Assert-True "sees only own tickets" ((@($mine.content | Where-Object { $_.userId -ne $session.userId })).Count -eq 0)
Assert-Equal "cannot list company tickets" (Get-Status "$BaseUrl/api/ticket/company-tickets" $emp) 400
Assert-Equal "cannot list admin users"     (Get-Status "$BaseUrl/api/admin/users?sort=createAt,desc" $emp) 403
Assert-True  "blocked from /admin" ((Get-Redirect "$BaseUrl/admin" $emp) -eq "307|/tickets")

Write-Head "Agent (agent@acme.com)"
$agt = Login "agent@acme.com" (New-Session)
$assignedAgent = (Get-Json "$BaseUrl/api/auth/session" $agt).userId
$assigned = Get-Json "$BaseUrl/api/ticket/agent-tickets?page=0&size=20&sort=createdAt,desc" $agt
Assert-True "sees only assigned tickets" ((@($assigned.content | Where-Object { $_.agentId -ne $assignedAgent })).Count -eq 0)
Assert-Equal "cannot list admin users" (Get-Status "$BaseUrl/api/admin/users?sort=createAt,desc" $agt) 403
Assert-True  "blocked from /admin" ((Get-Redirect "$BaseUrl/admin" $agt) -eq "307|/tickets")
Assert-True  "allowed /agent" ((Get-Redirect "$BaseUrl/agent" $agt) -like "404|*")

Write-Head "Admin (admin@acme.com)"
$adm = Login "admin@acme.com" (New-Session)
$all = Get-Json "$BaseUrl/api/ticket/company-tickets?page=0&size=50&sort=createdAt,desc" $adm
Assert-True "sees whole company" ($all.content.Count -gt $mine.content.Count)
$users = Get-Json "$BaseUrl/api/admin/users?page=0&size=5&sort=createAt,desc" $adm
Assert-True "user list returns rows" ($users.content.Count -gt 0)
Assert-True "no password hash leaked" (-not ($users.content | Where-Object { $_.PSObject.Properties.Name -contains "password" }))
Assert-Equal "wrong sort key -> 500" (Get-Status "$BaseUrl/api/admin/users?sort=createdAt,desc" $adm) 500

Write-Head "Pagination"
$p0 = Get-Json "$BaseUrl/api/ticket/company-tickets?page=0&size=2&sort=createdAt,desc" $adm
$p1 = Get-Json "$BaseUrl/api/ticket/company-tickets?page=1&size=2&sort=createdAt,desc" $adm
Assert-Equal "page number echoed" $p1.number 1
Assert-True  "pages differ"         ("$($p0.content.id)" -ne "$($p1.content.id)")
Assert-Equal "page size honoured"   $p0.content.Count 2

Write-Head "Ticket creation"
$create = Invoke-WebRequest -Uri "$BaseUrl/api/ticket/create" -Method POST -ContentType "application/json" `
    -Body (@{ subject = "Printer offline"; description = "3rd floor"; ticketPriority = "LOW" } | ConvertTo-Json -Compress) `
    -WebSession $emp -UseBasicParsing -TimeoutSec 20
Assert-Equal "returns 201"          $create.StatusCode 201
Assert-Equal "plain string body"    $create.Content "Ticket created successfully"

Write-Head "AI config gating"
# Chat is blocked until an admin supplies a company Gemini key, so every AI
# check is ordered around that gate. The order matters: the model is only
# validated *after* the key check, so an unknown-model check placed before the
# key exists would pass for the wrong reason.
$cfgUri = "$BaseUrl/api/admin/ai-config"

# Shape-valid but fake: `AIza` + 35 chars, matching GEMINI_API_KEY_PATTERN. The
# mock never contacts Google, so the value only has to be well formed.
$GeminiKey = "AIza" + ("B" * 35)

$blocked = Send-Json "$BaseUrl/api/ai/chat?query=hello&chatId=500" $emp "GET" $null
Assert-Equal "chat blocked with no key" $blocked.Status 409
Assert-True  "block explains why" ($blocked.Content -match "AI_KEY_MISSING")

$empCfg = Send-Json $cfgUri $emp "GET" $null
Assert-Equal "employee may read config" $empCfg.Status 200
Assert-True  "reports unconfigured" ($empCfg.Content -match '"configured":false')

Assert-Equal "employee cannot save key"  (Send-Json $cfgUri $emp "PUT" @{ apiKey = $GeminiKey }).Status 403
Assert-Equal "employee cannot clear key" (Send-Json $cfgUri $emp "DELETE" $null).Status 403

Assert-Equal "malformed key rejected" (Send-Json $cfgUri $adm "PUT" @{ apiKey = "hunter2" }).Status 400

$saved = Send-Json $cfgUri $adm "PUT" @{ apiKey = $GeminiKey }
Assert-Equal "admin saves key" $saved.Status 200
Assert-True  "reports configured" ($saved.Content -match '"configured":true')
Assert-True  "response is masked" ($saved.Content -match '"maskedKey":"AIza\*+[A-Za-z0-9]{4}"')
Assert-True  "raw key never echoed" (-not ($saved.Content -match [regex]::Escape($GeminiKey)))

$readBack = Send-Json $cfgUri $emp "GET" $null
Assert-True  "employee sees configured" ($readBack.Content -match '"configured":true')
Assert-True  "employee never gets raw key" (-not ($readBack.Content -match [regex]::Escape($GeminiKey)))

Write-Head "AI stream"
$sw = [Diagnostics.Stopwatch]::StartNew()
$chat = Invoke-WebRequest -Uri "$BaseUrl/api/ai/chat?query=How%20do%20I%20reset%20my%20password%3F&chatId=500&model=gemini-2.5-flash" `
    -WebSession $emp -UseBasicParsing -TimeoutSec 40
$sw.Stop()
Assert-Equal "returns 200" $chat.StatusCode 200
Assert-True  "streams text" ($chat.Content.Length -gt 40)
Assert-True  "answers the question" ($chat.Content -match "administrator")
Assert-True  "honours the chosen model" ($chat.Content -match "gemini-2.5-flash")

$pro = Invoke-WebRequest -Uri "$BaseUrl/api/ai/chat?query=hello&chatId=500&model=gemini-2.5-pro" `
    -WebSession $emp -UseBasicParsing -TimeoutSec 40
Assert-True "model choice changes the answer" ($pro.Content -match "gemini-2.5-pro")

Assert-Equal "unknown model rejected" (Get-Status "$BaseUrl/api/ai/chat?query=hello&chatId=500&model=gpt-9" $emp) 400

Write-Head "Clearing the key re-blocks chat"
Assert-Equal "admin clears key" (Send-Json $cfgUri $adm "DELETE" $null).Status 200
Assert-Equal "chat blocked again" (Send-Json "$BaseUrl/api/ai/chat?query=hello&chatId=500" $emp "GET" $null).Status 409

Write-Head "UI routes"
Assert-Equal "employee /tickets renders"  (Get-PageStatus "$BaseUrl/tickets" $emp) 200
Assert-Equal "employee /chat renders"     (Get-PageStatus "$BaseUrl/chat" $emp) 200
Assert-True  "employee blocked from /admin/users"     ((Get-Redirect "$BaseUrl/admin/users" $emp) -eq "307|/tickets")
Assert-True  "employee blocked from /admin/settings"  ((Get-Redirect "$BaseUrl/admin/settings" $emp) -eq "307|/tickets")
Assert-True  "employee blocked from /admin/documents" ((Get-Redirect "$BaseUrl/admin/documents" $emp) -eq "307|/tickets")
Assert-Equal "admin /admin/users renders"    (Get-PageStatus "$BaseUrl/admin/users" $adm) 200
Assert-Equal "admin /admin/settings renders" (Get-PageStatus "$BaseUrl/admin/settings" $adm) 200
Assert-Equal "admin /admin/documents renders" (Get-PageStatus "$BaseUrl/admin/documents" $adm) 200
Assert-Equal "ticket detail renders"    (Get-PageStatus "$BaseUrl/tickets/1001" $adm) 200
Assert-Equal "new ticket renders"       (Get-PageStatus "$BaseUrl/tickets/new" $adm) 200
Assert-Equal "employee sees own ticket" (Get-PageStatus "$BaseUrl/tickets/1001" $emp) 200
# Ticket detail upstream is derived from the caller's own list, so an id that
# nobody the caller can see resolves to the not-found state rather than leaking
# a row from another user's scope. The page still returns 200: not-found is a
# rendered state, not an error status.
Assert-Equal "unknown ticket renders not-found" (Get-PageStatus "$BaseUrl/tickets/999999" $emp) 200

$loginPage = (Invoke-WebRequest -Uri "$BaseUrl/login" -UseBasicParsing -TimeoutSec 20).Content
Assert-True  "no Google sign-in button" (-not ($loginPage -match "GoogleLogo|Login with Google"))
Assert-True  "no dead password-reset link" (-not ($loginPage -match "Forgot your password"))

Write-Head "Invitation sanitisation"
$invite = Invoke-WebRequest -Uri "$BaseUrl/api/invitation/send" -Method POST -ContentType "application/json" `
    -Body (@{ email = "newbie@acme.com"; role = "EMPLOYEE" } | ConvertTo-Json -Compress) `
    -WebSession $adm -UseBasicParsing -TimeoutSec 20
$inv = $invite.Content | ConvertFrom-Json
Assert-True "no token leaked"  (-not ($inv.PSObject.Properties.Name -contains "token"))
Assert-True "no user leaked"   (-not ($inv.PSObject.Properties.Name -contains "user"))

Write-Head "Logout"
Assert-Equal "logout ok" (Get-Status "$BaseUrl/api/auth/logout" $adm "POST") 200
Assert-Equal "session gone" (Get-Status "$BaseUrl/api/auth/session" $adm) 401

# --------------------------------------------------------------------------

Write-Host ""
if ($script:Fail -eq 0) {
    Write-Host ("ALL {0} CHECKS PASSED" -f $script:Pass) -ForegroundColor Green
}
else {
    Write-Host ("{0} passed, {1} FAILED" -f $script:Pass, $script:Fail) -ForegroundColor Red
}
exit $script:Fail