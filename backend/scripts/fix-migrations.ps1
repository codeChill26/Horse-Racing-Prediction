# Repair Prisma migration history for shared Supabase (tables already exist partially).
# Run from backend/:  powershell -ExecutionPolicy Bypass -File scripts/fix-migrations.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "1/5 Mark failed tournament migration as applied..."
npx prisma migrate resolve --applied 20260531090000_add_tournament_and_race

Write-Host "2/5 Mark horse migration as applied (Horse table already exists)..."
npx prisma migrate resolve --applied 20260602090000_add_horse_registration_flow

Write-Host "3/5 Mark race entry migration as applied..."
npx prisma migrate resolve --applied 20260603100000_add_race_entry_submission_engine

Write-Host "4/5 Mark jockey invitation migration as applied (table already exists)..."
npx prisma migrate resolve --applied 20260610120000_add_jockey_invitation_flow

Write-Host "5/5 Deploy sync migration (add missing columns)..."
npx prisma migrate deploy

Write-Host "Done. Regenerate client: npx prisma generate"
