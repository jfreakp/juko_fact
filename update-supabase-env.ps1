# Script para actualizar DATABASE_URL en .env para Supabase
# Uso: .\update-supabase-env.ps1

param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl,
    
    [string]$EnvFilePath = ".env"
)

# Validar que la URL sea válida
if (-not $DatabaseUrl.StartsWith("postgresql://")) {
    Write-Host "❌ Error: La URL debe comenzar con 'postgresql://'" -ForegroundColor Red
    exit 1
}

# Crear backup del .env
$backupPath = "$EnvFilePath.backup"
Copy-Item -Path $EnvFilePath -Destination $backupPath
Write-Host "✅ Backup creado: $backupPath" -ForegroundColor Green

# Actualizar DATABASE_URL
$content = Get-Content -Path $EnvFilePath -Raw
$newContent = $content -replace 'DATABASE_URL="[^"]*"', "DATABASE_URL=`"$DatabaseUrl`""
Set-Content -Path $EnvFilePath -Value $newContent

Write-Host "✅ .env actualizado exitosamente" -ForegroundColor Green
Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "1. pnpm prisma migrate deploy"
Write-Host "2. pnpm prisma generate"
Write-Host "3. pnpm dev"
