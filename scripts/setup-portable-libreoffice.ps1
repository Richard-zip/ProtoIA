# Script de automatización de LibreOffice para Windows
# Configura LibreOffice en bin/libreoffice para que quede embebido en la aplicación

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$LoDir = Join-Path $ProjectRoot "bin\libreoffice"

Write-Host "=== Verificando configuración de LibreOffice en $LoDir ===" -ForegroundColor Cyan

# 1. Crear directorio destino si no existe
if (-not (Test-Path $LoDir)) {
    New-Item -ItemType Directory -Path $LoDir -Force | Out-Null
}

# 2. Comprobar si ya existe soffice.exe en bin/libreoffice
$ExistingExe = Join-Path $LoDir "program\soffice.exe"
if (Test-Path $ExistingExe) {
    Write-Host "¡LibreOffice ya está configurado en bin\libreoffice\program\soffice.exe!" -ForegroundColor Green
    & "$ExistingExe" --version
    exit 0
}

# 3. Verificar si LibreOffice ya está instalado en el sistema
$SystemPaths = @(
    "C:\Program Files\LibreOffice\program\soffice.exe",
    "C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    "$env:LOCALAPPDATA\Programs\LibreOffice\program\soffice.exe"
)

$FoundSystemPath = $null
foreach ($p in $SystemPaths) {
    if (Test-Path $p) {
        $FoundSystemPath = (Split-Path -Parent (Split-Path -Parent $p))
        break
    }
}

if ($FoundSystemPath) {
    Write-Host "Se detectó LibreOffice instalado en: $FoundSystemPath" -ForegroundColor Yellow
    Write-Host "Copiando binarios a bin\libreoffice para empaquetado autónomo..." -ForegroundColor Cyan
    Copy-Item -Path "$FoundSystemPath\*" -Destination $LoDir -Recurse -Force
    Write-Host "=== ¡LibreOffice copiado con éxito en bin\libreoffice! ===" -ForegroundColor Green
    exit 0
}

# 4. Si no está instalado, ofrecer instalación vía winget
Write-Host "No se encontró LibreOffice instalado en el sistema." -ForegroundColor Yellow
Write-Host "Puedes instalarlo fácilmente ejecutando:" -ForegroundColor Cyan
Write-Host "  winget install TheDocumentFoundation.LibreOffice" -ForegroundColor White
Write-Host ""
Write-Host "O descargarlo e instalarlo desde: https://www.libreoffice.org/download/" -ForegroundColor Cyan
Write-Host "Una vez instalado, vuelve a ejecutar este script para integrarlo a la app." -ForegroundColor Cyan
