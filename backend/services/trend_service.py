"""Pure trend scoring math. No I/O, no SQL — fully unit-testable."""

import config
from models.entities import Story


def compute_score(stories: list[Story]) -> tuple[float, int, int]:
    """Compute the trend score over a set of stories.

    score = story_count * STORY_COUNT_WEIGHT + sum(min(points, cap))

    Returns (score, story_count, total_points).
    """
    story_count = len(stories)
    total_points = sum(min(s.points, config.POINTS_CAP_PER_STORY) for s in stories)
    score = story_count * config.STORY_COUNT_WEIGHT + total_points
    return float(score), story_count, total_points


def pct_change(latest: float | None, baseline: float | None) -> float | None:
    """Percent change between two scores, stock-style.

    Returns None when either input is None (no baseline yet — like a fresh
    IPO) or when the baseline is 0 (undefined division).
    """
    if latest is None or baseline is None or baseline <= 0:
        return None
    return (latest - baseline) / baseline * 100.0
