# TrendsCollect — Implementation Plan

A single-user, stock-trader-styled trend tracker for Hacker News topics. Topics behave like tickers on a watchlist; each has a computed **trend score** captured over time by a background scheduler, rendered as sparklines, % change, and detail charts, with a news-platform story drill-down.

## Improvements
Change to other APIs: 

---

## 1. Repository Structure

```
TrendsCollect/
├── README.md
├── PLAN.md
├── Makefile                      # dev / build / run / test shortcuts
├── .gitignore
├── backend/
│   ├── requirements.txt          # flask, apscheduler, requests, pytest
│   ├── app.py                    # entrypoint: app factory, scheduler bootstrap, static serving
│   ├── config.py                 # all tunables (env-overridable)
│   ├── db.py                     # sqlite3 connection helper + init_db + pragmas
│   ├── models/
│   │   └── entities.py           # dataclasses: Topic, TrendSnapshot, Story
│   ├── repositories/
│   │   ├── topics_repo.py
│   │   ├── snapshots_repo.py
│   │   └── stories_repo.py
│   ├── services/
│   │   ├── hn_client.py          # Algolia HN Search API wrapper
│   │   ├── trend_service.py      # pure scoring + % change math
│   │   └── collector_service.py  # orchestration: poll all topics, write snapshots/stories
│   ├── controllers/
│   │   ├── topics_bp.py          # CRUD
│   │   ├── dashboard_bp.py       # watchlist + history + stories read endpoints
│   │   └── system_bp.py          # refresh + health
│   └── tests/
│       ├── conftest.py           # temp SQLite DB fixture, Flask test client
│       ├── test_trend_service.py
│       ├── test_repositories.py
│       ├── test_collector.py
│       └── test_api.py
└── frontend/
    ├── package.json
    ├── vite.config.ts             # dev proxy /api -> Flask
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx               # router + QueryClientProvider
        ├── App.tsx               # layout shell
        ├── api/
        │   ├── client.ts          # typed fetch wrapper
        │   └── types.ts           # API DTO types (mirror backend)
        ├── hooks/
        │   ├── useDashboard.ts
        │   ├── useTopicHistory.ts
        │   ├── useTopicStories.ts
        │   ├── useTopics.ts       # CRUD mutations
        │   └── useRefresh.ts
        ├── components/
        │   ├── Header.tsx
        │   ├── TopicTable.tsx
        │   ├── TopicRow.tsx
        │   ├── Sparkline.tsx      # hand-rolled SVG
        │   ├── PercentChange.tsx
        │   ├── ScoreChart.tsx      # Recharts line chart
        │   ├── StoryList.tsx
        │   ├── StoryCard.tsx
        │   ├── AddTopicForm.tsx
        │   └── RefreshButton.tsx
        ├── pages/
        │   ├── DashboardPage.tsx
        │   └── TopicDetailPage.tsx
        └── index.css             # single plain-CSS stylesheet
```

**Layering rules (keep honest, keep simple):**
- `controllers` → `services` + `repositories` only. Controllers never touch `db.py` directly.
- `repositories` own all SQL. Services own all logic and never write SQL.
- No ABCs, no interfaces, no DI container — plain functions/modules constructed with a shared `db.py` connection factory.

**DB access:** raw `sqlite3` with a thin helper in `db.py` (`sqlite3.Row` rows, `PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`, `busy_timeout=30000`, one connection per request/thread). SQLAlchemy is not justified for ~3 tables of trivial shape in a single-user tool.

---

## 2. SQLite Schema

File lives at `backend/data/trendscollect.db` (gitignored; created by `init_db()` on first run).

```sql
CREATE TABLE topics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword     TEXT NOT NULL UNIQUE,        -- the HN search query, e.g. "rust"
    label       TEXT NOT NULL,               -- display name, e.g. "Rust"
    is_active   INTEGER NOT NULL DEFAULT 1,  -- soft-pause without deleting history
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE trend_snapshots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id     INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    captured_at  TEXT NOT NULL DEFAULT (datetime('now')),  -- ISO-8601 UTC
    score        REAL NOT NULL,
    story_count  INTEGER NOT NULL,
    total_points INTEGER NOT NULL
);
CREATE INDEX idx_snapshots_topic_time ON trend_snapshots(topic_id, captured_at);

CREATE TABLE stories (
    id            INTEGER PRIMARY KEY,        -- HN objectID
    topic_id      INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    url           TEXT,
    author        TEXT,
    points        INTEGER NOT NULL DEFAULT 0,
    num_comments  INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,               -- story's own creation time from HN
    fetched_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (topic_id, id)
);
CREATE INDEX idx_stories_topic_created ON stories(topic_id, created_at DESC);
```

Timestamps as ISO-8601 TEXT UTC — sorts lexicographically, serializes straight to JSON.

### Trend score definition

For each topic, per snapshot (computed over a **trailing 24h lookback window** from the Algolia API):

```
story_count  = number of stories matching the keyword created in the last 24h
total_points = Σ min(points, 200) over those stories     -- per-story cap

score = story_count * 10 + total_points
```

Rationale:
- **Two components** = "how many people are talking about it" (volume) + "how hot is what they're saying" (engagement). Like price × volume.
- **The 200-point cap per story** stops one front-page mega-post from swamping the topic for a day; the count term keeps emerging chatter visible before points accrue.
- **Deterministic recomputation**: the score is a pure function of HN state *at capture time*, not an accumulator — no double-counting across polls, and history is stable retroactively.

Renders as:
- **% change** (daily move, stock-style): `pct_change = (score_latest − score_24h_ago) / max(score_24h_ago, 1) × 100`, `null` when no prior snapshot (display "—" like a fresh IPO).
- **Volume column** in the watchlist = `story_count` from the latest snapshot.

Both variants live in `trend_service.py` as pure functions so swapping is trivial.

---

## 3. Backend API Design

All endpoints under `/api` (Flask blueprints in `backend/controllers/`). JSON responses, camelCase keys.

### Topics CRUD — `topics_bp` (`/api/topics`)
| Method | Path | Body / Notes |
|---|---|---|
| `GET` | `/api/topics` | List all topics (with `isActive`) |
| `POST` | `/api/topics` | `{ "keyword": "rust", "label": "Rust" }` — 201, 409 on duplicate keyword. Triggers an immediate snapshot for the new topic so it isn't blank until next tick |
| `PATCH` | `/api/topics/<id>` | Partial update: `{ "label"?, "isActive"? }` |
| `DELETE` | `/api/topics/<id>` | Cascades snapshots + stories |

### Dashboard / detail reads — `dashboard_bp`
| Method | Path | Response |
|---|---|---|
| `GET` | `/api/dashboard` | **The watchlist payload** — one call powers the whole table: `[{ topicId, keyword, label, latestScore, latestStoryCount, latestCapturedAt, score24hAgo, pctChange, sparkline: [{capturedAt, score}] }]` (sparkline = last 48 snapshots) |
| `GET` | `/api/topics/<id>/history?window=7d` | `{ topic, points: [{ capturedAt, score, storyCount }] }` — window ∈ {24h, 7d, 30d} |
| `GET` | `/api/topics/<id>/stories?limit=50` | News-platform drill-down: stories for the topic ordered by `created_at DESC` (points/numComments are live-refreshed by the collector) |

### System — `system_bp`
| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/refresh` | Fire `collector_service.collect_all()` on a worker thread (guarded by a lock). Returns `202 { "status": "accepted" }` |
| `GET` | `/api/health` | `{ "status": "ok", "db": true, "schedulerRunning": true, "topicCount": n }` |

Error contract: `{ "error": "message" }` with proper status codes; 404 for missing topic ids.

---

## 4. HN Data Fetching — `services/hn_client.py`

Thin `requests` wrapper, **no API key**:

```
GET https://hn.algolia.com/api/v1/search
    ?query=<keyword>&tags=story
    &numericFilters=created_at_i><now - 24h>
    &hitsPerPage=100
```

- `hitsPerPage=100` in one page is plenty for a personal tool; loop with `page` param only if a topic ever saturates.
- Map each hit to the `Story` dataclass (`objectID, title, url, author, points, num_comments, created_at`).
- `timeout=10`, one retry on failure, raise a typed `HnApiError` — the collector catches it per-topic so one bad topic never aborts the whole run.

### Collector service — `services/collector_service.py`

`collect_all()` flow (one APScheduler job):
1. Acquire the module-level `threading.Lock` (skip the run if one is in flight — prevents manual-refresh/scheduler overlap).
2. `repos.topics.list_active()`.
3. For each topic: fetch hits in the 24h window → **upsert** into `stories` (refreshes `points`/`num_comments` of already-known stories too — drill-down stays live) → compute score via `trend_service.compute_score()` → insert a `trend_snapshots` row.
4. Log per-topic results; per-topic try/except; release lock.

Single Algolia request per topic per tick — with ~10 topics and a 15-minute interval this is ~40 requests/hour, far inside Algolia's free limits.

---

## 5. Scheduler

`APScheduler` (`BackgroundScheduler`) embedded in the Flask app — **not** a separate process.

**`backend/app.py`:**
- `create_app()` factory: registers blueprints, runs `init_db()`, starts scheduler once (guarded so it doesn't double-start under Flask's reloader).
- `scheduler.add_job(collector_service.collect_all, "interval", minutes=15, id="collect_all", max_instances=1, coalesce=True, next_run_time=datetime.now())` — the `next_run_time` trick gives an **immediate first run on app startup** so a fresh DB populates right away.
- Interval configurable: `config.py` reads `COLLECT_INTERVAL_MINUTES` (default 15) and `SCORE_LOOKBACK_HOURS` (default 24) from env vars.

**SQLite concurrency (critical, must-do):**
- `PRAGMA journal_mode=WAL` in `db.py` — allows the scheduler thread to write while request threads read.
- `PRAGMA busy_timeout=30000` so writers queue instead of erroring.
- `foreign_keys=ON` per connection.
- Keep write transactions short (single snapshot insert + story upserts per topic).
- The `threading.Lock` in `collector_service` bounds writers to at most one collector run at a time.

---

## 6. Frontend Design

**Stack:** Vite + React + TypeScript, `react-router-dom` (routes: `/` → Dashboard, `/topics/:id` → Detail), TanStack Query for fetching/caching/mutations, **Recharts** for the detail line chart, and a **hand-rolled SVG `Sparkline` component** for the table (lighter than mounting 10+ Recharts instances; ~40 lines of code). Plain CSS in a single `index.css`.

### Pages & components

**DashboardPage (`/`)**
- `Header` — app name ("TrendsCollect"), tagline, global `RefreshButton` (fires `POST /api/refresh`, then invalidates the dashboard query after ~4s).
- `AddTopicForm` — inline keyword + label fields; `useTopics().create` mutation.
- `TopicTable` — stock-watchlist table, the centerpiece:

| TOPIC | SCORE | 24H % | VOLUME | TREND (48-tick sparkline) | LAST UPDATED |
|---|---|---|---|---|---|
| Rust | 1,240 | +12.4% (green) | 18 | `Sparkline` | 3 min ago |
| WebAssembly | 305 | −4.1% (red) | 7 | `Sparkline` | 3 min ago |

  - `TopicRow` (whole row links to `/topics/:id`), `PercentChange` (green `#0a7d32` / red `#c0392b` / neutral "—", with ▲▼ arrow glyphs), `Sparkline` (monochrome black polyline, green/red stroke matching the day's direction).
- `useDashboard()` — `useQuery(['dashboard'], …, { refetchInterval: 30_000 })`.

**TopicDetailPage (`/topics/:id`)**
- Header block: topic name, current score, big `PercentChange`, story count — like a stock quote header.
- `ScoreChart` — Recharts `LineChart` of `useTopicHistory(id, window)` with a 24h/7d/30d window toggle; black line on white, minimal grid.
- `StoryList` → `StoryCard`s — news-platform feed: story title (link), source domain, points + comment count, age. Monospace metrics, generous line-height, divider rules between cards.
- Delete/edit controls for the topic.

### Styling — white/black news-platform look (`frontend/src/index.css`)
- **Fonts:** headlines/story titles in a serif stack — `Georgia, 'Times New Roman', serif` — for the newspaper feel; data (scores, %, counts, timestamps) in `ui-monospace, 'SF Mono', Menlo, monospace` with `font-variant-numeric: tabular-nums` so columns align like a stock table; UI chrome in the system sans stack.
- **Palette:** background `#ffffff`, text `#111111`, secondary `#666666`, hairline borders `#e5e5e5`; green/red only for change indicators. No shadows, no gradients — rules and whitespace carry the design.
- Table: full-width, 1px hairline row separators, right-aligned numeric columns, sticky header row, uppercase small-caps letter-spaced column labels.
- Plain CSS with a few custom properties (`--ink`, `--muted`, `--hairline`, `--up`, `--down`).

### TypeScript types (`frontend/src/api/types.ts`) — mirror the API exactly
```ts
interface DashboardTopic {
  topicId: number; keyword: string; label: string;
  latestScore: number; latestStoryCount: number;
  latestCapturedAt: string;
  score24hAgo: number | null; pctChange: number | null;
  sparkline: { capturedAt: string; score: number }[];
}
interface TopicHistoryPoint { capturedAt: string; score: number; storyCount: number; }
interface Story {
  id: number; title: string; url: string | null; author: string;
  points: number; numComments: number; createdAt: string;
}
```

---

## 7. Build & Run Story

**Development (two terminals, or `make dev` running both):**
```bash
cd backend && python app.py           # Flask on http://localhost:5001, debug=True
cd frontend && npm run dev            # Vite on http://localhost:5173
```
`vite.config.ts`:
```ts
server: { proxy: { '/api': 'http://localhost:5001' } }
```
Open `http://localhost:5173`; all `/api` calls proxy to Flask. No CORS needed.

**Production-style single command:**
```bash
make run    # = (cd frontend && npm run build) && (cd backend && python app.py)
```
`app.py` registers `static_folder=../frontend/dist, static_url_path=''` plus a catch-all route that serves `index.html` (so client-side routes like `/topics/3` deep-link correctly). Then **one URL** — `http://localhost:5001` — serves the built SPA and the API. No Docker, no gunicorn needed for a personal tool.

**Makefile targets:** `dev` (both servers), `backend`, `frontend`, `build`, `run`, `test` (pytest + `tsc --noEmit`).

---

## 8. Implementation Phases

| Phase | Deliverable | Verify by |
|---|---|---|
| **1. Backend skeleton + schema** | `app.py` factory, `db.py` with WAL + `init_db()`, `config.py`, all three blueprints returning stubs, `requirements.txt`, Makefile | `python app.py` starts; `curl localhost:5001/api/health` returns ok; `.tables` shows the three tables |
| **2. HN collector** | `hn_client.py`, `trend_service.py` (pure scoring), `collector_service.py` with lock; CLI entry `python -m services.collector_service` for ad-hoc runs | Run collector manually with one seeded topic; `sqlite3` query shows snapshot + story rows; unit tests for score math pass |
| **3. Scheduler + full API** | APScheduler wiring with immediate first run; complete topics CRUD, `/dashboard`, `/history`, `/stories`, `/refresh`; per-topic 404/error handling | `curl` each endpoint; add topic via curl → wait one tick → dashboard shows non-null score; pytest suite green |
| **4. Frontend scaffold** | Vite + React + TS app, router, TanStack Query provider, `api/client.ts` + types, proxy config, plain CSS foundation | `npm run dev` renders Dashboard stub fetching real `/api/dashboard` data as JSON |
| **5. Dashboard UI** | `TopicTable`, `TopicRow`, `Sparkline`, `PercentChange`, `AddTopicForm`, `RefreshButton`, `Header`; 30s polling | Browser: add "rust" topic, watch sparkline appear after a refresh, % change colors correct, table typography reads like a stock terminal |
| **6. Topic detail UI** | `ScoreChart` (Recharts, window toggle), `StoryList`/`StoryCard`, quote header, delete topic | Navigate from dashboard row, chart matches `/history` JSON, story links open on news.ycombinator.com |
| **7. Polish + README** | `make build && make run` single-command flow, static serving + SPA catch-all, empty/error/loading states, README with setup + architecture notes, `.gitignore` | Fresh clone → two commands → working app end-to-end |

---

## 9. Verification

**Backend (pytest):**
- `test_trend_service.py` — pure functions: scoring with capped points, empty-window, pct-change edge cases (no prior snapshot → null; prior=0 → null), known-fixture math.
- `test_repositories.py` — topics CRUD, cascade delete, upsert stories, history window filtering, against a temp-file SQLite DB (fixture), WAL mode asserted on.
- `test_collector.py` — `hn_client` monkeypatched with canned Algolia JSON; asserts one snapshot per topic, story upsert refreshes points, lock prevents concurrent runs, one failing topic doesn't abort others.
- `test_api.py` — Flask test client: full topic lifecycle (POST → GET /dashboard → PATCH → DELETE → 404), refresh endpoint returns 202, error contract shapes.

**Manual:**
- `curl` scripts per endpoint (collected in README).
- Browser walkthrough of both pages; watch scheduler logs while waiting one interval; hammer Refresh repeatedly to confirm no SQLite `database is locked` errors.

**Frontend:** `tsc --noEmit` clean; verify loading skeletons, empty-watchlist state, and error states by stopping Flask.

---

### Critical Files for Implementation
- `backend/services/collector_service.py` — orchestration core: locking, per-topic collection, snapshot + story writes
- `backend/services/trend_service.py` — the score and % change math (pure, unit-tested)
- `backend/app.py` — app factory, blueprint registration, APScheduler bootstrap, SPA static serving
- `backend/controllers/dashboard_bp.py` — the `/api/dashboard` payload the entire UI depends on
- `frontend/src/pages/DashboardPage.tsx` — the stock-terminal watchlist view, the product's centerpiece
