"""Application configuration. All values overridable via environment variables."""

import os

# Where the SQLite database file lives.
DB_DIR = os.environ.get("DB_DIR", os.path.join(os.path.dirname(__file__), "data"))
DB_PATH = os.environ.get("DB_PATH", os.path.join(DB_DIR, "trendscollect.db"))

# Collector scheduling.
COLLECT_INTERVAL_MINUTES = int(os.environ.get("COLLECT_INTERVAL_MINUTES", "15"))

# Scoring: trailing lookback window for counting stories/points per snapshot.
SCORE_LOOKBACK_HOURS = int(os.environ.get("SCORE_LOOKBACK_HOURS", "24"))

# Per-story point cap (stops one front-page mega-post from swamping a topic).
POINTS_CAP_PER_STORY = int(os.environ.get("POINTS_CAP_PER_STORY", "200"))

# Weight of each story in the score (volume term).
STORY_COUNT_WEIGHT = int(os.environ.get("STORY_COUNT_WEIGHT", "10"))

# HN Algolia Search API -> change to Google Search Browser Search rather tham this 
HN_API_BASE = os.environ.get("HN_API_BASE", "https://hn.algolia.com/api/v1")
HN_TIMEOUT_SECONDS = int(os.environ.get("HN_TIMEOUT_SECONDS", "10"))

# Flask
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "5001"))
DEBUG = os.environ.get("FLASK_DEBUG", "1") == "1"
