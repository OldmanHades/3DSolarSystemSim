$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ports = 8765..8795
$listener = $null
$port = $null

foreach ($candidate in $ports) {
    $candidateListener = [System.Net.HttpListener]::new()
    $candidateListener.Prefixes.Add("http://127.0.0.1:$candidate/")
    try {
        $candidateListener.Start()
        $listener = $candidateListener
        $port = $candidate
        break
    }
    catch {
        $candidateListener.Close()
    }
}

if (-not $listener) {
    throw "Could not start a local server on ports 8765-8795."
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".txt" = "text/plain; charset=utf-8"
    ".png" = "image/png"
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg" = "image/svg+xml"
}

function Send-TextResponse {
    param(
        [System.Net.HttpListenerContext]$Context,
        [int]$StatusCode,
        [string]$Text
    )
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $Context.Response.StatusCode = $StatusCode
    $Context.Response.ContentType = "text/plain; charset=utf-8"
    $Context.Response.ContentLength64 = $bytes.Length
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Context.Response.Close()
}

$url = "http://127.0.0.1:$port/"
Write-Host "Solar System 3D Simulation running at $url"
Write-Host "Press Ctrl+C to stop the local server."
Start-Process $url

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $relative = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
            if ([string]::IsNullOrWhiteSpace($relative)) {
                $relative = "index.html"
            }

            $combined = Join-Path $root $relative
            $resolved = [System.IO.Path]::GetFullPath($combined)
            $rootResolved = [System.IO.Path]::GetFullPath($root)

            if (-not $resolved.StartsWith($rootResolved, [System.StringComparison]::OrdinalIgnoreCase)) {
                Send-TextResponse -Context $context -StatusCode 403 -Text "Forbidden"
                continue
            }

            if (-not [System.IO.File]::Exists($resolved)) {
                Send-TextResponse -Context $context -StatusCode 404 -Text "Not found"
                continue
            }

            $extension = [System.IO.Path]::GetExtension($resolved).ToLowerInvariant()
            $contentType = $mimeTypes[$extension]
            if (-not $contentType) {
                $contentType = "application/octet-stream"
            }

            $bytes = [System.IO.File]::ReadAllBytes($resolved)
            $context.Response.StatusCode = 200
            $context.Response.ContentType = $contentType
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            $context.Response.Close()
        }
        catch {
            if ($context.Response.OutputStream.CanWrite) {
                Send-TextResponse -Context $context -StatusCode 500 -Text "Server error"
            }
        }
    }
}
finally {
    if ($listener) {
        $listener.Stop()
        $listener.Close()
    }
}
