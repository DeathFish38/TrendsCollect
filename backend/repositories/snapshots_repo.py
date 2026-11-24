"""Data access for trend snapshots."""

import sqlite3

from models.entities import TrendSnapshot


def _row_to_snapshot(row: sqlite3.Row) -> TrendSnapshot:
    return TrendSnapshot(
        id=row["id"],
        topic_id=row["topic_id"],
        captured_at=row["captured_at"],
        score=row["score"],
        story_count=row["story_count"],
        total_points=row["total_points"],
    )


def insert(
    conn: sqlite3.Connection,
    topic_id: int,
    score: float,
    story_count: int,
    total_points: int,
) -> TrendSnapshot:
    cur = conn.execute(
        """INSERT INTO trend_snapshots (topic_id, score, story_count, total_points)
           VALUES (?, ?, ?, ?)""",
        (topic_id, score, story_count, total_points),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM trend_snapshots WHERE id = ?", (cur.lastrowid,)
    ).fetchone()
    return _row_to_snapshot(row)


def latest_for_topic(conn: sqlite3.Connection, topic_id: int) -> TrendSnapshot | None:
    row = conn.execute(
        """SELECT * FROM trend_snapshots
           WHERE topic_id = ? ORDER BY captured_at DESC, id DESC LIMIT 1""",
        (topic_id,),
    ).fetchone()
    return _row_to_snapshot(row) if row else None


def latest_snapshots(conn: sqlite3.Connection) -> dict[int, TrendSnapshot]:
    """Latest snapshot per topic, as {topic_id: snapshot}.

    Snapshot ids are monotonic autoincrement and inserted in time order,
    so MAX(id) per topic is the latest snapshot for that topic.
    """
    rows = conn.execute(
        """SELECT * FROM trend_snapshots
           WHERE id IN (SELECT MAX(id) FROM trend_snapshots GROUP BY topic_id)"""
    ).fetchall()
    return {r["topic_id"]: _row_to_snapshot(r) for r in rows}


def latest_before(
    conn: sqlite3.Connection, topic_id: int, cutoff_iso: str
) -> TrendSnapshot | None:
    """Most recent snapshot at or before a cutoff timestamp."""
    row = conn.execute(
        """SELECT * FROM trend_snapshots
           WHERE topic_id = ? AND captured_at <= ?
           ORDER BY captured_at DESC, id DESC LIMIT 1""",
        (topic_id, cutoff_iso),
    ).fetchone()
    return _row_to_snapshot(row) if row else None


def recent_for_topic(
    conn: sqlite3.Connection, topic_id: int, limit: int
) -> list[TrendSnapshot]:
    """Most recent `limit` snapshots, oldest first (for sparklines)."""
    rows = conn.execute(
        """SELECT * FROM (
               SELECT * FROM trend_snapshots WHERE topic_id = ?
               ORDER BY captured_at DESC, id DESC LIMIT ?
           ) ORDER BY captured_at ASC, id ASC""",
        (topic_id, limit),
    ).fetchall()
    return [_row_to_snapshot(r) for r in rows]


def for_topic_since(
    conn: sqlite3.Connection, topic_id: int, since_iso: str
) -> list[TrendSnapshot]:
    """Snapshots since a cutoff, oldest first (for detail charts)."""
    rows = conn.execute(
        """SELECT * FROM trend_snapshots
           WHERE topic_id = ? AND captured_at >= ?
           ORDER BY captured_at ASC, id ASC""",
        (topic_id, since_iso),
    ).fetchall()
    return [_row_to_snapshot(r) for r in rows]
