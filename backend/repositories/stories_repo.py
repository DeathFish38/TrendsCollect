"""Data access for stories."""

import sqlite3
from typing import Iterable

from models.entities import Story


def _row_to_story(row: sqlite3.Row) -> Story:
    return Story(
        id=row["id"],
        topic_id=row["topic_id"],
        title=row["title"],
        url=row["url"],
        author=row["author"],
        points=row["points"],
        num_comments=row["num_comments"],
        created_at=row["created_at"],
        fetched_at=row["fetched_at"],
    )


def upsert(conn: sqlite3.Connection, topic_id: int, story: Story) -> None:
    """Insert or refresh a story row (points/comments update over time)."""
    conn.execute(
        """INSERT INTO stories
               (id, topic_id, title, url, author, points, num_comments,
                created_at, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT (id) DO UPDATE SET
               title = excluded.title,
               url = excluded.url,
               author = excluded.author,
               points = excluded.points,
               num_comments = excluded.num_comments,
               fetched_at = excluded.fetched_at""",
        (
            story.id,
            topic_id,
            story.title,
            story.url,
            story.author,
            story.points,
            story.num_comments,
            story.created_at,
        ),
    )


def upsert_many(
    conn: sqlite3.Connection, topic_id: int, stories: Iterable[Story]
) -> int:
    """Upsert a batch inside one short transaction. Returns count written."""
    stories = list(stories)
    with conn:
        for s in stories:
            upsert(conn, topic_id, s)
    return len(stories)


def list_for_topic(
    conn: sqlite3.Connection, topic_id: int, limit: int = 50
) -> list[Story]:
    rows = conn.execute(
        """SELECT * FROM stories WHERE topic_id = ?
           ORDER BY created_at DESC, id DESC LIMIT ?""",
        (topic_id, limit),
    ).fetchall()
    return [_row_to_story(r) for r in rows]
