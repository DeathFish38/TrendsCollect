# TrendsCollect

A single-user Hacker News trend tracker styled like a stock terminal and a newspaper. Track keywords as watchlist tickers, follow their trend scores over time, and drill into the stories behind each topic.

Data comes from the [Algolia HN Search API](https://hn.algolia.com/api); no API key is required.

## Features

- **Stock-style watchlist** with current score, 24-hour change, story volume, sparklines, and last-update time
- **Sortable columns**, keyboard-accessible rows, and quick pause/resume/delete actions
- **Topic detail views** with 24-hour, 7-day, and 30-day history charts
- **Story drill-down** with newest, points, and comments sorting
- **Automatic collection** every 15 minutes by default, plus manual refresh
- **Topic management** for adding, renaming, pausing, resuming, and deleting topics
- **Responsive, accessible UI** with loading skeletons, retry states, notifications, reduced-motion support, and live relative timestamps
- **Local persistence** in SQLite; no external database required

## Tech stack

- **Backend:** Python, Flask, APScheduler, SQLite, Requests
- **Frontend:** React, TypeScript, Vite, TanStack Query, React Router, Recharts
- **Styling:** plain CSS with a serif/monospace newspaper aesthetic

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 20+ and npm

### 1. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API listens on `http://localhost:5001` by default. On startup, the app creates the SQLite database and begins an initial collection.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` requests to Flask on port 5001, so no CORS setup is needed.

## Run everything on one port

Build the frontend, then let Flask serve both the SPA and API:

```bash
cd frontend
npm install
npm run build

cd ../backend
source .venv/bin/activate
python app.py
```

Open **http://localhost:5001**. Flask also serves `index.html` for client-side routes such as `/topics/3`.

## Using the app

1. Add an HN search keyword such as `rust` and an optional display label such as `Rust`.
2. The backend immediately attempts an initial snapshot so the topic does not stay empty until the next scheduled collection.
3. Click a watchlist row to open its chart and captured stories.
4. Use **Refresh** to request a new collection on demand.
5. Pause a topic to stop future collection without deleting its history, or delete it to remove the topic, snapshots, and stories.

If the watchlist is empty, the UI also provides one-click starter topic suggestions.

## Trend score

Each snapshot covers a trailing 24-hour window by default:

```text
story_count  = stories matching the keyword in the lookback window
total_points = sum of min(story points, 200) across those stories
score        = story_count × 10 + total_points
```

The story-count term captures conversation volume, while capped points capture engagement without allowing one large story to dominate the topic.

The displayed daily change is:

```text
pct_change = (latest_score − score_24h_ago) / max(score_24h_ago, 1) × 100
```

A missing prior snapshot is displayed as `—`.

## API

All endpoints are prefixed with `/api` and return JSON.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/topics` | List topics |
| `POST` | `/topics` | Create a topic with `keyword` and optional `label` |
| `PATCH` | `/topics/:id` | Update `label` and/or `isActive` |
| `DELETE` | `/topics/:id` | Delete a topic and its history |
| `GET` | `/dashboard` | Watchlist data, changes, and sparklines |
| `GET` | `/topics/:id/history?window=7d` | Score history; windows: `24h`, `7d`, `30d` |
| `GET` | `/topics/:id/stories?limit=50` | Captured stories, newest first |
| `POST` | `/refresh` | Start a background collection |
| `GET` | `/health` | Database, scheduler, and topic-count status |

Errors use the shape `{ "error": "message" }` with an appropriate HTTP status.

## Configuration

Backend settings are environment-variable driven.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Flask bind address |
| `PORT` | `5001` | Flask port |
| `FLASK_DEBUG` | `1` | Enables Flask debug mode when set to `1` |
| `COLLECT_INTERVAL_MINUTES` | `15` | Scheduled collection interval |
| `SCORE_LOOKBACK_HOURS` | `24` | Story lookback window |
| `POINTS_CAP_PER_STORY` | `200` | Maximum points contributed by one story |
| `STORY_COUNT_WEIGHT` | `10` | Score weight per story |
| `DB_DIR` | `backend/data` | Default SQLite directory |
| `DB_PATH` | `backend/data/trendscollect.db` | SQLite database path |
| `HN_API_BASE` | `https://hn.algolia.com/api/v1` | HN API base URL |
| `HN_TIMEOUT_SECONDS` | `10` | HN request timeout |

The database and its WAL files are runtime data and are gitignored.

## Project structure

```text
TrendsCollect/
├── backend/
│   ├── app.py                 # Flask app, scheduler, and SPA serving
│   ├── config.py              # Environment-backed settings
│   ├── db.py                  # SQLite setup and connections
│   ├── controllers/           # JSON API endpoints
│   ├── services/              # HN collection and trend scoring
│   ├── repositories/          # SQL queries
│   └── models/                # Domain dataclasses
├── frontend/
│   └── src/
│       ├── api/               # Typed API client and DTOs
│       ├── components/        # Watchlist, charts, dialogs, stories, toasts
│       ├── hooks/             # Queries, mutations, timers, and page titles
│       ├── lib/               # Formatting helpers
│       ├── pages/             # Dashboard and topic detail routes
│       └── index.css          # Newspaper/stock-terminal styling
├── PLAN.md                    # Original implementation plan
└── IMPROVEMENT.md             # Frontend UX/UI improvement plan
```

## Frontend checks

```bash
cd frontend
npm run typecheck
npm run build
```

The production build is written to `frontend/dist/`.
