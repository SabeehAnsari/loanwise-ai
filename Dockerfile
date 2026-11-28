# syntax=docker/dockerfile:1
# LoanWise AI API: FastAPI + XGBoost, served by uvicorn.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# XGBoost's Linux wheel needs the OpenMP runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
# Use the CPU-only XGBoost build (same version and `xgboost` module): the default
# Linux wheel is 131 MB and pulls a 336 MB NVIDIA library the API never uses.
RUN sed 's/^xgboost==/xgboost-cpu==/' requirements.txt > /tmp/requirements.txt     && pip install -r /tmp/requirements.txt

# API source, the v2 model and card (src/models/), and the shared ml package the API
# imports for training/serving parity (ml/serving.py, ml/prepare.py, ml/models.py).
COPY src/ ./src/
COPY ml/ ./ml/

RUN useradd --create-home --uid 10001 app
USER app

WORKDIR /app/src
# Hosts such as Render choose the port through $PORT; locally it defaults to 8000.
ENV PORT=8000
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ['PORT'] + '/health', timeout=4)" || exit 1

CMD ["sh", "-c", "exec python -m uvicorn main:app --host 0.0.0.0 --port \"$PORT\""]
