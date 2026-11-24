"""Collector orchestration: poll topics from HN, write stories + snapshots.

A module-level lock guarantees at most one collector run at a time,
whether triggered by the scheduler or a manual refresh.
"""

import logging
import sqlite3
import threading
from datetime import datetime, timezone

import db
from models.entities import Story
from repositories import snapshots_repo, stories_repo, topics_repo
from services import hn_client, trend_service

log = logging.getLogger("collector")

_collect_lock = threading.Lock()

# Set once by app.py so run_in_background() can reuse the app's DB config.
_db_path: str | None = None


def configure(db_path: str | None) -> None:
    """Point the collector at a specific DB file (used by tests)."""
    global _db_path
    _db_path = db_path


def _connect() -> sqlite3.Connection:
    return db.connect(_db_path)


def collect_topic(conn: sqlite3.Connection, topic) -> dict:
    """Fetch, upsert stories, and snapshot one topic. Returns run stats."""
    hits = hn_client.search_stories(topic.keyword)
    stories = [
        Story(
            id=h.object_id,
            topic_id=topic.id,
            title=h.title,
            url=h.url,
            author=h.author,
            points=h.points,
            num_comments=h.num_comments,
            created_at=h.created_at,
        )
        for h in hits
    ]
    stories_repo.upsert_many(conn, topic.id, stories)
    score, story_count, total_points = trend_service.compute_score(stories)
    snapshots_repo.insert(conn, topic.id, score, story_count, total_points)
    return {
        "topic": topic.label,
        "score": score,
        "storyCount": story_count,
        "totalPoints": total_points,
    }


def collect_all() -> list[dict]:
    """One collection pass over all active topics.

    Skips (returns []) if another run is already in flight. One failing
    topic never aborts the rest.
    """
    if not _collect_lock.acquire(blocking=False):
        log.info("Collection already in flight — skipping this run")
        return []

    results: list[dict] = []
    try:
        conn = _connect()
        try:
            for topic in topics_repo.list_active(conn):
                try:
                    stats = collect_topic(conn, topic)
                    results.append(stats)
                    log.info(
                        "Collected %r: score=%s stories=%s points=%s",
                        topic.keyword, stats["score"],
                        stats["storyCount"], stats["totalPoints"],
                    )
                except hn_client.HnApiError as exc:
                    log.error("Topic %r failed: %s", topic.keyword, exc)
        finally:
            conn.close()
    finally:
        _collect_lock.release()
    return results


def collect_topic_now(topic_id: int) -> dict:
    """Collect a single topic on demand (used when a topic is first added).

    Blocks; raises HnApiError on failure. Runs under the shared lock so it
    cannot race a full run.
    """
    with _collect_lock:
        conn = _connect()
        try:
            topic = topics_repo.get(conn, topic_id)
            if topic is None:
                raise ValueError(f"No topic {topic_id}")
            return collect_topic(conn, topic)
        finally:
            conn.close()


def run_in_background() -> bool:
    """Kick off collect_all on a daemon thread (manual refresh).

    Returns False if a run was already in flight.
    """
    if _collect_lock.locked():
        return False
    t = threading.Thread(target=collect_all, daemon=True)
    t.start()
    return True


if __name__ == "__main__":  # ad-hoc CLI: python -m services.collector_service
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    stats = collect_all()
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"[{now}] collected {len(stats)} topic(s)")
    for s in stats:
        print(f"  {s['topic']}: score={s['score']} stories={s['storyCount']}")
