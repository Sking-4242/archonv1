"""
Daily license maintenance — expiry, grace transitions, renewal reminders.

Run manually:
    docker compose exec backend python cron_license.py

Run continuously (docker compose license-cron service):
    python cron_license.py --loop
"""

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))

import app.models  # noqa: F401

from app.db import SessionLocal
from app.services.license_lifecycle import run_daily_license_jobs


def run_once() -> None:
    db = SessionLocal()
    try:
        stats = run_daily_license_jobs(db)
        print(f"License cron complete: {stats}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--loop", action="store_true", help="Run every 24 hours")
    args = parser.parse_args()

    if not args.loop:
        run_once()
        return

    while True:
        run_once()
        time.sleep(86400)


if __name__ == "__main__":
    main()
