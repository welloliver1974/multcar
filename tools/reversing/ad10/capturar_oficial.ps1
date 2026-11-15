<#
  Captura o tráfego BLE do app oficial XTOOL Advancer para o dongle AD10.

  Uso:  powershell -ExecutionPolicy Bypass -File tools\reversing\ad10\capturar_oficial.ps1

  Requisitos:
   - Celular conectado via USB com depuração USB autorizada
   - No celular: Opções do desenvolvedor -> "Ativar registro de log HCI de Bluetooth"
     (o script também tenta ativar via settings, mas nem sempre tem permissão)

  O que faz:
   1. Espera o dispositivo ficar autorizado
   2. Ativa o log HCI (snoop)
   3. Pede para o usuário ABRIR O APP OFICIAL e LER O CARRO (uns 15 s)
   4. Coleta o bugreport (que contem o .btsnoop) e decodifica as escritas ATT
#>
$ErrorActionPreference = 'Stop'
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$out = Join-Path $PSScriptRoot "..\..\..\scratch\capture"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Log($m) { Write-Host ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $m) }

Log "Esperando dispositivo autorizado..."
while ($true) {
    $line = (& $adb devices) | Where-Object { $_ -match 'device$' }
    if ($line) { break }
    Start-Sleep -Seconds 3
}
$serial = ($line -split '\s+')[0]
Log "Dispositivo: $serial"

Log "Ativando log HCI (snoop)..."
& $adb -s $serial shell settings put global bluetooth_btsnoop_log_mode always 2>&1 | Out-Null
& $adb -s $serial shell settings put global bluetooth_btsnoop_log_mode 2>&1 | Out-Null
& $adb -s $serial shell settings get global bluetooth_btsnoop_log_mode 2>&1 | Out-String | Write-Host

Write-Host ""
Write-Host "=========================================================="
Write-Host "  AGORA: abra o app OFICIAL XTOOL Advancer no celular,"
Write-Host "  conecte no dongle e deixe LER O CARRO por ~15 segundos."
Write-Host "  Depois volte aqui e pressione ENTER."
Write-Host "=========================================================="
Read-Host ""

Log "Gerando bugreport (pode levar 1-2 min)..."
& $adb -s $serial bugreport (Join-Path $out "bugreport.zip") 2>&1 | Select-Object -Last 3 | Out-String | Write-Host

Log "Extraindo .btsnoop do bugreport..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
try {
    $zip = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $out "bugreport.zip"))
    foreach ($e in $zip.Entries) {
        if ($e.FullName -match 'btsnoop.*\.log$|bluetooth.*log|blued') {
            $dest = Join-Path $out ("snoop_" + ($e.Name -replace '[^\w.\-]', '_'))
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $dest, $true)
            Log "Extraído: $dest ($($e.FullName))"
        }
    }
    $zip.Dispose()
} catch {
    Log "Falha ao extrair do bugreport: $_"
}

$snoops = Get-ChildItem $out -Filter "snoop_*.log" -ErrorAction SilentlyContinue
if (-not $snoops) {
    Log "Nenhum .btsnoop encontrado no bugreport. Tentando caminho direto..."
    & $adb -s $serial shell "ls -l /data/misc/bluetooth/logs/ 2>/dev/null; ls -l /data/misc/blued/ 2>/dev/null" 2>&1 | Out-String | Write-Host
    & $adb -s $serial pull /data/misc/bluetooth/logs/ $out 2>&1 | Out-String | Write-Host
    $snoops = Get-ChildItem $out -Filter "*.log" -Recurse -ErrorAction SilentlyContinue
}

foreach ($s in $snoops) {
    Log "Decodificando $($s.Name)..."
    python (Join-Path $PSScriptRoot "decode_btsnoop.py") $s.FullName |
        Tee-Object -FilePath (Join-Path $out ("decoded_" + $s.Name + ".txt"))
}

Log "Pronto! Arquivos em: $out"
