#!/bin/sh
set -e

echo "=== Running database migrations ==="
alembic upgrade head

if [ "${SKIP_SEEDS:-false}" != "true" ]; then
  echo "=== Running database seeds ==="
  python seed.py
  python seed_library.py
  python seed_modules.py
  python seed_assignments.py
else
  echo "=== Skipping seeds (SKIP_SEEDS=true) ==="
fi

if [ $# -gt 0 ]; then
  echo "=== Running: $* ==="
  exec "$@"
fi

echo "=== Starting backend server ==="
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
