#!/bin/sh
set -e

echo "=== Running database seeds ==="
python seed.py
python seed_library.py
python seed_modules.py

echo "=== Starting backend server ==="
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
