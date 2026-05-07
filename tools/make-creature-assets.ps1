Add-Type -AssemblyName System.Drawing

$source = "C:\Users\wuyan\.codex\generated_images\019dfc3b-c278-73b3-a882-cf1f27064e02\ig_026c1421469429030169fc276a7c5881918d7ebf4621ec0058.png"
$outDir = Join-Path (Get-Location) "src\assets\creatures"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$creatures = @(
  @{ id = "mossbun";  rect = @(45, 108, 350, 640); hue = 48;  sat = 1.25; val = 1.10 },
  @{ id = "emberpup"; rect = @(395, 158, 345, 560); hue = 190; sat = 1.18; val = 1.12 },
  @{ id = "tidetot";  rect = @(745, 230, 390, 500); hue = 286; sat = 1.16; val = 1.10 },
  @{ id = "volthorn"; rect = @(1148, 170, 375, 570); hue = 235; sat = 1.35; val = 0.86 },
  @{ id = "moonmew";  rect = @(1485, 220, 350, 530); hue = 330; sat = 1.18; val = 1.12 }
)

function New-TransparentCrop {
  param([System.Drawing.Bitmap]$Image, [int]$X, [int]$Y, [int]$W, [int]$H)

  $W = [Math]::Min($W, $Image.Width - $X)
  $H = [Math]::Min($H, $Image.Height - $Y)
  $crop = New-Object System.Drawing.Bitmap $W, $H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($yy = 0; $yy -lt $H; $yy++) {
    for ($xx = 0; $xx -lt $W; $xx++) {
      $color = $Image.GetPixel($X + $xx, $Y + $yy)
      $crop.SetPixel($xx, $yy, [System.Drawing.Color]::FromArgb(255, $color.R, $color.G, $color.B))
    }
  }

  Remove-ConnectedBackground $crop
  return Trim-Transparent $crop 28
}

function Test-BackgroundPixel {
  param([System.Drawing.Color]$Color)

  $max = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
  $min = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))
  return ($max - $min -lt 34) -and ($Color.R -gt 154) -and ($Color.G -gt 154) -and ($Color.B -gt 154)
}

function Remove-ConnectedBackground {
  param([System.Drawing.Bitmap]$Image)

  $visited = New-Object 'bool[,]' $Image.Width, $Image.Height
  $queue = New-Object System.Collections.Generic.Queue[object]
  function Add-Point {
    param([int]$PointX, [int]$PointY)
    $queue.Enqueue([int[]]@($PointX, $PointY))
  }

  for ($x = 0; $x -lt $Image.Width; $x++) {
    Add-Point $x 0
    Add-Point $x ($Image.Height - 1)
  }
  for ($y = 0; $y -lt $Image.Height; $y++) {
    Add-Point 0 $y
    Add-Point ($Image.Width - 1) $y
  }

  while ($queue.Count -gt 0) {
    $point = $queue.Dequeue()
    $x = [int]$point[0]
    $y = [int]$point[1]
    if ($x -lt 0 -or $y -lt 0 -or $x -ge $Image.Width -or $y -ge $Image.Height -or $visited[$x, $y]) {
      continue
    }
    $visited[$x, $y] = $true
    $color = $Image.GetPixel($x, $y)
    if (-not (Test-BackgroundPixel $color)) {
      continue
    }

    $Image.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $color.R, $color.G, $color.B))
    Add-Point ($x + 1) $y
    Add-Point ($x - 1) $y
    Add-Point $x ($y + 1)
    Add-Point $x ($y - 1)
  }
}

function Trim-Transparent {
  param([System.Drawing.Bitmap]$Image, [int]$Padding)

  $minX = $Image.Width
  $minY = $Image.Height
  $maxX = 0
  $maxY = 0
  for ($y = 0; $y -lt $Image.Height; $y++) {
    for ($x = 0; $x -lt $Image.Width; $x++) {
      if ($Image.GetPixel($x, $y).A -gt 0) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  $newW = ($maxX - $minX + 1) + $Padding * 2
  $newH = ($maxY - $minY + 1) + $Padding * 2
  $trim = New-Object System.Drawing.Bitmap $newW, $newH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gfx = [System.Drawing.Graphics]::FromImage($trim)
  $gfx.Clear([System.Drawing.Color]::Transparent)
  $gfx.DrawImage($Image, $Padding, $Padding, (New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)), [System.Drawing.GraphicsUnit]::Pixel)
  $gfx.Dispose()
  $Image.Dispose()
  return $trim
}

function ConvertTo-HsvColor {
  param([System.Drawing.Color]$Color, [double]$TargetHue, [double]$SatMul, [double]$ValMul)

  if ($Color.A -eq 0) { return $Color }
  $h = $TargetHue
  $s = [Math]::Min(1.0, [Math]::Max(0.12, ($Color.GetSaturation() * $SatMul) + 0.12))
  $v = [Math]::Min(1.0, [Math]::Max(0.0, ([Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B)) / 255.0) * $ValMul))
  return New-HsvColor $Color.A $h $s $v
}

function New-HsvColor {
  param([int]$Alpha, [double]$Hue, [double]$Sat, [double]$Val)

  $c = $Val * $Sat
  $x = $c * (1 - [Math]::Abs((($Hue / 60) % 2) - 1))
  $m = $Val - $c
  $r = 0.0; $g = 0.0; $b = 0.0
  if ($Hue -lt 60) { $r = $c; $g = $x }
  elseif ($Hue -lt 120) { $r = $x; $g = $c }
  elseif ($Hue -lt 180) { $g = $c; $b = $x }
  elseif ($Hue -lt 240) { $g = $x; $b = $c }
  elseif ($Hue -lt 300) { $r = $x; $b = $c }
  else { $r = $c; $b = $x }

  return [System.Drawing.Color]::FromArgb($Alpha, [int](($r + $m) * 255), [int](($g + $m) * 255), [int](($b + $m) * 255))
}

function New-ShinyVariant {
  param([System.Drawing.Bitmap]$Normal, [double]$Hue, [double]$Sat, [double]$Val)

  $shiny = New-Object System.Drawing.Bitmap $Normal.Width, $Normal.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $Normal.Height; $y++) {
    for ($x = 0; $x -lt $Normal.Width; $x++) {
      $color = $Normal.GetPixel($x, $y)
      if ($color.A -eq 0) {
        $shiny.SetPixel($x, $y, $color)
      } elseif ($color.GetBrightness() -gt 0.78 -and $color.GetSaturation() -lt 0.28) {
        $shiny.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($color.A, [Math]::Min(255, [int]($color.R * 1.08)), [Math]::Min(255, [int]($color.G * 1.05)), [Math]::Min(255, [int]($color.B * 1.18))))
      } else {
        $shiny.SetPixel($x, $y, (ConvertTo-HsvColor $color $Hue $Sat $Val))
      }
    }
  }

  Add-Sparkles $shiny
  return $shiny
}

function Add-Sparkles {
  param([System.Drawing.Bitmap]$Image)

  $gfx = [System.Drawing.Graphics]::FromImage($Image)
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 255, 248, 166)), 3
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 255, 255, 255))
  $points = @(
    @(0.28, 0.22, 10), @(0.72, 0.24, 8), @(0.38, 0.48, 7), @(0.66, 0.56, 9), @(0.50, 0.76, 7)
  )
  foreach ($point in $points) {
    $cx = [int]($Image.Width * $point[0])
    $cy = [int]($Image.Height * $point[1])
    $r = [int]$point[2]
    $gfx.DrawLine($pen, $cx - $r, $cy, $cx + $r, $cy)
    $gfx.DrawLine($pen, $cx, $cy - $r, $cx, $cy + $r)
    $gfx.FillEllipse($brush, $cx - 2, $cy - 2, 4, 4)
  }
  $pen.Dispose()
  $brush.Dispose()
  $gfx.Dispose()
}

$sheet = [System.Drawing.Bitmap]::FromFile($source)
foreach ($creature in $creatures) {
  $rect = $creature.rect
  $normal = New-TransparentCrop $sheet $rect[0] $rect[1] $rect[2] $rect[3]
  $normalPath = Join-Path $outDir "$($creature.id)-normal.png"
  $shinyPath = Join-Path $outDir "$($creature.id)-shiny.png"
  $normal.Save($normalPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $shiny = New-ShinyVariant $normal $creature.hue $creature.sat $creature.val
  $shiny.Save($shinyPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $normal.Dispose()
  $shiny.Dispose()
}
$sheet.Dispose()

Write-Host "Creature assets written to $outDir"
