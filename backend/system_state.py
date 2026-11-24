"""Tiny module-level registry for scheduler status (read by /api/health)."""

_state = {"running": False}


def set_scheduler_running(running: bool) -> None:
    _state["running"] = running


def get_scheduler_state() -> dict:
    return dict(_state)
