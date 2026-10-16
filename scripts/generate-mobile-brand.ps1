# Small local app/splash mark, generated with Windows' built-in drawing library.
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent $PSScriptRoot
$assetDirectory = Join-Path $taskRoot 'apps/mobile/assets'
New-Item -ItemType Directory -Path $assetDirectory -Force | Out-Null
$bitmap = New-Object System.Drawing.Bitmap 512, 512
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#FAFBF2'))
$green = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#397D28'))
$yellow = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#EDC63C'))
$stem = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#24531C')), 18
$vein = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#EFF6E7')), 5
try {
  $graphics.FillEllipse($yellow, 290, 90, 106, 106)
  $graphics.DrawLine($stem, 250, 245, 235, 396)
  $left = [System.Drawing.Point[]]@([System.Drawing.Point]::new(244,284), [System.Drawing.Point]::new(122,255), [System.Drawing.Point]::new(90,142), [System.Drawing.Point]::new(205,168))
  $right = [System.Drawing.Point[]]@([System.Drawing.Point]::new(247,323), [System.Drawing.Point]::new(355,306), [System.Drawing.Point]::new(420,224), [System.Drawing.Point]::new(312,218))
  $graphics.FillPolygon($green, $left)
  $graphics.FillPolygon($green, $right)
  $graphics.DrawLine($vein, 138, 188, 239, 284)
  $graphics.DrawLine($vein, 250, 320, 373, 250)
  $bitmap.Save((Join-Path $assetDirectory 'brand.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output 'Generated local 512px app/splash mark.'
} finally {
  $vein.Dispose(); $stem.Dispose(); $yellow.Dispose(); $green.Dispose()
  $graphics.Dispose(); $bitmap.Dispose()
}
