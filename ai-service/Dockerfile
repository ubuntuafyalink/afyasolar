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

# HuggingFace Spaces route traffic to port 7860.
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
