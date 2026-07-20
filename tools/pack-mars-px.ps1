# Asset packer for MARS OR BUST -> games/mars-or-bust.px.js
# Doge animation frames: union-bbox crop (feet aligned), bottom-anchored.
# Enemies: promoted 1-direction objects, own bbox, centered. ASCII-only comments (PS 5.1).
# Run: powershell -ExecutionPolicy Bypass -File tools\pack-mars-px.ps1
Add-Type -AssemblyName System.Drawing

$out = 'D:\Sharky\game-engine\games\mars-or-bust.px.js'
$tmp = Join-Path $env:TEMP 'mars-frames'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$B = 'https://backblaze.pixellab.ai/file/pixellab-characters'
$P = '6a405a9b-fa75-4e82-9b84-e39943e65050'
$DOGE = "$B/$P/0150ddf9-d8b5-4132-8675-7c524594fe64"
$ANI = "$DOGE/animations"
$OBJ = "$B/objects/$P"

$RUN  = "$ANI/10f616cb-c5a8-4fcf-b49e-61ebb3455d09/east"
$JUMP = "$ANI/cd7181ee-42bc-47b0-a900-e582a188c0df/east"
$IDLE = "$ANI/54bfb84d-7263-4b13-be6b-b26070a28825/east"

$groups = @{
  doge = @(
    @{ k='doge_idle_0'; u="$IDLE/1.png" },
    @{ k='doge_run_0';  u="$RUN/0.png" },
    @{ k='doge_run_1';  u="$RUN/1.png" },
    @{ k='doge_run_2';  u="$RUN/2.png" },
    @{ k='doge_run_3';  u="$RUN/3.png" },
    @{ k='doge_run_4';  u="$RUN/4.png" },
    @{ k='doge_run_5';  u="$RUN/5.png" },
    @{ k='doge_jump_0'; u="$JUMP/1.png" },
    @{ k='doge_jump_1'; u="$JUMP/2.png" },
    @{ k='doge_jump_2'; u="$JUMP/3.png" },
    @{ k='doge_jump_3'; u="$JUMP/4.png" },
    @{ k='doge_fall_0'; u="$JUMP/5.png" },
    @{ k='doge_fall_1'; u="$JUMP/6.png" }
  )
}

$singles = @(
  @{ k='gremlin'; u="$OBJ/19f19bfd-9d02-4ce8-b303-bcf696018b72/rotations/unknown.png"; mode='center'; max=96 },
  @{ k='sat';     u="$OBJ/f2817f7b-b6e2-4df7-b59a-049625039ca3/rotations/unknown.png"; mode='center'; max=96 }
)

function Get-Bbox($bmp) {
  $minX=$bmp.Width; $minY=$bmp.Height; $maxX=-1; $maxY=-1
  for ($y=0; $y -lt $bmp.Height; $y++) {
    for ($x=0; $x -lt $bmp.Width; $x++) {
      if ($bmp.GetPixel($x,$y).A -gt 15) {
        if ($x -lt $minX) {$minX=$x}; if ($x -gt $maxX) {$maxX=$x}
        if ($y -lt $minY) {$minY=$y}; if ($y -gt $maxY) {$maxY=$y}
      }
    }
  }
  return @($minX,$minY,$maxX,$maxY)
}
function Save-B64($dst) {
  $ms = New-Object System.IO.MemoryStream
  $dst.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $b64 = [Convert]::ToBase64String($ms.ToArray()); $ms.Dispose()
  return 'data:image/png;base64,' + $b64
}

$assets = [ordered]@{}
foreach ($g in $groups.Keys) {
  $items = $groups[$g]; $bmps = @{}
  foreach ($it in $items) {
    $f = Join-Path $tmp ($it.k + '.png')
    try { Invoke-WebRequest -Uri $it.u -OutFile $f -UseBasicParsing -ErrorAction Stop | Out-Null }
    catch { Write-Output ("SKIP {0}: download failed" -f $it.k); continue }
    $bmps[$it.k] = New-Object System.Drawing.Bitmap($f)
  }
  $u = @([int]::MaxValue, [int]::MaxValue, -1, -1)
  foreach ($k in $bmps.Keys) {
    $bb = Get-Bbox $bmps[$k]; if ($bb[2] -lt 0) { continue }
    if ($bb[0] -lt $u[0]) {$u[0]=$bb[0]}; if ($bb[1] -lt $u[1]) {$u[1]=$bb[1]}
    if ($bb[2] -gt $u[2]) {$u[2]=$bb[2]}; if ($bb[3] -gt $u[3]) {$u[3]=$bb[3]}
  }
  $cw = $u[2]-$u[0]+1; $chh = $u[3]-$u[1]+1; $side = [Math]::Max($cw, $chh)
  Write-Output ("group {0}: union bbox {1}x{2} -> {3}x{3}" -f $g, $cw, $chh, $side)
  foreach ($it in $items) {
    if (-not $bmps.ContainsKey($it.k)) { continue }
    $src = $bmps[$it.k]
    $dst = New-Object System.Drawing.Bitmap($side, $side)
    $gr = [System.Drawing.Graphics]::FromImage($dst); $gr.Clear([System.Drawing.Color]::Transparent)
    $dx = [int](($side - $cw) / 2); $dy = $side - $chh
    $gr.DrawImage($src,
      (New-Object System.Drawing.Rectangle($dx, $dy, $cw, $chh)),
      (New-Object System.Drawing.Rectangle($u[0], $u[1], $cw, $chh)),
      [System.Drawing.GraphicsUnit]::Pixel)
    $assets[$it.k] = Save-B64 $dst
    $gr.Dispose(); $dst.Dispose(); $src.Dispose()
  }
}

foreach ($it in $singles) {
  $f = Join-Path $tmp ('s_' + $it.k + '.png')
  try { Invoke-WebRequest -Uri $it.u -OutFile $f -UseBasicParsing -ErrorAction Stop | Out-Null }
  catch { Write-Output ("SKIP {0}: download failed" -f $it.k); continue }
  $src = New-Object System.Drawing.Bitmap($f)
  $bb = Get-Bbox $src
  if ($bb[2] -lt 0) { Write-Output ("SKIP {0}: empty" -f $it.k); $src.Dispose(); continue }
  $cw = $bb[2]-$bb[0]+1; $chh = $bb[3]-$bb[1]+1; $side = [Math]::Max($cw, $chh)
  $dst = New-Object System.Drawing.Bitmap($side, $side)
  $gr = [System.Drawing.Graphics]::FromImage($dst); $gr.Clear([System.Drawing.Color]::Transparent)
  $dx = [int](($side - $cw) / 2)
  $dy = if ($it.mode -eq 'center') { [int](($side - $chh) / 2) } else { $side - $chh }
  $gr.DrawImage($src,
    (New-Object System.Drawing.Rectangle($dx, $dy, $cw, $chh)),
    (New-Object System.Drawing.Rectangle($bb[0], $bb[1], $cw, $chh)),
    [System.Drawing.GraphicsUnit]::Pixel)
  $gr.Dispose(); $src.Dispose()
  if ($it.max -and $side -gt $it.max) {
    $ns = [int]$it.max
    $small = New-Object System.Drawing.Bitmap($ns, $ns)
    $g2 = [System.Drawing.Graphics]::FromImage($small)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g2.DrawImage($dst, 0, 0, $ns, $ns); $g2.Dispose(); $dst.Dispose(); $dst = $small; $side = $ns
  }
  $assets[$it.k] = Save-B64 $dst; $dst.Dispose()
  Write-Output ("ok {0}: {1}x{2} -> {3}" -f $it.k, $cw, $chh, $side)
}

$json = $assets | ConvertTo-Json -Compress
$body = "/* AUTOGENERATED by tools/pack-mars-px.ps1 - do not edit. */`r`nmodule.exports = $json;`r`n"
[IO.File]::WriteAllText($out, $body, (New-Object System.Text.UTF8Encoding($false)))
$kb = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Output ("OK: $out keys=$($assets.Count) size=${kb}KB")
