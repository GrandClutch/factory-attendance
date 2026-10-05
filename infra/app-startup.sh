#!/bin/bash
set -euxo pipefail

# Save startup messages so we can troubleshoot later.
exec > >(tee -a /var/log/factory-app-startup.log /dev/console) 2>&1

# Install Docker and start it now and on future boots.
dnf install -y docker
systemctl enable --now docker

# Install a specific version of Docker Compose.
mkdir -p /usr/local/lib/docker/cli-plugins

curl --fail --location --retry 5 \
  https://github.com/docker/compose/releases/download/v2.39.4/docker-compose-linux-x86_64 \
  --output /usr/local/lib/docker/cli-plugins/docker-compose

chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Create a home for the AWS application's Compose file.
mkdir -p /opt/factory-app

cat > /opt/factory-app/compose.yaml <<'COMPOSE'
services:
  app:
    image: ghcr.io/grandclutch/factory-attendance:latest
    restart: unless-stopped
    ports:
      - "8000:8000"
COMPOSE
# Download the image and start the application in the background.
docker compose -f /opt/factory-app/compose.yaml pull
docker compose -f /opt/factory-app/compose.yaml up -d