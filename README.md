# MRI Calm Daily Workflow CLI

`mri_calm_cli.py` generates the exact day scaffold for MRI Calm from the JSON plan.

## Usage

```bash
python mri_calm_cli.py <week> <day> [--base-dir MRI_Calm] [--plan-json MRI_Calm_Next30_W04D05_to_W08D06.json]
```

Example:

```bash
python mri_calm_cli.py 4 5 --base-dir MRI_Calm --plan-json MRI_Calm_Next30_W04D05_to_W08D06.json
```

## What it creates

For `week=4`, `day=5`:

- `MRI_Calm/Week_04/Day_05/01_mp3s/` with 3 placeholder `.mp3` files from the plan.
- `MRI_Calm/Week_04/Day_05/02_thumbnails/` with 3 placeholder `.png` files using naming conventions.
- `MRI_Calm/Week_04/Day_05/03_blog/` with `youtube_link.txt`, `blog_url.txt`, and `tags.txt`.
- `MRI_Calm/Week_04/Day_05/04_publish/`.
- `MRI_Calm/Week_04/Day_05/blog_post_day05.html` prefilled with track sections, embed placeholder, disclaimer, navigation placeholders, and affiliate block.

## Notes

- Week/day directory names are zero-padded (`Week_04`, `Day_05`).
- Track metadata comes from the JSON plan entry for the selected week/day.
- Existing files are not deleted; placeholders are created with `exist_ok=True` semantics.

## Troubleshooting (Windows + VS Code)

- If `python .\mri_calm_cli.py ...` says `No such file or directory`, the repo has not been downloaded to your PC (or you are in the wrong folder).
  1. Download/clone this repo to your machine.
  2. Open a terminal in that folder.
  3. Confirm files exist:

     ```powershell
     ls mri_calm_cli.py README.md
     ```

- `--plan-json` is optional. The script already has a default plan filename.
  Use `--plan-json` only when your JSON file is stored somewhere else:

  ```powershell
  python .\mri_calm_cli.py 3 6 --plan-json "C:\full\path\MRI_Calm_Next30_W04D05_to_W08D06.json"
  ```

- Show all CLI options at any time:

  ```powershell
  python .\mri_calm_cli.py --help
  ```
