#!/bin/bash
set -e

RG="rg-spiriverse-app-dev-002"
ACR="crspvdev002"
IMAGE="spiriverse-frontend"

echo "=== Preview Sweep $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

az login --identity --output none

NOW=$(date +%s)
DELETED=0

# List all container apps tagged as previews
APPS=$(az containerapp list -g "$RG" \
  --query "[?tags.preview=='true'].[name, tags.\"ttl-days\"]" -o tsv)

if [ -z "$APPS" ]; then
  echo "No preview environments found"
  exit 0
fi

while IFS=$'\t' read -r NAME TTL; do
  TTL=${TTL:-14}

  # Skip TTL=0 (should not happen but just in case)
  if [ "$TTL" -eq 0 ] 2>/dev/null; then
    echo "SKIP $NAME (TTL=0, managed by PR close)"
    continue
  fi

  CREATED=$(az containerapp show -n "$NAME" -g "$RG" \
    --query "systemData.createdAt" -o tsv 2>/dev/null || echo "")

  if [ -z "$CREATED" ]; then
    echo "SKIP $NAME (could not read creation date)"
    continue
  fi

  CREATED_TS=$(date -d "$CREATED" +%s 2>/dev/null || echo 0)
  if [ "$CREATED_TS" -eq 0 ]; then
    echo "SKIP $NAME (could not parse date: $CREATED)"
    continue
  fi

  AGE_DAYS=$(( (NOW - CREATED_TS) / 86400 ))

  if [ "$AGE_DAYS" -gt "$TTL" ]; then
    echo "DELETE $NAME (age: ${AGE_DAYS}d > TTL: ${TTL}d)"
    az containerapp delete -n "$NAME" -g "$RG" --yes

    # Clean up ACR image
    TAG="${NAME#ca-spiriverse-}"
    az acr repository delete --name "$ACR" --image "${IMAGE}:${TAG}" --yes 2>/dev/null \
      && echo "  cleaned image ${IMAGE}:${TAG}" \
      || echo "  image ${IMAGE}:${TAG} not found (ok)"

    DELETED=$((DELETED + 1))
  else
    echo "KEEP  $NAME (age: ${AGE_DAYS}d <= TTL: ${TTL}d)"
  fi
done <<< "$APPS"

echo "=== Done. Deleted $DELETED environment(s) ==="
