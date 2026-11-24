"""Thin wrapper around the Algolia Hacker News Search API.

No API key required. Docs: https://hn.algolia.com/api
"""

import time
from dataclasses import dataclass

import requests

import config


class HnApiError(RuntimeError):
    """Raised when the HN API fails after retries."""


@dataclass
class HnHit:
    object_id: int
    title: str
    url: str | None
    author: str | None
    points: int
    num_comments: int
    created_at: str  # ISO-8601 from HN


def search_stories(keyword: str, lookback_hours: int | None = None) -> list[HnHit]:
    """Search stories matching `keyword`, created within the lookback window.

    Raises HnApiError on network/API failure after one retry.
    """
    lookback = lookback_hours if lookback_hours is not None else config.SCORE_LOOKBACK_HOURS
    since_unix = int(time.time()) - lookback * 3600
    params = {
        "query": keyword,
        "tags": "story",
        "numericFilters": f"created_at_i>{since_unix}",
        "hitsPerPage": 100,
    }

    last_err: Exception | None = None
    for attempt in range(2):  # 1 try + 1 retry
        try:
            resp = requests.get(
                f"{config.HN_API_BASE}/search",
                params=params,
                timeout=config.HN_TIMEOUT_SECONDS,
            )
            resp.raise_for_status()
            payload = resp.json()
            break
        except (requests.RequestException, ValueError) as exc:
            last_err = exc
            if attempt == 0:
                time.sleep(1)
    else:
        raise HnApiError(f"HN search failed for {keyword!r}: {last_err}") from last_err

    hits = []
    for hit in payload.get("hits", []):
        if hit.get("title") is None:  # skip non-story records
            continue
        hits.append(
            HnHit(
                object_id=int(hit["objectID"]),
                title=hit["title"],
                url=hit.get("url"),
                author=hit.get("author"),
                points=int(hit.get("points") or 0),
                num_comments=int(hit.get("num_comments") or 0),
                created_at=hit["created_at"],
            )
        )
    return hits
