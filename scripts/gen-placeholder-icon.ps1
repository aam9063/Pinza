# Genera app-icon.png (1024x1024): icono provisional de Pinza.
# El icono definitivo llega con el hito M6 y sustituye este fichero.
Add-Type -AssemblyName System.Drawing

$size = 1024
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$accent = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#1D4FBF'))
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$wood = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#C99A5B'))

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 220
$path.AddArc(32, 32, $radius, $radius, 180, 90)
$path.AddArc($size - 32 - $radius, 32, $radius, $radius, 270, 90)
$path.AddArc($size - 32 - $radius, $size - 32 - $radius, $radius, $radius, 0, 90)
$path.AddArc(32, $size - 32 - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()
$g.FillPath($accent, $path)

$g.FillRectangle($white, 140, 300, 744, 28)
$g.FillRectangle($wood, 250, 328, 56, 120)
$g.FillRectangle($wood, 496, 328, 56, 120)
$g.FillRectangle($wood, 740, 328, 56, 120)
$g.FillRectangle($white, 212, 452, 600, 300)

$bmp.Save((Join-Path $PSScriptRoot '..\app-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output 'app-icon.png generado'
