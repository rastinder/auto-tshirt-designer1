$apiUrl = "https://aitshirts.in/api"
$frontendUrl = "https://aitshirts.in"

function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Method = "GET",
        [string]$Url,
        [string]$Body = "",
        [switch]$Silent
    )

    $start = Get-Date
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }

        $params = @{
            Method = $Method
            Uri = $Url
            Headers = $headers
        }

        if ($Body) {
            $params.Body = $Body
        }

        $response = Invoke-RestMethod @params
        $duration = (Get-Date) - $start

        if (-not $Silent) {
            Write-Host "`n=== $Name ===" -ForegroundColor Green
            Write-Host "URL: $Url"
            Write-Host "Duration: $($duration.TotalSeconds) seconds"
            Write-Host "Response:"
            $response | ConvertTo-Json -Depth 4
        }

        return @{
            Success = $true
            Duration = $duration.TotalSeconds
            Response = $response
        }
    }
    catch {
        Write-Host "`n=== $Name ===" -ForegroundColor Red
        Write-Host "URL: $Url"
        Write-Host "Error: $_"
        return @{
            Success = $false
            Error = $_
        }
    }
}

Write-Host "Starting API Tests..." -ForegroundColor Cyan

# Backend Tests
$tests = @(
    @{
        Name = "Backend Health Check"
        Url = "$apiUrl/test/health"
    },
    @{
        Name = "Worker Status"
        Url = "$apiUrl/test/workers"
    },
    @{
        Name = "Design Generation (Test Mode)"
        Method = "POST"
        Url = "$apiUrl/test/design"
        Body = '{"prompt": "a cool t-shirt design", "test_mode": true}'
    },
    @{
        Name = "Real Design Generation"
        Method = "POST"
        Url = "$apiUrl/design"
        Body = '{"prompt": "modern abstract t-shirt design"}'
    },
    @{
        Name = "Background Removal Test"
        Method = "POST"
        Url = "$apiUrl/test/background-removal"
        Body = '{"image_url": "https://example.com/image.png", "test_mode": true}'
    },
    @{
        Name = "Design History"
        Url = "$apiUrl/previous-designs"
    }
)

$results = @()
foreach ($test in $tests) {
    $result = Test-Endpoint @test
    $results += @{
        Name = $test.Name
        Result = $result
    }
}

# Performance Test
Write-Host "`nPerformance Test (3 requests)..." -ForegroundColor Cyan
$perfResults = 1..3 | ForEach-Object {
    Test-Endpoint -Name "Health Check $_" -Url "$apiUrl/test/health" -Silent
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Yellow
Write-Host "Total Tests: $($results.Count)"
Write-Host "Successful: $($results.Where({ $_.Result.Success }).Count)"
Write-Host "Failed: $($results.Where({ -not $_.Result.Success }).Count)"

Write-Host "`nPerformance Summary:" -ForegroundColor Yellow
$avgDuration = ($perfResults.Where({ $_.Success }).ForEach({ $_.Duration }) | Measure-Object -Average).Average
Write-Host "Average Response Time: $($avgDuration.ToString("F3")) seconds"

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
