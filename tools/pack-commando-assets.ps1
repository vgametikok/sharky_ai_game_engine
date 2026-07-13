# Asset packer for SHARKY COMMANDO -> games/shark-commando.assets.js
# Downloads PixelLab frames (east direction only; the engine mirrors west),
# normalizes each character set with a SINGLE union-bbox crop (so animation
# frames stay aligned), anchors bottom-center on a square canvas, and embeds
# everything as base64 data URLs. ASCII-only (PS 5.1 mangles non-BOM Cyrillic).
# Run:  powershell -ExecutionPolicy Bypass -File tools\pack-commando-assets.ps1
Add-Type -AssemblyName System.Drawing

$out = 'D:\Sharky\game-engine\games\shark-commando.assets.js'
$tmp = Join-Path $env:TEMP 'commando-frames'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$B = 'https://backblaze.pixellab.ai/file/pixellab-characters'
$HERO = "$B/6a405a9b-fa75-4e82-9b84-e39943e65050/24d0c558-4573-4be4-b449-daf982e1d159/animations"
$CRAB = "$B/6a405a9b-fa75-4e82-9b84-e39943e65050/a32bbb8e-0112-467c-8dc4-58d2c3963a91/animations"
$BARON = "$B/6a405a9b-fa75-4e82-9b84-e39943e65050/bf7eb3c7-b3bd-4c14-9eac-bf3939d99351/animations"
$DRONE = "$B/objects/6a405a9b-fa75-4e82-9b84-e39943e65050/8b1652e1-f3bd-48f8-80ae-214366f01dc5/rotations/unknown.png"

# manifest: group -> list of @{key; url}
$groups = @{
  hero = @(
    @{ k='hero_idle_0';  u="$HERO/4ee92ef1-f910-4854-9e16-549f724fbbf6/east/0.png" },
    @{ k='hero_idle_1';  u="$HERO/4ee92ef1-f910-4854-9e16-549f724fbbf6/east/1.png" },
    @{ k='hero_idle_2';  u="$HERO/4ee92ef1-f910-4854-9e16-549f724fbbf6/east/2.png" },
    @{ k='hero_idle_3';  u="$HERO/4ee92ef1-f910-4854-9e16-549f724fbbf6/east/3.png" },
    @{ k='hero_run_0';   u="$HERO/24d98638-e2b6-42a4-9f8d-7df4434c7c61/east/0.png" },
    @{ k='hero_run_1';   u="$HERO/24d98638-e2b6-42a4-9f8d-7df4434c7c61/east/1.png" },
    @{ k='hero_run_2';   u="$HERO/24d98638-e2b6-42a4-9f8d-7df4434c7c61/east/2.png" },
    @{ k='hero_run_3';   u="$HERO/24d98638-e2b6-42a4-9f8d-7df4434c7c61/east/3.png" },
    @{ k='hero_run_4';   u="$HERO/24d98638-e2b6-42a4-9f8d-7df4434c7c61/east/4.png" },
    @{ k='hero_run_5';   u="$HERO/24d98638-e2b6-42a4-9f8d-7df4434c7c61/east/5.png" },
    @{ k='hero_jump_1';  u="$HERO/9f4bb6a5-db18-4c8e-8dae-561d0797fbd1/east/1.png" },
    @{ k='hero_jump_2';  u="$HERO/9f4bb6a5-db18-4c8e-8dae-561d0797fbd1/east/2.png" },
    @{ k='hero_jump_3';  u="$HERO/9f4bb6a5-db18-4c8e-8dae-561d0797fbd1/east/3.png" },
    @{ k='hero_jump_4';  u="$HERO/9f4bb6a5-db18-4c8e-8dae-561d0797fbd1/east/4.png" },
    @{ k='hero_shoot_1'; u="$HERO/93962e5c-f8ab-4623-ba29-c0b0cd1872d7/east/1.png" },
    @{ k='hero_shoot_2'; u="$HERO/93962e5c-f8ab-4623-ba29-c0b0cd1872d7/east/2.png" }
  )
  crab = @(
    @{ k='crab_walk_0'; u="$CRAB/3fa1e459-da9b-4edc-895c-4050f85a94e2/east/0.png" },
    @{ k='crab_walk_1'; u="$CRAB/3fa1e459-da9b-4edc-895c-4050f85a94e2/east/1.png" },
    @{ k='crab_walk_2'; u="$CRAB/3fa1e459-da9b-4edc-895c-4050f85a94e2/east/2.png" },
    @{ k='crab_walk_3'; u="$CRAB/3fa1e459-da9b-4edc-895c-4050f85a94e2/east/3.png" }
  )
  drone = @(
    @{ k='drone_0'; u=$DRONE }
  )
  turtle = @(
    @{ k='turtle_0'; u="$B/6a405a9b-fa75-4e82-9b84-e39943e65050/56190410-f226-4c37-97ab-03103dfbbe87/rotations/east.png" }
  )
}
# baron animation id: set $env:BARON_ANIM before running once the walk is ready
if ($env:BARON_ANIM) {
  $groups['baron'] = @(
    @{ k='baron_walk_0'; u="$BARON/$($env:BARON_ANIM)/east/0.png" },
    @{ k='baron_walk_1'; u="$BARON/$($env:BARON_ANIM)/east/1.png" },
    @{ k='baron_walk_2'; u="$BARON/$($env:BARON_ANIM)/east/2.png" },
    @{ k='baron_walk_3'; u="$BARON/$($env:BARON_ANIM)/east/3.png" }
  )
}

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

$assets = [ordered]@{}
foreach ($g in $groups.Keys) {
  $items = $groups[$g]
  $bmps = @{}
  # download
  foreach ($it in $items) {
    $f = Join-Path $tmp ($it.k + '.png')
    if (-not (Test-Path $f)) { Invoke-WebRequest -Uri $it.u -OutFile $f -UseBasicParsing | Out-Null }
    $bmps[$it.k] = New-Object System.Drawing.Bitmap($f)
  }
  # union bbox across all frames of the group
  $u = @([int]::MaxValue, [int]::MaxValue, -1, -1)
  foreach ($k in $bmps.Keys) {
    $bb = Get-Bbox $bmps[$k]
    if ($bb[2] -lt 0) { continue }
    if ($bb[0] -lt $u[0]) {$u[0]=$bb[0]}; if ($bb[1] -lt $u[1]) {$u[1]=$bb[1]}
    if ($bb[2] -gt $u[2]) {$u[2]=$bb[2]}; if ($bb[3] -gt $u[3]) {$u[3]=$bb[3]}
  }
  $cw = $u[2]-$u[0]+1; $chh = $u[3]-$u[1]+1
  $side = [Math]::Max($cw, $chh)
  Write-Output ("group {0}: union bbox {1}x{2} -> canvas {3}x{3}" -f $g, $cw, $chh, $side)
  # crop same rect from every frame, anchor bottom-center on square canvas
  foreach ($it in $items) {
    $src = $bmps[$it.k]
    $dst = New-Object System.Drawing.Bitmap($side, $side)
    $gr = [System.Drawing.Graphics]::FromImage($dst)
    $gr.Clear([System.Drawing.Color]::Transparent)
    $dx = [int](($side - $cw) / 2)
    $dy = $side - $chh
    $gr.DrawImage($src,
      (New-Object System.Drawing.Rectangle($dx, $dy, $cw, $chh)),
      (New-Object System.Drawing.Rectangle($u[0], $u[1], $cw, $chh)),
      [System.Drawing.GraphicsUnit]::Pixel)
    $ms = New-Object System.IO.MemoryStream
    $dst.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $assets[$it.k] = 'data:image/png;base64,' + [Convert]::ToBase64String($ms.ToArray())
    $ms.Dispose(); $gr.Dispose(); $dst.Dispose(); $src.Dispose()
  }
}

$json = $assets | ConvertTo-Json -Compress
$body = "/* AUTOGENERATED by tools/pack-commando-assets.ps1 - do not edit. */`r`nmodule.exports = $json;`r`n"
[IO.File]::WriteAllText($out, $body, (New-Object System.Text.UTF8Encoding($false)))
$kb = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Output ("OK: $out keys=$($assets.Count) size=${kb}KB")
