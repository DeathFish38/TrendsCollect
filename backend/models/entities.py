"""Dataclass entities shared across layers."""

from dataclasses import dataclass


@dataclass
class Topic:
    id: int
    keyword: str
    label: str
    is_active: bool
    created_at: str


@dataclass
class TrendSnapshot:
    id: int
    topic_id: int
    captured_at: str
    score: float
    story_count: int
    total_points: int


@dataclass
class Story:
    id: int
    topic_id: int
    title: str
    url: str | None
    author: str | None
    points: int
    num_comments: int
    created_at: str
    fetched_at: str | None = None
