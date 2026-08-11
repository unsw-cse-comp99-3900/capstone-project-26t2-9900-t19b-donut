#!/usr/bin/env bash
# Local assessment launch script for Shiftopia

set -euo pipefail

echo "🚀 Starting the Shiftopia local assessment stack in Docker..."

# Resolve Docker from PATH first, then fall back to Docker Desktop's bundled
# macOS CLI. Some Docker Desktop installations do not create a system symlink.
if command -v docker >/dev/null 2>&1; then
    DOCKER_BIN="$(command -v docker)"
elif [[ -x /Applications/Docker.app/Contents/Resources/bin/docker ]]; then
    DOCKER_CLI_DIR=/Applications/Docker.app/Contents/Resources/bin
    # Docker invokes credential helpers (for example
    # docker-credential-desktop) as child processes via PATH.
    export PATH="$DOCKER_CLI_DIR:$PATH"
    DOCKER_BIN="$DOCKER_CLI_DIR/docker"
    echo "ℹ️  Docker CLI is not in PATH; using the Docker Desktop bundled CLI."
else
    echo "❌ Error: Docker is not installed. Install and start Docker Desktop first."
    exit 1
fi

if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
    echo "❌ Error: Docker daemon is not running. Please start Docker Desktop first."
    exit 1
fi

# Build and start services in background
echo "📦 Building containers and starting services..."
COMPOSE_WAIT_TIMEOUT="${COMPOSE_WAIT_TIMEOUT:-300}"
if ! "$DOCKER_BIN" compose up --build -d --wait --wait-timeout "$COMPOSE_WAIT_TIMEOUT"; then
    echo "❌ One or more services failed to become healthy."
    "$DOCKER_BIN" compose ps
    echo "Inspect logs with: $DOCKER_BIN compose logs"
    exit 1
fi

echo ""
echo "✅ Shiftopia local assessment stack is healthy and ready."
echo "--------------------------------------------------------"
echo "🌐 Frontend URL:          http://localhost:8080"
echo "⚙️  Optimizer Service URL:  http://localhost:5005 (mapped from 8080)"
echo "🤖 ML Service URL:         http://localhost:8000"
echo "--------------------------------------------------------"
echo "To view service logs, run:       $DOCKER_BIN compose logs -f"
echo "To shut down the services, run:  $DOCKER_BIN compose down"
echo "--------------------------------------------------------"
