#!/usr/bin/env python3
"""CLI scaffolder for MRI Calm daily workflow assets."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

DEFAULT_JSON = "MRI_Calm_Next30_W04D05_to_W08D06.json"


def slugify(text: str) -> str:
    """Convert titles to lowercase underscore slugs."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    return re.sub(r"[\s-]+", "_", cleaned)


def find_day_entry(payload: Any, week: int, day: int) -> dict[str, Any]:
    """Find a day entry by week/day in common JSON shapes."""
    candidates: list[dict[str, Any]] = []

    if isinstance(payload, list):
        candidates = [item for item in payload if isinstance(item, dict)]
    elif isinstance(payload, dict):
        if isinstance(payload.get("days"), list):
            candidates = [item for item in payload["days"] if isinstance(item, dict)]
        elif isinstance(payload.get("data"), list):
            candidates = [item for item in payload["data"] if isinstance(item, dict)]
        else:
            candidates = [payload]

    for item in candidates:
        item_week = item.get("week")
        item_day = item.get("day")
        if item_week == week and item_day == day:
            return item
        bottom_line = str(item.get("bottom_line", ""))
        if re.search(rf"week\s*0?{week}\b", bottom_line, re.IGNORECASE) and re.search(
            rf"day\s*0?{day}\b", bottom_line, re.IGNORECASE
        ):
            return item

    raise ValueError(f"No matching entry for week={week}, day={day} in plan JSON.")


def get_tracks(day_entry: dict[str, Any]) -> list[dict[str, Any]]:
    tracks = day_entry.get("tracks")
    if not isinstance(tracks, list) or len(tracks) < 3:
        raise ValueError("Day entry is missing at least 3 tracks.")

    parsed: list[dict[str, Any]] = []
    for index, track in enumerate(tracks[:3], start=1):
        if not isinstance(track, dict):
            raise ValueError(f"Track {index} is not a valid object.")

        title = str(track.get("main_title") or track.get("title") or f"Track {index}").strip()
        filename = track.get("filename")
        if not filename:
            mins = track.get("target_minutes", "8")
            filename = (
                f"MRI12_W{day_entry['week']:02d}_D{day_entry['day']:02d}"
                f"_T{index:02d}_{slugify(title)}_{mins}m.mp3"
            )
        parsed.append(
            {
                "track_no": index,
                "title": title,
                "filename": str(filename),
                "duration": track.get("target_minutes"),
                "thumbnail_slug": slugify(title),
            }
        )
    return parsed


def build_html(week: int, day: int, tracks: list[dict[str, Any]]) -> str:
    day_label = f"{day:02d}"
    day_title_tracks = " · ".join(track["title"] for track in tracks)

    def thumbnail_name(track: dict[str, Any]) -> str:
        return (
            f"thumb_W{week:02d}_D{day:02d}_T{track['track_no']:02d}_"
            f"{track['thumbnail_slug']}_16x9.png"
        )

    track_blocks = []
    for track in tracks:
        block = f"""
  <hr class=\"mri-rule\" />
  <h2 class=\"mri-h3\">Track {track['track_no']} — {track['title']}</h2>
  <div class=\"separator\" style=\"clear: both; text-align: center;\">
    <img src=\"02_thumbnails/{thumbnail_name(track)}\" alt=\"MRI Calm — {track['title']} thumbnail\" width=\"600\" />
  </div>
  <p class=\"mri-trackp\"><strong>{track['title']}</strong> is designed for extended stillness and consistent calm with no sudden shifts.</p>
  <p class=\"mri-trackp\">This section is ready to edit if you want day-specific language before publishing.</p>
"""
        track_blocks.append(block.rstrip())

    return f"""<style>
.mri-wrap {{ font-family: Arial, sans-serif; line-height: 1.65; color: #e6edf7; background: #0f1623; padding: 20px; border-radius: 12px; }}
.mri-kicker {{ font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #9fb4d9; margin: 0 0 8px; }}
.mri-title {{ margin: 0 0 12px; font-size: 30px; color: #f3f7ff; }}
.mri-sub {{ color: #c9d7ec; margin: 0 0 10px; }}
.mri-h3 {{ margin-top: 20px; color: #f1f6ff; }}
.mri-trackp {{ color: #d6e2f5; }}
.mri-rule {{ border: none; border-top: 1px solid #2f3f5f; margin: 20px 0; }}
.mri-nav a {{ color: #a7c9ff; text-decoration: none; }}
.grid.gear {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 12px; }}
.grid.gear .card {{ border: 1px solid #2f3f5f; border-radius: 10px; padding: 12px; background: #111c2f; }}
.grid.gear .cta {{ color: #8dc3ff; text-decoration: none; }}
.mri-mini a {{ color: #8dc3ff; }}
</style>

<div class=\"mri-wrap\">
  <p class=\"mri-kicker\">MRI Calm · Ongoing Series</p>
  <h1 class=\"mri-title\">MRI Calm — Day {day_label}: {day_title_tracks}</h1>
  <p class=\"mri-sub\">Day {day_label} is structured for consistency and quiet focus. The session avoids dramatic transitions and stays steady from start to end.</p>
  <p class=\"mri-sub\">Use this as background support during scans, waiting periods, or any environment where calm repetition helps.</p>
{''.join(track_blocks)}

  <hr class=\"mri-rule\" />
  <h2 class=\"mri-h3\">Watch / Listen (Day {day_label})</h2>
  <!-- Replace YOUTUBE_VIDEO_ID after upload -->
  <iframe src=\"https://www.youtube.com/embed/YOUTUBE_VIDEO_ID\" style=\"width:100%;aspect-ratio:16/9;border:none;\" allowfullscreen></iframe>

  <p class=\"mri-trackp\"><strong>Disclaimer:</strong> MRI Calm is designed to support comfort and relaxation. It is not medical advice or a substitute for professional care.</p>

  <p class=\"mri-nav\">
    <a href=\"PREVIOUS_DAY_URL\">← Day {max(day-1,1):02d}</a> ·
    <a href=\"NEXT_DAY_URL\">Day {day+1:02d} →</a>
  </p>

  <p class=\"mri-mini\">Listen on <a href=\"https://bit.ly/447MHDH\" target=\"_blank\">YouTube</a> &amp; <a href=\"https://bit.ly/41Vktg6\" target=\"_blank\">Spotify</a>.</p>

  <section class=\"grid gear\" aria-label=\"Creator Desk Essentials\">
    <article class=\"card\">
      <h3>Affiliate Item 1</h3>
      <p>Replace with your recommended desk or audio accessory.</p>
      <a class=\"cta\" href=\"https://amzn.to/REPLACE_ME1\" target=\"_blank\" rel=\"sponsored nofollow noopener\">View on Amazon →</a>
    </article>
    <article class=\"card\">
      <h3>Affiliate Item 2</h3>
      <p>Replace with your second recommended product.</p>
      <a class=\"cta\" href=\"https://amzn.to/REPLACE_ME2\" target=\"_blank\" rel=\"sponsored nofollow noopener\">View on Amazon →</a>
    </article>
  </section>
  <p style=\"font-size:12px;color:#9aa8c0;font-style:italic;\">As an Amazon Associate I earn from qualifying purchases.</p>
</div>
"""


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def create_placeholders(base_dir: Path, week: int, day: int, day_entry: dict[str, Any]) -> list[str]:
    tracks = get_tracks(day_entry)

    day_root = base_dir / f"Week_{week:02d}" / f"Day_{day:02d}"
    mp3_dir = day_root / "01_mp3s"
    thumbs_dir = day_root / "02_thumbnails"
    blog_dir = day_root / "03_blog"
    publish_dir = day_root / "04_publish"
    for folder in (mp3_dir, thumbs_dir, blog_dir, publish_dir):
        folder.mkdir(parents=True, exist_ok=True)

    created: list[str] = []

    for track in tracks:
        mp3_file = mp3_dir / track["filename"]
        mp3_file.touch(exist_ok=True)
        created.append(str(mp3_file))

        thumb_name = (
            f"thumb_W{week:02d}_D{day:02d}_T{track['track_no']:02d}_{track['thumbnail_slug']}_16x9.png"
        )
        thumb_file = thumbs_dir / thumb_name
        thumb_file.touch(exist_ok=True)
        created.append(str(thumb_file))

    tags = day_entry.get("youtube_tags_500c") or day_entry.get("youtube_tags") or ""
    write_text(blog_dir / "youtube_link.txt", "YOUTUBE_URL_OR_VIDEO_ID")
    write_text(blog_dir / "blog_url.txt", "BLOG_POST_URL")
    write_text(blog_dir / "tags.txt", str(tags).strip())
    created.extend([str(blog_dir / "youtube_link.txt"), str(blog_dir / "blog_url.txt"), str(blog_dir / "tags.txt")])

    html_path = day_root / f"blog_post_day{day:02d}.html"
    write_text(html_path, build_html(week, day, tracks))
    created.append(str(html_path))

    return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate MRI Calm day scaffolding from plan JSON.")
    parser.add_argument("week", type=int, help="Week number (e.g. 4)")
    parser.add_argument("day", type=int, help="Day number (e.g. 5)")
    parser.add_argument("--base-dir", default="MRI_Calm", help="Base output directory (default: MRI_Calm)")
    parser.add_argument("--plan-json", default=DEFAULT_JSON, help=f"Path to plan JSON (default: {DEFAULT_JSON})")
    args = parser.parse_args()

    plan_path = Path(args.plan_json)
    if not plan_path.exists():
        raise SystemExit(
            f"Plan JSON not found: {plan_path}\n"
            "Tip: --plan-json is optional. Omit it to use the default plan filename in the current folder, "
            f"or pass an absolute path with --plan-json. Default: {DEFAULT_JSON}"
        )

    payload = json.loads(plan_path.read_text(encoding="utf-8"))
    day_entry = find_day_entry(payload, args.week, args.day)
    created = create_placeholders(Path(args.base_dir), args.week, args.day, day_entry)

    print(f"✅ Created Week_{args.week:02d}/Day_{args.day:02d} structure under {args.base_dir}")
    for item in created:
        print(f"+ {item}")


if __name__ == "__main__":
    main()
