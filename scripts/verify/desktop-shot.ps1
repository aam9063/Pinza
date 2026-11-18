# Captura el escritorio completo, no una sola ventana.
# Hace falta porque la ventana de la línea es transparente y se apoya sobre
# otras aplicaciones.
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$shotsDir = Join-Path $root '.verify\shots'
New-Item -ItemType Directory -Force -Path $shotsDir | Out-Null

$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bitmap.Size)

$target = Join-Path $shotsDir 'desktop.png'
$bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Write-Output "desktop.png escrito en $target ($($bounds.Width)x$($bounds.Height))"
