FROM python:3.12-slim-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg poppler-utils ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY worker/requirements.txt ./worker/requirements.txt
RUN pip install --no-cache-dir -r worker/requirements.txt

COPY worker ./worker

ENV PORT=8787
EXPOSE 8787
WORKDIR /app/worker
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
