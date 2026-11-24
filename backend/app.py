"""TrendsCollect app factory.

- Registers API blueprints
- Initializes the SQLite schema
- Starts the APScheduler background collector (immediate first run)
- Serves the built frontend SPA from ../frontend/dist (single-URL mode)
"""

import logging
import os
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, jsonify, send_from_directory

import config
import db
import system_state
from controllers import dashboard_bp, system_bp, topics_bp
from services import collector_service

log = logging.getLogger("app")

scheduler = BackgroundScheduler(daemon=True)

FRONTEND_DIST = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "dist"
)


def create_app(start_scheduler: bool = True) -> Flask:
    # static_folder=None: Flask's built-in static route would otherwise win
    # the /<path:x> match for client-side routes like /topics/3 and 404 them
    # before the SPA catch-all below can serve index.html. The catch-all
    # serves files from FRONTEND_DIST itself via send_from_directory.
    app = Flask(__name__, static_folder=None)

    db.init_db()
    collector_service.configure(None)  # use default DB path from config

    app.register_blueprint(topics_bp.bp)
    app.register_blueprint(dashboard_bp.bp)
    app.register_blueprint(system_bp.bp)

    # SPA catch-all: serve index.html for non-API paths so client-side
    # routes like /topics/3 deep-link correctly in production mode.
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def spa(path: str):
        if path.startswith("api/"):
            return jsonify({"error": "not found"}), 404
        if path and os.path.isfile(os.path.join(FRONTEND_DIST, path)):
            return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, "index.html")

    if start_scheduler:
        start_background_scheduler(app)

    return app


def start_background_scheduler(app: Flask) -> None:
    scheduler.add_job(
        collector_service.collect_all,
        "interval",
        minutes=config.COLLECT_INTERVAL_MINUTES,
        id="collect_all",
        max_instances=1,
        coalesce=True,
        next_run_time=datetime.now(),  # immediate first run on startup
    )
    scheduler.start()
    system_state.set_scheduler_running(True)
    log.info(
        "Scheduler started: collecting every %s minute(s)",
        config.COLLECT_INTERVAL_MINUTES,
    )
    app.teardown_appcontext(lambda _exc: None)  # keep scheduler alive past ctx


app = create_app(start_scheduler=os.environ.get("FLASK_DEBUG", "1") != "1" or True)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG,
        use_reloader=False,  # reloader would double-start the scheduler
    )
