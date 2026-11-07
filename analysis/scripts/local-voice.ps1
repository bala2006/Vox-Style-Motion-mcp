# Placeholder narration until ELEVENLABS_API_KEY is set.
# Uses the Windows speech engine (offline) to make one WAV per scene and records when each
# narration word starts, so the spec's word anchors sync to the speech.
# Usage: powershell -File analysis/scripts/local-voice.ps1 -Spec examples/india-llm-demo.json -OutDir out/voice/india-local
param(
  [Parameter(Mandatory)] [string]$Spec,
  [Parameter(Mandatory)] [string]$OutDir,
  [string]$Voice = "Microsoft Ravi",
  [int]$Rate = 1
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
New-Item -ItemType Directory -Force $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path
$specObj = Get-Content $Spec -Raw | ConvertFrom-Json
$voiceover = [ordered]@{}

foreach ($scene in $specObj.scenes) {
  if (-not $scene.narration) { continue }
  $text = [string]$scene.narration
  # narration tokens with their character spans
  $tokens = @()
  foreach ($m in [regex]::Matches($text, '\S+')) { $tokens += [pscustomobject]@{ text = $m.Value; pos = $m.Index; end = $m.Index + $m.Length; start = $null } }

  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try { $synth.SelectVoice($Voice) } catch { Write-Warning "Voice '$Voice' not available, using default" }
  $synth.Rate = $Rate
  $wav = Join-Path $OutDir ("{0}.wav" -f ($scene.id -replace '[^\w-]', '_'))
  $synth.SetOutputToWaveFile($wav)
  $events = New-Object System.Collections.ArrayList
  $synth.add_SpeakProgress({ param($s, $e) [void]$events.Add(@($e.CharacterPosition, $e.AudioPosition.TotalSeconds)) })
  $synth.Speak($text)
  $synth.SetOutputToNull()
  $synth.Dispose()

  foreach ($ev in $events) {
    $tok = $tokens | Where-Object { $ev[0] -ge $_.pos -and $ev[0] -lt $_.end } | Select-Object -First 1
    if ($tok -and $null -eq $tok.start) { $tok.start = [double]$ev[1] }
  }
  # WAV duration from the data size (PCM header is 44 bytes)
  $fi = Get-Item $wav
  $bytes = [System.IO.File]::ReadAllBytes($wav)
  $byteRate = [BitConverter]::ToInt32($bytes, 28)
  $duration = ($fi.Length - 44) / $byteRate

  # fill tokens the engine did not report by interpolating between neighbours
  for ($i = 0; $i -lt $tokens.Count; $i++) {
    if ($null -ne $tokens[$i].start) { continue }
    $prev = if ($i -gt 0) { $tokens[$i - 1].start } else { 0 }
    $next = $duration
    for ($j = $i + 1; $j -lt $tokens.Count; $j++) { if ($null -ne $tokens[$j].start) { $next = $tokens[$j].start; break } }
    $tokens[$i].start = $prev + ($next - $prev) * 0.5
  }
  $words = @()
  for ($i = 0; $i -lt $tokens.Count; $i++) {
    $end = if ($i + 1 -lt $tokens.Count) { $tokens[$i + 1].start } else { $duration }
    $words += [ordered]@{ text = $tokens[$i].text; start = [math]::Round($tokens[$i].start, 3); end = [math]::Round($end, 3) }
  }
  $voiceover[$scene.id] = [ordered]@{ audio = $wav; duration = [math]::Round($duration, 3); words = $words }
  Write-Host ("{0}: {1:N2}s, {2} words, {3} timing events" -f $scene.id, $duration, $tokens.Count, $events.Count)
}

$specObj | Add-Member -NotePropertyName voiceover -NotePropertyValue $voiceover -Force
$outSpec = Join-Path $OutDir "spec.voiced.json"
$specObj | ConvertTo-Json -Depth 30 | Set-Content $outSpec -Encoding UTF8
Write-Host "wrote $outSpec"
