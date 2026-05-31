import os
import time
from collections import defaultdict

_buckets: dict[str, list[float]] = defaultdict(list)


def allow_request(key: str, *, max_calls: int | None = None, window_seconds: int | None = None) -> bool:
    limit = max_calls if max_calls is not None else int(os.environ.get("LICENSE_RATE_LIMIT_MAX", "10"))
    window = window_seconds if window_seconds is not None else int(
        os.environ.get("LICENSE_RATE_LIMIT_WINDOW_SECONDS", "60")
    )
    now = time.time()
    recent = [t for t in _buckets[key] if now - t < window]
    if len(recent) >= limit:
        _buckets[key] = recent
        return False
    recent.append(now)
    _buckets[key] = recent
    return True
