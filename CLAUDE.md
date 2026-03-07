# CLAUDE.md — PT-PT Videos Index

## Project overview

Searchable index of YouTube videos in European Portuguese (pt-PT).
Scraper runs locally; website deploys to GitHub Pages via GitHub Actions.
Full spec: see `FSD.md`.

## Critical constraints

- **NO Brazilian Portuguese** — primary quality concern. Never relax pt-BR filtering.
- **scraper/ is gitignored** — never commit or push anything inside `scraper/`.
- **`data/videos.json` is the only scraper output tracked in git.**
- Claude must not appear as a GitHub contributor.

## Key paths

| Path | Purpose |
|---|---|
| `scraper/scraper.py` | Main scraper — YouTube API + yt-dlp + SQLite + JSON export |
| `scraper/config.json` | API key, quota cap (8000), queries, Telegram bot credentials |
| `scraper/channels.json` | 62 whitelisted pt-PT channels |
| `scraper/videos.db` | SQLite DB — local only, never committed |
| `scraper/run.sh` | Cron wrapper — runs scraper, git push, Telegram notify |
| `scraper/cron.log` | Daily run log |
| `data/videos.json` | Exported video index — tracked in git, read by site |
| `site/index.html` | Main page |
| `site/app.js` | Video grid, search, category filter, stats |
| `site/canais.html` | Channels page |
| `site/canais.js` | Channel grid aggregated from videos.json |
| `site/style.css` | YouTube-dark theme, shared by both pages |
| `.github/workflows/deploy.yml` | GitHub Pages deployment |

## Scraper behaviour

- Cron: **03:00 local time (Europe/Lisbon)** daily.
- Acceptance threshold: `pt_score >= 0.50`.
- Whitelisted channels: accepted without language scoring; yt-dlp availability check still runs.
- Search queries: scored, yt-dlp checked for language and availability.
- Private/removed videos: `get_yt_dlp_info()` returns `"UNAVAILABLE"` sentinel → hard reject.
- To permanently ban a video: `UPDATE videos SET pt_score = -1.0 WHERE video_id = '<id>';` in `videos.db`.

## Category rules

- `detect_infantil()` checks **title only** (not description — causes false positives).
- Known genuine Infantil channels: Zig Zag, Simão Super Coelho, A sala do Girassol, Canal Panda Portugal, Tucantar.
- YouTube `Gaming` category displays as **Videojogos** (translation in `app.js` CATEGORY_PT map).
- When manually fixing categories, always fix **both** `videos.db` AND `data/videos.json`. Fixing only the JSON is temporary — the DB wins on next export.

## Website

- No build step — plain HTML/CSS/JS.
- Stats bar channel count ("N canais") links to `canais.html`.
- Category pills use `CATEGORY_PT` map in `app.js` for display names.
- Both pages share `style.css` and fetch `videos.json` at runtime.

## Telegram notifications

- Bot: `nornotify_bot` (token + chat_id stored in `scraper/config.json`).
- `run.sh` sends a message on completion: video count, channel count, timestamp.

## Git workflow

- `run.sh` handles auto-commit + push of `data/videos.json` after each scraper run.
- `master` branch tracks `origin/master` (set with `--set-upstream`).
- GitHub Actions deploys automatically on push to `master` (paths: `site/**`, `data/videos.json`).
- Check deployment: `https://github.com/norsigmahub/ptpt-videos/actions`
- Live site: `https://norsigmahub.github.io/ptpt-videos/`
