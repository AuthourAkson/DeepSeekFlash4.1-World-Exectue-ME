# _tools/ocr.ps1 — 用 Windows 自带 OCR 把帧里的文字读出来
#   powershell -NoProfile -ExecutionPolicy Bypass -File _tools/ocr.ps1 <图片> [语言标签]
param([Parameter(Mandatory=$true)][string]$Path, [string]$Lang = "")
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $type) {
  $t = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
  $t.Wait(-1) | Out-Null
  $t.Result
}
[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics,ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
$full = (Resolve-Path $Path).Path
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($full)) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bmp = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
if ($Lang -ne "") {
  [Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime] | Out-Null
  $l = [Windows.Globalization.Language]::new($Lang)
  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($l)
} else { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
if (-not $engine) { Write-Output "NO-ENGINE"; exit 1 }
$res = Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
foreach ($line in $res.Lines) {
  $w = @($line.Words)[0]
  $x = 0; $y = 0
  if ($w) { $x = [int]$w.BoundingRect.X; $y = [int]$w.BoundingRect.Y }
  Write-Output ("[{0},{1}] {2}" -f $x, $y, $line.Text)
}
Write-Output ("LINES=" + $res.Lines.Count)
