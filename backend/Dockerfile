FROM python:3.12-slim

# Install uv (our package manager) directly into the image
RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy only dependency files first so Docker can cache this layer
COPY pyproject.toml uv.lock ./

# Install production dependencies only (skip pytest/httpx dev group)
RUN uv sync --frozen --no-dev

# Now copy the rest of the application code
COPY . .

# Make the entrypoint script executable
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
