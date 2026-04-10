FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY web-react/package*.json ./
RUN npm ci

COPY web-react/ ./
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir "psycopg[binary]" pdfplumber

COPY . /app/
COPY --from=frontend-build /frontend/dist /app/web-react/dist

EXPOSE 8765

CMD ["/bin/sh", "/app/docker/start-pcp.sh"]
