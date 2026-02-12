param(
  [string]$WeekRoot = "C:\Users\jlord\Downloads\12 hours mri music\MRI Calm\Week_03",
  [int]$Day = 6,
  [string]$SeriesName = "MRI Calm",
  [string]$VideoUrl = "https://youtu.be/VIDEO_ID",
  [string]$BlogPostUrl = "https://deepdiveaipodcast.blogspot.com/2026/02/mri-calm-week-03-day-06-PLACEHOLDER.html",
  [string]$Track01Title = "Steady Anchor",
  [string]$Track02Title = "Quiet Continuity",
  [string]$Track03Title = "Smooth Setdown"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $WeekRoot)) {
  throw "WeekRoot not found: $WeekRoot"
}

$DayDir = Join-Path $WeekRoot ("Day_{0:D2}" -f $Day)
$DayLabel = "Week 03 · Day {0:D2}" -f $Day
$TitleLine = "$SeriesName · $DayLabel — $Track01Title · $Track02Title · $Track03Title"

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
    if ($len -gt 0) {
      return
    }
  }

  $parent = Split-Path $path -Parent
  Ensure-Folder $parent
  Set-Content -Path $path -Value $content -Encoding UTF8
}

Ensure-Folder $DayDir
foreach ($folder in $folders) {
  Ensure-Folder (Join-Path $DayDir $folder)
}

$T01File = ("MRI12_W03_D{0:D2}_T01_{1}_8m.mp3" -f $Day, (($Track01Title -replace '[^a-zA-Z0-9]+','_').Trim('_').ToLower()))
$T02File = ("MRI12_W03_D{0:D2}_T02_{1}_8m.mp3" -f $Day, (($Track02Title -replace '[^a-zA-Z0-9]+','_').Trim('_').ToLower()))
$T03File = ("MRI12_W03_D{0:D2}_T03_{1}_8m.mp3" -f $Day, (($Track03Title -replace '[^a-zA-Z0-9]+','_').Trim('_').ToLower()))

Ensure-File (Join-Path $DayDir "01_suno_prompts\suno_plan.json") @"
{
  "series": "$SeriesName",
  "week": 3,
  "day": $Day,
  "title": "$TitleLine",
  "tempo_bpm": 68,
  "global_style": ["ambient", "instrumental", "low stimulation", "clinical calm"],
  "exclude_master": "vocals, spoken word, drums, percussion, risers, drops, dramatic builds, harsh transients, glitch, jump-scare tension",
  "tracks": [
    {
      "slot": "T01",
      "title": "$Track01Title",
      "target_minutes": 8,
      "filename_mp3": "$T01File",
      "prompt": "Calm clinical ambient soundscape for a quiet imaging suite. Soft pads, long tails, micro-movement only, stable low-end support, no scene changes, no dramatic arc.",
      "exclude": "vocals, drums, hooks, bright leads, cinematic hits"
    },
    {
      "slot": "T02",
      "title": "$Track02Title",
      "target_minutes": 8,
      "filename_mp3": "$T02File",
      "prompt": "Steady middle bed with near-zero melodic motion, predictable dynamics, warm low mids, and soft highs. Feels continuous and safe with no attention cues.",
      "exclude": "vocals, rhythmic percussion, arpeggios, tension ramps"
    },
    {
      "slot": "T03",
      "title": "$Track03Title",
      "target_minutes": 8,
      "filename_mp3": "$T03File",
      "prompt": "Soft setdown with gradual taper and seamless handoff behavior. Keep one continuous calm state, no finale chord movement, no hard stop.",
      "exclude": "vocals, drums, dramatic endings, distortion, sudden silence"
    }
  ]
}
"@

Ensure-File (Join-Path $DayDir "01_suno_prompts\suno_prompts_no_mri_word.txt") @"
$TitleLine

Track 1 — $Track01Title (8m)
Calm clinical ambient bed for a quiet imaging suite. Keep dynamics flat and gentle, add soft pads with long tails and subtle low support. No scene changes and no attention-grabbing moments.
Exclude: vocals, spoken words, choirs, drums, percussion, EDM, bright leads, cinematic hits, harsh transients, glitch.

Track 2 — $Track02Title (8m)
Deep steady middle texture with micro-variation only. Maintain one continuous state, low stimulation, stable tone, smooth stereo spread, and no implied countdown feel.
Exclude: vocals, rhythmic percussion, hooks, arpeggios, distortion, dramatic chord shifts.

Track 3 — $Track03Title (8m)
Soft exit and handoff. Gently dim energy without a finale signal. Keep everything smooth, warm, and predictable through the tail.
Exclude: vocals, drums, risers, impacts, sudden drops, sharp transients, dramatic endings.
"@

Ensure-File (Join-Path $DayDir "02_audio_source\DROP_MP3S_HERE.txt") @"
$TitleLine

Drop generated MP3s in this folder:
- $T01File
- $T02File
- $T03File
"@

Ensure-File (Join-Path $DayDir "02_audio_selected\SELECTED_KEEPERS_HERE.txt") @"
$TitleLine

Copy keeper candidates here before final mastering.
"@

Ensure-File (Join-Path $DayDir "03_audio_renders\FINAL_MASTERS_HERE.txt") @"
$TitleLine

Place mastered finals for edit/export use in this folder.
"@

Ensure-File (Join-Path $DayDir "03_premiere_project\PREMIERE_PROJECT_INSTRUCTIONS.md") @"
# $TitleLine

1. Import mastered audio from `..\\03_audio_renders\\`
2. Add template visual bed + three thumbnails
3. Export to `..\\05_exports\\`
4. Save project file in this folder
"@

Ensure-File (Join-Path $DayDir "04_thumbnails\thumbnail_prompts.txt") @"
$TitleLine

Template lock:
- 16:9 (1280x720)
- consistent tunnel angle, bed position, teal glow, haze, vignette
- text crisp and readable
- watermark: Deep Dive AI (bottom-right)

Overlay text:
Top: • $SeriesName •
Main: <TITLE>
Bottom: Week 03 · Day $([string]::Format('{0:D2}', $Day))

THUMB 1 — $Track01Title
PROMPT: PLACEHOLDER

THUMB 2 — $Track02Title
PROMPT: PLACEHOLDER

THUMB 3 — $Track03Title
PROMPT: PLACEHOLDER
"@

Ensure-File (Join-Path $DayDir "04_thumbnails\DROP_THUMBNAILS_HERE.txt") @"
$TitleLine

Drop final 1280x720 thumbnails in this folder.
"@

Ensure-File (Join-Path $DayDir "05_exports\DROP_EXPORTS_HERE.txt") @"
$TitleLine

Drop final video exports here.
"@

Ensure-File (Join-Path $DayDir "06_blog\blog_post_PLACEHOLDER.html") @"
<!-- $TitleLine -->
<!-- Keep your styled post body here. Replace placeholders only; preserve reusable sections. -->
"@

Ensure-File (Join-Path $DayDir "07_metadata\youtube_description.txt") @"
$TitleLine

🎧 Watch / Listen on YouTube:
$VideoUrl

📖 Full blog post (images + breakdown):
$BlogPostUrl

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

Ensure-File (Join-Path $DayDir "07_metadata\youtube_tags_500c.txt") @"
Deep Dive AI, MRI Calm, ambient, clinical ambient, scan room ambience, low stimulation, no vocals, no drums, sleep sounds, study focus, deep focus, relaxation audio, anxiety relief, stress relief, soothing soundscape, radiology ambience, calm soundscape, steady dynamics, $Track01Title, $Track02Title, $Track03Title, entry middle exit, long ambient, background audio, meditation, waiting room, calm clinic, teal glow
"@

Ensure-File (Join-Path $DayDir "07_metadata\facebook_post.txt") @"
New calm drop is live: $DayLabel — $Track01Title · $Track02Title · $Track03Title.

If your brain has been running loud all day, this is a lights-down, volume-down session — no vocals, no drums, no jumpy changes. Just steady low-stimulation calm.

▶ Watch / Listen (YouTube): $VideoUrl
📖 Full blog post: $BlogPostUrl

#DeepDiveAI #MRICalm #Ambient #Focus #SleepSounds
"@

Ensure-File (Join-Path $DayDir "08_publish\publish_notes.md") @"
# $TitleLine

Checklist
- [ ] MP3s saved to 03_audio_renders
- [ ] Thumbnails saved to 04_thumbnails
- [ ] Exports saved to 05_exports
- [ ] YouTube description + tags finalized
- [ ] Facebook post published
- [ ] Blog links verified
"@

Write-Host ""
Write-Host "Created/verified: $DayDir"
Write-Host ""
cmd /c tree "$DayDir" /F
