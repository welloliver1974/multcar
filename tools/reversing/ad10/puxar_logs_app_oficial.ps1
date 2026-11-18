<#
  Puxa os logs que o APP OFICIAL XTOOL gravou no celULAR (15/11/2026).
  O app gravou /BLELogs/, /DbgLogs/, /LogSpecial/ e tentou fazer upload
  (AD10Log.zip) mas FALHOU por certificado -> arquivos ainda estao no celular.

  Esses logs contem os bytes BLE EXATOS que o app oficial mandou pra ECU
  (run_avgfuel, coolant, battery) -> a peca que falta pro Multcar.

  Uso:  powershell -ExecutionPolicy Bypass -File tools\reversing\ad10\puxar_logs_app_oficial.ps1
  Requisito: celular no USB com depuracao autorizada.
#>
$ErrorActionPreference = 'Stop'
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$out = Join-Path $PSScriptRoot "..\..\..\scratch\capture\app_oficial_logs"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Log($m){ Write-Host ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $m) }

$line = (& $adb devices) | Where-Object { $_ -match 'device$' }
if (-not $line) { Write-Host "ERRO: celular nao esta no adb. Conecte o USB."; exit 1 }
$serial = ($line -split '\s+')[0]
Log "Dispositivo: $serial"

$pkg = "com.xtool.ad10"
$bases = @(
  "/sdcard/Android/data/$pkg/files",
  "/sdcard/$pkg",
  "/storage/emulated/0/Android/data/$pkg/files",
  "/sdcard/Download"
)

foreach ($b in $bases) {
  Log "Procurando em $b ..."
  $found = & $adb -s $serial shell "find '$b' -type f 2>/dev/null | grep -iE 'BLELogs|DbgLogs|LogSpecial|AD10Log|AD10debug|ad10.txt|\.log$'" 2>&1
  if ($found) {
    foreach ($f in $found) {
      $f = $f.Trim()
      if (-not $f) { continue }
      $name = Split-Path $f -Leaf
      $dest = Join-Path $out ($name -replace '[^\w.\-]', '_')
      Log "Puxando: $f"
      & $adb -s $serial pull "$f" "$dest" 2>&1 | Select-Object -Last 1 | Out-String | Write-Host
    }
  }
}

# Tambem tenta puxar diretorios inteiros de uma vez
foreach ($sub in @('BLELogs','DbgLogs','LogSpecial')) {
  foreach ($b in $bases) {
    $src = "$b/$sub"
    Log "Tentando diretorio: $src"
    & $adb -s $serial pull "$src" (Join-Path $out $sub) 2>&1 | Select-Object -Last 1 | Out-String | Write-Host
  }
}

Log "=== Arquivos puxados ==="
Get-ChildItem $out -Recurse -File | Select-Object FullName,Length | Format-Table -AutoSize
Log "Pronto. Envie os arquivos de $out para analise."
