#!/usr/bin/env bash
# Scan the working tree for secrets. Uses local gitleaks if installed, else Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$ROOT/.gitleaks.toml"
IMAGE="ghcr.io/gitleaks/gitleaks:latest"

if [[ ! -f "$CONFIG" ]]; then
  echo "Missing $CONFIG" >&2
  exit 1
fi

ARGS=(detect --source="$ROOT" --config="$CONFIG" --no-git --redact --verbose "$@")

if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks "${ARGS[@]}"
fi

if command -v docker >/dev/null 2>&1; then
  exec docker run --rm -v "$ROOT:/repo" -w /repo "$IMAGE" \
    detect --source=/repo --config=/repo/.gitleaks.toml --no-git --redact --verbose "$@"
fi

echo "Install gitleaks (brew install gitleaks) or Docker to run pnpm secrets:scan" >&2
exit 1
