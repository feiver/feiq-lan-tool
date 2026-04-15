$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$tauriRoot = Join-Path $repoRoot "src-tauri"
$targetRoot = Join-Path $tauriRoot "target"
$profileRoot = Join-Path $targetRoot "debug"
$exePath = Join-Path $profileRoot "feiq-lan-tool.exe"
$loaderPath = Join-Path $profileRoot "WebView2Loader.dll"
$releaseRoot = Join-Path $repoRoot "release"
$portableRoot = Join-Path $releaseRoot "feiq-lan-tool-portable-win64"
$zipPath = Join-Path $releaseRoot "feiq-lan-tool-portable-win64.zip"

$distIndexPath = Join-Path $repoRoot "dist\\index.html"
if (-not (Test-Path $distIndexPath)) {
    throw "Frontend build output is missing. Run `npm run build` first: $distIndexPath"
}

Write-Host "Building portable desktop executable..."
cargo build --manifest-path (Join-Path $tauriRoot "Cargo.toml")

if ($LASTEXITCODE -ne 0) {
    throw "cargo build failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path $exePath)) {
    throw "Portable executable was not generated: $exePath"
}

if (-not (Test-Path $loaderPath)) {
    throw "WebView2Loader.dll was not generated: $loaderPath"
}

if (Test-Path $portableRoot) {
    Remove-Item -LiteralPath $portableRoot -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $portableRoot | Out-Null
Copy-Item -LiteralPath $exePath -Destination (Join-Path $portableRoot "feiq-lan-tool.exe")
Copy-Item -LiteralPath $loaderPath -Destination (Join-Path $portableRoot "WebView2Loader.dll")

$readmePath = Join-Path $portableRoot "README.txt"
$readmeContent = @(
    "feiq-lan-tool portable package",
    "",
    "Usage:",
    "1. Extract the zip to any folder.",
    "2. Double-click feiq-lan-tool.exe to start.",
    "3. Keep WebView2Loader.dll in the same folder as the exe.",
    "",
    "Notes:",
    "- WebView2 runtime is required on Windows."
)
Set-Content -LiteralPath $readmePath -Value $readmeContent -Encoding ASCII

Compress-Archive -LiteralPath $portableRoot -DestinationPath $zipPath -Force

Write-Host "Portable package generated:"
Write-Host $zipPath
