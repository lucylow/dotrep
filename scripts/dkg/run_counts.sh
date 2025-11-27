#!/bin/bash
# Helper script to run DKG data scan
# Usage: ./run_counts.sh

cd "$(dirname "$0")"
python3 dkg_counts.py

