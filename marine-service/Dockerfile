FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project source
COPY manage.py .
COPY marine_project/ ./marine_project/
COPY conditions/ ./conditions/
COPY services/ ./services/
COPY cache/ ./cache/

EXPOSE 8081

CMD ["gunicorn", "marine_project.wsgi:application", "--bind", "0.0.0.0:8081", "--workers", "2"]
