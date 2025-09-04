#!/usr/bin/env bash

set -euo pipefail

# Simple interactive redeploy helper for docker-compose-deploy.yml

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose-deploy.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "❌ Missing docker-compose-deploy.yml in $ROOT_DIR"
  exit 1
fi

# Detect compose command (plugin vs legacy)
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "❌ Neither 'docker compose' nor 'docker-compose' found in PATH"
  exit 1
fi

echo "🔧 Using compose: ${COMPOSE_CMD[*]}"

echo "🗂  Working directory: $ROOT_DIR"

read -r -p "🔄 Pull latest from GitHub (git pull --rebase)? [Y/n] " PULL
PULL=${PULL:-Y}
if [[ "$PULL" =~ ^[Yy]$ ]]; then
  echo "➡️  Running: git pull --rebase"
  git -C "$ROOT_DIR" pull --rebase || { echo "❌ git pull failed"; exit 1; }
fi

echo
echo "📦 Detecting services in docker-compose-deploy.yml..."
SERVICES=$("${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" config --services)
if [[ -z "$SERVICES" ]]; then
  echo "❌ No services found in compose file"
  exit 1
fi

echo "Available services:"
idx=1
declare -a SERVICE_LIST
while IFS= read -r svc; do
  printf "  %2d) %s\n" "$idx" "$svc"
  SERVICE_LIST+=("$svc")
  ((idx++))
done <<< "$SERVICES"

echo
echo "👉 Choose what to rebuild/recreate:"
echo "  a) All services"
echo "  s) Select services"
read -r -p "Selection [a/s]: " MODE
MODE=${MODE:-a}

SELECTED=()
if [[ "$MODE" =~ ^[Aa]$ ]]; then
  while IFS= read -r svc; do SELECTED+=("$svc"); done <<< "$SERVICES"
else
  echo "Enter numbers separated by spaces (e.g. 1 3 5):"
  read -r -p "> " CHOICE
  for n in $CHOICE; do
    if [[ "$n" =~ ^[0-9]+$ ]] && (( n>=1 && n<=${#SERVICE_LIST[@]} )); then
      SELECTED+=("${SERVICE_LIST[$((n-1))]}")
    fi
  done
fi

if (( ${#SELECTED[@]} == 0 )); then
  echo "❌ No services selected"
  exit 1
fi

echo
read -r -p "🛠  Run docker compose build for selected services? [Y/n] " RUN_BUILD
RUN_BUILD=${RUN_BUILD:-Y}
if [[ "$RUN_BUILD" =~ ^[Yy]$ ]]; then
  echo "➡️  Building: ${SELECTED[*]}"
  "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" build "${SELECTED[@]}"
fi

echo
read -r -p "🚀 Restart containers (up -d) for selected services? [Y/n] " RUN_UP
RUN_UP=${RUN_UP:-Y}
if [[ "$RUN_UP" =~ ^[Yy]$ ]]; then
  echo "➡️  Starting: ${SELECTED[*]}"
  "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" up -d "${SELECTED[@]}"
fi

echo
read -r -p "🧹 Remove orphan containers? (--remove-orphans) [y/N] " RM_ORPH
RM_ORPH=${RM_ORPH:-N}
if [[ "$RM_ORPH" =~ ^[Yy]$ ]]; then
  "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" up -d --remove-orphans
fi

echo
echo "📋 Current container status:"
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" ps

echo
echo "✅ Done."


