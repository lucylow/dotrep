#!/bin/bash
# Helper script to run reputation computation
# Usage: ./run_compute.sh

cd "$(dirname "$0")"
python3 compute_and_publish_reps.py

