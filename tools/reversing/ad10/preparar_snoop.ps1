<#
  FASE A (em casa, 30 s) — Ativa o log HCI (snoop) no celular ANTES de ir ao carro.
  Assim o tempo no carro é só o necessário pra ler o app oficial.

  Uso:  powershell -ExecutionPolicy Bypass -File tools\reversing\ad10\preparar_snoop.ps1
#>
$ErrorActionPreference = 'Stop'
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

Write-Host "=== FASE A: ativar HCI snoop ==="
$line = (& $adb devices) | Where-Object { $_ -match 'device$' }
if (-not $line) { Write-Host "ERRO: celular nao aparece no adb. Conecte o USB e autorize a depuracao."; exit 1 }
$serial = ($line -split '\s+')[0]
Write-Host "Dispositivo: $serial"

# Tenta ativar o HCI snoop (两层: settings + persist property)
& $adb -s $serial shell settings put global bluetooth_btsnoop_log_mode always 2>&1 | Out-Null
& $adb -s $serial shell settings put global bluetooth_btsnoop_log_mode 2>&1 | Out-Null
& $adb -s $serial shell setprop persist.bluetooth.btsnooplogmode full 2>&1 | Out-Null
Write-Host "Modo HCI snoop:"
& $adb -s $serial shell settings get global bluetooth_btsnoop_log_mode 2>&1

Write-Host ""
Write-Host "IMPORTANTE: reinicie o Bluetooth no celular (desliga/liga) pra o snoop começar."
Write-Host "Depois disso, pode desconectar o USB e ir ao carro."
Write-Host "PRONTO PARA A FASE B (no carro)."
