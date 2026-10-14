# ============================================================
# S24 PLATFORM - SCRIPT DE INICIALIZACIÓN (FASE 2)
# ============================================================

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  S24 PLATFORM - CREANDO ESTRUCTURA DE CARPETAS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Crear estructura de directorios esenciales
$directories = @(
    "src\app",
    "src\components\common",
    "src\components\layout",
    "src\components\forms",
    "src\modules\dashboard\components",
    "src\modules\dashboard\hooks",
    "src\modules\crm\customers",
    "src\modules\crm\opportunities",
    "src\modules\crm\activities",
    "src\modules\call-center\components",
    "src\modules\call-center\services",
    "src\modules\sales\quotes",
    "src\modules\sales\sales",
    "src\modules\sales\commissions",
    "src\modules\operations\work-orders",
    "src\modules\operations\technicians",
    "src\modules\inventory\products",
    "src\modules\inventory\movements",
    "src\modules\inventory\suppliers",
    "src\modules\finance\transactions",
    "src\modules\finance\reports",
    "src\modules\cms\pages",
    "src\modules\cms\assets",
    "src\modules\cms\settings",
    "src\modules\admin\users",
    "src\modules\admin\roles",
    "src\modules\admin\audit-logs",
    "src\modules\reports\components",
    "src\modules\auth",
    "src\services\supabase",
    "src\services\api",
    "src\services\telephony",
    "src\hooks",
    "src\types",
    "src\utils",
    "src\styles",
    "src\assets\images",
    "supabase\functions\telephony-webhook",
    "supabase\functions\transcription-processor",
    "supabase\functions\ai-analyzer",
    "supabase\migrations",
    "scripts",
    "tests\unit",
    "tests\integration",
    "tests\e2e",
    "docs"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "  ✓ Estructura de directorios creada correctamente" -ForegroundColor Green
Write-Host ""
