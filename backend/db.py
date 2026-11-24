"""SQLite connection helper.

All connections use WAL mode + busy_timeout so the APScheduler writer thread
and Flask request threads can share one database file without 'database is
locked' errors. Repositories are the only modules that import this file.
"""

import os
import sqlite3
from contextlib import contextmanager

import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS topics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword     TEXT NOT NULL UNIQUE,
    label       TEXT NOT NULL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trend_snapshots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id     INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    captured_at  TEXT NOT NULL DEFAULT (datetime('now')),
    score        REAL NOT NULL,
    story_count  INTEGER NOT NULL,
    total_points INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_topic_time
    ON trend_snapshots(topic_id, captured_at);

CREATE TABLE IF NOT EXISTS stories (
    id            INTEGER PRIMARY KEY,
    topic_id      INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    url           TEXT,
    author        TEXT,
    points        INTEGER NOT NULL DEFAULT 0,
    num_comments  INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    fetched_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (topic_id, id)
);
CREATE INDEX IF NOT EXISTS idx_stories_topic_created
    ON stories(topic_id, created_at DESC);
"""


def connect(db_path: str | None = None) -> sqlite3.Connection:
    """Open a connection with the pragmas the app relies on."""
    path = db_path or config.DB_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def init_db(db_path: str | None = None) -> None:
    """Create tables if they don't exist. Safe to call on every startup."""
    conn = connect(db_path)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()


@contextmanager
def get_conn(db_path: str | None = None):
    """Connection context manager that reliably closes (unlike raw
    sqlite3, whose `with conn` only manages transactions)."""
    conn = connect(db_path)
    try:
        yield conn
    finally:
        conn.close()
