param(
  [string]$WeekRoot = "C:\Users\jlord\Downloads\12 hours mri music\MRI Calm\Week_03",
  [int]$Day = 5
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $WeekRoot)) {
  throw "WeekRoot not found: $WeekRoot"
}

$DayDir = Join-Path $WeekRoot ("Day_{0:D2}" -f $Day)
$folders = @(
  "01_suno_prompts",
  "02_audio_source",
  "02_audio_selected",
  "03_audio_renders",
  "03_premiere_project",
  "04_thumbnails",
  "05_exports",
  "06_blog",
  "07_metadata",
  "08_publish"
)

function Ensure-Folder([string]$path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

function Ensure-File([string]$path, [string]$content) {
  if (Test-Path $path) {
    $len = (Get-Item $path).Length
    if ($len -gt 0) { return }
  }
  $parent = Split-Path $path -Parent
  Ensure-Folder $parent
  Set-Content -Path $path -Value $content -Encoding UTF8
}

Ensure-Folder $DayDir
foreach ($f in $folders) {
  Ensure-Folder (Join-Path $DayDir $f)
}

$TitleLine = "MRI Calm · Week 03 · Day 05 — Late Shift Entry · Quiet Continuity · Smooth Setdown"

Ensure-File (Join-Path $DayDir "01_suno_prompts\suno_prompts_no_mri_word.txt") @"
Track 1 — Late Shift Entry (8m)
Calm clinical ambient soundscape for a quiet imaging suite at night. Soft pads, slow breath-like swell, ultra-smooth transitions, long reverb tails, gentle sub-bass support (felt more than heard). Add a subtle “late shift / after-hours terminal hush” feeling as texture only—faint distant air movement, soft nonverbal shimmer, no literal sound effects. Dynamics stay controlled and even; nothing announces itself. Sterile-but-safe, steady, comforting, minimal, low-stimulation.
Exclude: vocals, spoken words, choirs, drums, percussion, beats, lo-fi hiphop, EDM, synthwave, melodic hooks, bright leads, arpeggios, alarm beeps, glitch pops/clicks, harsh transients, distortion, horror drones, cinematic hits, braams, risers, sudden drops, jump-scare tension.

Track 2 — Quiet Continuity (10m)
Deep steady clinical ambient bed that holds one calm state for a long time. Minimal motion, controlled dynamics, soft pads with micro-variation, gentle sub-bass support like a slow internal steadiness (not rhythmic). Continuity feeling: no scene changes, no progress cues, no arrival moments—just smooth, quiet persistence that keeps the nervous system from checking the clock. Wide but soft stereo, clean air, long tails, no bright peaks.
Exclude: vocals, drums, rhythmic percussion, aggressive bass, melodic themes, hooks, arpeggios, bright sparkle, distortion, ticking, obvious pulses, swelling transitions, sharp clicks, glitch, cinematic impacts, tension ramps, dramatic chord changes.

Track 3 — Smooth Setdown (6m)
Soft exit + handoff with warm-but-clinical pads. Same calm room feel, but gently dim the energy—like setting something down without a hard stop. Ultra-smooth fade behavior, long clean tails, subtle shimmer, gentle low-end support. No finale cues, no cadence that signals ending.
Exclude: vocals, drums, big melodic resolution, finale chord movement, bright leads, noisy artifacts, harsh transients, risers, cinematic hits, glitch, distortion, tension arcs, sudden silence, dramatic endings.
"@

Ensure-File (Join-Path $DayDir "07_metadata\youtube_description.txt") @"
Deep Dive AI · MRI Calm — Week 03 · Day 05
Late Shift Entry · Quiet Continuity · Smooth Setdown
Low-stimulation ambient sound for quiet clinical spaces, waiting rooms, rest, and focus.
No vocals. No drums. No sudden changes.

🎧 Watch / Listen on YouTube:
https://youtu.be/E14m2G_0cqU

📖 Full blog post (images + breakdown):
https://deepdiveaipodcast.blogspot.com/2026/02/mri-calm-week-03-day-05-late-shift.html

🎧 Spotify:
https://bit.ly/41Vktg6

📌 Subscribe:
http://bit.ly/44ArQcq

Tracklist — Album Masters
• Week 02 · Day 06 — Steady Anchor
https://deepdiveaipodcast.blogspot.com/2026/01/mri-calm-week-02-day-06-steady-anchor.html
• Floating Clock · Gentle Loop · Quiet Close
https://deepdiveaipodcast.blogspot.com/2026/01/floating-clock-gentle-loop-quiet-close.html
• Held Center · Steady Middle · Soft Continuation
https://deepdiveaipodcast.blogspot.com/2026/01/mri-calm-held-center-steady-middle-soft.html
• Steady Center · Even Middle · Quiet Ease
https://deepdiveaipodcast.blogspot.com/2026/01/steady-center-even-middle-quiet-ease.html
• Re-Settle · Quiet Hold · Gentle Entry
https://deepdiveaipodcast.blogspot.com/2026/01/re-settle-quiet-hold-gentle-entry.html
• Design / Template Reference (build notes)
https://deepdiveaipodcast.blogspot.com/2026/01/root-mri-bg107131f-mri-bg20b2132-mri.html

Optional Comfort & Gentle Preparation
→ Mack’s Ultra Soft Foam Earplugs (33 dB NRR)
https://amzn.to/4qoLLot
→ Bare Home Weighted Blanket (10 lb)
https://amzn.to/4sOymYs
→ Yogasleep Dohm Classic White Noise Machine
https://amzn.to/3Ll1FRG
→ The Anxiety and Phobia Workbook
https://amzn.to/4sTb18a

Follow Deep Dive AI
YouTube: https://bit.ly/447MHDH
Subscribe: http://bit.ly/44ArQcq
Spotify: https://bit.ly/41Vktg6
Blog: https://deepdiveaipodcast.blogspot.com/
Facebook: https://facebook.com/AIWorkflowSolutionsLLC

As an Amazon Associate I earn from qualifying purchases.
"@

Ensure-File (Join-Path $DayDir "07_metadata\youtube_tags_500c.txt") "Deep Dive AI, MRI Calm, ambient, clinical ambient, scan room ambience, low stimulation, no vocals, no drums, sleep sounds, study focus, deep focus, relaxation audio, anxiety relief, stress relief, soothing soundscape, radiology ambience, calm soundscape, steady dynamics, Late Shift Entry, Quiet Continuity, Smooth Setdown, entry middle exit, long ambient, background audio, meditation, waiting room, calm clinic, teal glow"

Ensure-File (Join-Path $DayDir "07_metadata\facebook_post.txt") @"
New calm drop is live: Week 03 · Day 05 — Late Shift Entry · Quiet Continuity · Smooth Setdown (Entry → steady middle → exit).

If your brain has been running loud all day, this is a lights-down, volume-down kind of session — no vocals, no drums, no jumpy changes. Just steady, low-stimulation calm you can reuse like a preset.

▶ Watch / Listen (YouTube): https://youtu.be/E14m2G_0cqU
📖 Full blog post (images + breakdown): https://deepdiveaipodcast.blogspot.com/2026/02/mri-calm-week-03-day-05-late-shift.html

#DeepDiveAI #MRICalm #Ambient #Focus #SleepSounds
"@

Write-Host ""
Write-Host "Created/verified: $DayDir"
Write-Host ""
cmd /c tree "$DayDir" /F
