# AfyaSolar AI Engine - container image (also works as a HuggingFace Space).
FROM python:3.11-slim

WORKDIR /app

# System deps some ML wheels expect.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Install the serving stack first (better layer caching).
COPY requirements.txt requirements-serve.txt ./
RUN pip install --no-cache-dir -r requirements-serve.txt

COPY . .

# Drop root before running the service.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

# HuggingFace Spaces route traffic to port 7860.
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD curl -fsS http://127.0.0.1:7860/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
