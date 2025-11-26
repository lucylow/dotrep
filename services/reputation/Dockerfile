FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY compute_reputation.py .
COPY tests/ ./tests/

# Templates and ingest service will be mounted as volumes in docker-compose
# Or copy if building standalone
# COPY ../../templates /templates
# COPY ../ingest/publish_sample_asset.py ./publish_sample_asset.py

ENTRYPOINT ["python", "compute_reputation.py"]

