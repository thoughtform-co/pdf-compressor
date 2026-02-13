# Build context: repo root (so we can COPY server/ and src/)
FROM python:3.13-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ghostscript qpdf \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server/requirements.txt server/
RUN pip install --no-cache-dir -r server/requirements.txt
COPY server/ server/
COPY src/ src/

WORKDIR /app/server
EXPOSE 8080
ENV PORT=8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
