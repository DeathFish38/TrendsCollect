"""Topics CRUD — /api/topics"""

from flask import Blueprint, jsonify, request

import db
from repositories import topics_repo
from services import collector_service

bp = Blueprint("topics", __name__, url_prefix="/api/topics")


@bp.get("")
def list_topics():
    with db.get_conn() as conn:
        topics = topics_repo.list_all(conn)
    return jsonify(
        [
            {
                "topicId": t.id,
                "keyword": t.keyword,
                "label": t.label,
                "isActive": t.is_active,
                "createdAt": t.created_at,
            }
            for t in topics
        ]
    )


@bp.post("")
def create_topic():
    data = request.get_json(silent=True) or {}
    keyword = (data.get("keyword") or "").strip()
    label = (data.get("label") or "").strip() or keyword.title()
    if not keyword:
        return jsonify({"error": "keyword is required"}), 400

    with db.get_conn() as conn:
        if topics_repo.get_by_keyword(conn, keyword):
            return jsonify({"error": f"topic {keyword!r} already exists"}), 409
        topic = topics_repo.create(conn, keyword, label)

    # Snapshot immediately so the new topic isn't blank until the next tick.
    # Best-effort: a failure here doesn't fail the create.
    try:
        collector_service.collect_topic_now(topic.id)
    except Exception:
        pass

    return jsonify(
        {
            "topicId": topic.id,
            "keyword": topic.keyword,
            "label": topic.label,
            "isActive": topic.is_active,
            "createdAt": topic.created_at,
        }
    ), 201


@bp.patch("/<int:topic_id>")
def update_topic(topic_id: int):
    data = request.get_json(silent=True) or {}
    label = data.get("label")
    is_active = data.get("isActive")
    if is_active is not None and not isinstance(is_active, bool):
        return jsonify({"error": "isActive must be a boolean"}), 400
    if label is not None and (not isinstance(label, str) or not label.strip()):
        return jsonify({"error": "label must be a non-empty string"}), 400

    with db.get_conn() as conn:
        if not topics_repo.get(conn, topic_id):
            return jsonify({"error": f"no topic {topic_id}"}), 404
        topic = topics_repo.update(conn, topic_id, label=label.strip() if label else None, is_active=is_active)
    return jsonify(
        {
            "topicId": topic.id,
            "keyword": topic.keyword,
            "label": topic.label,
            "isActive": topic.is_active,
            "createdAt": topic.created_at,
        }
    )


@bp.delete("/<int:topic_id>")
def delete_topic(topic_id: int):
    with db.get_conn() as conn:
        if not topics_repo.delete(conn, topic_id):
            return jsonify({"error": f"no topic {topic_id}"}), 404
    return "", 204
