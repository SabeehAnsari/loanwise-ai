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
# The cache mount keeps downloaded wheels between rebuilds.
RUN --mount=type=cache,target=/root/.cache/pip     sed 's/^xgboost==/xgboost-cpu==/' requirements.txt > /tmp/requirements.txt     && pip install -r /tmp/requirements.txt

# Source plus the model artefacts it loads (loan_model.json, model_report.json).
COPY src/ ./src/

RUN useradd --create-home --uid 10001 app
USER app

WORKDIR /app/src
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)" || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
