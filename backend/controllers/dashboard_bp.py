"""Dashboard / watchlist reads — /api/dashboard, history, stories."""

from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

import config
import db
from repositories import snapshots_repo, stories_repo, topics_repo
from services import trend_service

bp = Blueprint("dashboard", __name__, url_prefix="/api")

SPARKLINE_POINTS = 48
WINDOW_CHOICES = {"24h": 1, "7d": 7, "30d": 30}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hours_ago_iso(hours: int) -> str:
    return (_utcnow() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")


@bp.get("/dashboard")
def dashboard():
    """One payload powering the whole watchlist table."""
    cutoff_24h = _hours_ago_iso(24)
    with db.get_conn() as conn:
        topics = topics_repo.list_all(conn)
        latest = snapshots_repo.latest_snapshots(conn)
        sparklines = {
            t.id: snapshots_repo.recent_for_topic(conn, t.id, SPARKLINE_POINTS)
            for t in topics
        }
        baselines = {
            t.id: snapshots_repo.latest_before(conn, t.id, cutoff_24h)
            for t in topics
        }

    payload = []
    for t in topics:
        snap = latest.get(t.id)
        baseline = baselines.get(t.id)
        score_24h_ago = baseline.score if baseline else None
        pct = trend_service.pct_change(
            snap.score if snap else None, score_24h_ago
        )
        payload.append(
            {
                "topicId": t.id,
                "keyword": t.keyword,
                "label": t.label,
                "isActive": t.is_active,
                "latestScore": snap.score if snap else None,
                "latestStoryCount": snap.story_count if snap else None,
                "latestCapturedAt": snap.captured_at if snap else None,
                "score24hAgo": score_24h_ago,
                "pctChange": pct,
                "sparkline": [
                    {"capturedAt": s.captured_at, "score": s.score}
                    for s in sparklines[t.id]
                ],
            }
        )
    return jsonify(payload)


@bp.get("/topics/<int:topic_id>/history")
def history(topic_id: int):
    window = request.args.get("window", "7d")
    if window not in WINDOW_CHOICES:
        return jsonify({"error": "window must be one of 24h, 7d, 30d"}), 400
    days = WINDOW_CHOICES[window]

    with db.get_conn() as conn:
        topic = topics_repo.get(conn, topic_id)
        if not topic:
            return jsonify({"error": f"no topic {topic_id}"}), 404
        points = snapshots_repo.for_topic_since(
            conn, topic_id, _hours_ago_iso(days * 24)
        )

    return jsonify(
        {
            "topic": {
                "topicId": topic.id,
                "keyword": topic.keyword,
                "label": topic.label,
            },
            "window": window,
            "points": [
                {
                    "capturedAt": s.captured_at,
                    "score": s.score,
                    "storyCount": s.story_count,
                }
                for s in points
            ],
        }
    )


@bp.get("/topics/<int:topic_id>/stories")
def stories(topic_id: int):
    try:
        limit = min(int(request.args.get("limit", 50)), 200)
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400

    with db.get_conn() as conn:
        topic = topics_repo.get(conn, topic_id)
        if not topic:
            return jsonify({"error": f"no topic {topic_id}"}), 404
        rows = stories_repo.list_for_topic(conn, topic_id, limit)

    return jsonify(
        {
            "topic": {
                "topicId": topic.id,
                "keyword": topic.keyword,
                "label": topic.label,
            },
            "stories": [
                {
                    "id": s.id,
                    "title": s.title,
                    "url": s.url,
                    "author": s.author,
                    "points": s.points,
                    "numComments": s.num_comments,
                    "createdAt": s.created_at,
                }
                for s in rows
            ],
        }
    )
