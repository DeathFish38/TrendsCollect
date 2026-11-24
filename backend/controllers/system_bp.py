"""System endpoints — refresh + health."""

from flask import Blueprint, jsonify

import db
from repositories import topics_repo
from services import collector_service
from system_state import get_scheduler_state

bp = Blueprint("system", __name__, url_prefix="/api")


@bp.post("/refresh")
def refresh():
    started = collector_service.run_in_background()
    # 202 either way: an in-flight run already covers the request.
    return jsonify({"status": "accepted", "started": started}), 202


@bp.get("/health")
def health():
    try:
        with db.get_conn() as conn:
            topic_count = len(topics_repo.list_all(conn))
        db_ok = True
    except Exception:
        topic_count = 0
        db_ok = False

    return jsonify(
        {
            "status": "ok" if db_ok else "degraded",
            "db": db_ok,
            "schedulerRunning": get_scheduler_state()["running"],
            "topicCount": topic_count,
        }
    )
