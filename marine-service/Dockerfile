# ══════════════════════════════════════════════════════════
#  MERMAID Marine Service — Django 6 / Python 3.12
# ══════════════════════════════════════════════════════════

FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy Django source
COPY manage.py .
COPY marine_project/ marine_project/
COPY conditions/ conditions/
COPY services/ services/

EXPOSE 8081

# Collect static files (noop if none, but good practice)
RUN python manage.py collectstatic --noinput 2>/dev/null || true

CMD ["gunicorn", "marine_project.wsgi:application", \
     "--bind", "0.0.0.0:8081", \
     "--workers", "2", \
     "--timeout", "120"]
