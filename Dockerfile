# ---- Base image ----
FROM python:3.11-slim AS base

# Install FFmpeg and image dependencies (required by MoviePy and Pillow)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ffmpeg \
      build-essential \
      zlib1g-dev \
      libjpeg-dev \
      libpng-dev && \
    rm -rf /var/lib/apt/lists/*

# ---- Python deps ----
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir supabase==2.4.2

# ---- Code ----
COPY . .

# Default command: run the long‑running worker
CMD ["python", "-m", "backend.worker.main"] 