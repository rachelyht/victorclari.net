FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg poppler-utils python3 ca-certificates curl \
  && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/download/2025.01.26/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY worker/package.json worker/package-lock.json* ./worker/
RUN cd worker && npm install --omit=dev
COPY web ./web
COPY worker ./worker

ENV PORT=8787
EXPOSE 8787
WORKDIR /app/worker
CMD ["node", "server.js"]
