"""Data access for topics."""

import sqlite3

import db
from models.entities import Topic


def _row_to_topic(row: sqlite3.Row) -> Topic:
    return Topic(
        id=row["id"],
        keyword=row["keyword"],
        label=row["label"],
        is_active=bool(row["is_active"]),
        created_at=row["created_at"],
    )


def list_all(conn: sqlite3.Connection) -> list[Topic]:
    rows = conn.execute("SELECT * FROM topics ORDER BY label COLLATE NOCASE").fetchall()
    return [_row_to_topic(r) for r in rows]


def list_active(conn: sqlite3.Connection) -> list[Topic]:
    rows = conn.execute(
        "SELECT * FROM topics WHERE is_active = 1 ORDER BY label COLLATE NOCASE"
    ).fetchall()
    return [_row_to_topic(r) for r in rows]


def get(conn: sqlite3.Connection, topic_id: int) -> Topic | None:
    row = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
    return _row_to_topic(row) if row else None


def get_by_keyword(conn: sqlite3.Connection, keyword: str) -> Topic | None:
    row = conn.execute(
        "SELECT * FROM topics WHERE keyword = ?", (keyword,)
    ).fetchone()
    return _row_to_topic(row) if row else None


def create(conn: sqlite3.Connection, keyword: str, label: str) -> Topic:
    cur = conn.execute(
        "INSERT INTO topics (keyword, label) VALUES (?, ?)", (keyword, label)
    )
    conn.commit()
    return get(conn, cur.lastrowid)


def update(
    conn: sqlite3.Connection,
    topic_id: int,
    label: str | None = None,
    is_active: bool | None = None,
) -> Topic | None:
    if label is None and is_active is None:
        return get(conn, topic_id)
    sets, params = [], []
    if label is not None:
        sets.append("label = ?")
        params.append(label)
    if is_active is not None:
        sets.append("is_active = ?")
        params.append(int(is_active))
    params.append(topic_id)
    conn.execute(f"UPDATE topics SET {', '.join(sets)} WHERE id = ?", params)
    conn.commit()
    return get(conn, topic_id)


def delete(conn: sqlite3.Connection, topic_id: int) -> bool:
    cur = conn.execute("DELETE FROM topics WHERE id = ?", (topic_id,))
    conn.commit()
    return cur.rowcount > 0
