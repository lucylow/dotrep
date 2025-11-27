FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY publish_sample_asset.py .

# Templates will be mounted as volume in docker-compose
# Or copy if building standalone
# COPY ../../templates /templates

ENTRYPOINT ["python", "publish_sample_asset.py"]

