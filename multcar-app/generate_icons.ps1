Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$sz, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap $sz, $sz
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 7, 11, 20))
    $g.FillRectangle($bgBrush, 0, 0, $sz, $sz)
    
    $penCyan = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 0, 210, 255)), ([float]($sz * 0.08))
    $penTrack = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 30, 41, 59)), ([float]($sz * 0.08))
    
    $inset = [float]($sz * 0.15)
    $w = [float]($sz - 2 * $inset)
    
    $g.DrawArc($penTrack, $inset, $inset, $w, $w, [float]135, [float]270)
    $g.DrawArc($penCyan, $inset, $inset, $w, $w, [float]135, [float]190)
    
    $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
    $font = New-Object System.Drawing.Font ($fontFamily, [float]($sz * 0.35), [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font ($fontFamily, [float]($sz * 0.10), [System.Drawing.FontStyle]::Bold)
    
    $brushWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $brushCyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 210, 255))
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rectM = New-Object System.Drawing.RectangleF ([float]0), ([float]($sz * 0.12)), ([float]$sz), ([float]($sz * 0.55))
    $g.DrawString("M", $font, $brushWhite, $rectM, $sf)
    
    $rectSub = New-Object System.Drawing.RectangleF ([float]0), ([float]($sz * 0.68)), ([float]$sz), ([float]($sz * 0.25))
    $g.DrawString("MULTCAR", $fontSub, $brushCyan, $rectSub, $sf)
    
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Generate-Icon 192 "E:\Apps\Multcar\multcar-app\www\icon-192.png"
Generate-Icon 512 "E:\Apps\Multcar\multcar-app\www\icon-512.png"
Generate-Icon 192 "E:\Apps\Multcar\icon-192.png"
Generate-Icon 512 "E:\Apps\Multcar\icon-512.png"
Write-Output "ICONS_GENERATED_SUCCESSFULLY"
