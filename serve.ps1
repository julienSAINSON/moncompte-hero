param(
    [int]$Port = 8080
)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

$mimeTypes = @{
    ".html" = "text/html"
    ".js"   = "application/javascript"
    ".css"  = "text/css"
    ".json" = "application/json"
    ".mp3"  = "audio/mpeg"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".webmanifest" = "application/manifest+json"
}

Write-Host "Serveur demarre sur http://localhost:$Port/ (Ctrl+C pour arreter)"

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $relativePath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart("/"))
            if ([string]::IsNullOrEmpty($relativePath)) {
                $relativePath = "index.html"
            }

            $filePath = Join-Path $root $relativePath

            if (Test-Path $filePath -PathType Leaf) {
                $extension = [System.IO.Path]::GetExtension($filePath)
                $contentType = $mimeTypes[$extension]
                if (-not $contentType) {
                    $contentType = "application/octet-stream"
                }

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
            }

            $response.OutputStream.Close()
        } catch {
            # une requete en erreur (client deconnecte, etc.) ne doit pas arreter le serveur
            Write-Host "Requete ignoree (erreur) : $($_.Exception.Message)"
        }
    }
} finally {
    $listener.Stop()
}
