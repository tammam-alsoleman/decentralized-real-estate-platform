#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FABRIC_ROOT="$REPO_ROOT/infrastructure/fabric"
ORG_ROOT="$FABRIC_ROOT/organizations"

source "$FABRIC_ROOT/scripts/set-fabric-env.sh"

echo "Register/enroll script started."
echo "REPO_ROOT=$REPO_ROOT"
echo "FABRIC_ROOT=$FABRIC_ROOT"
echo "ORG_ROOT=$ORG_ROOT"

check_ca() {
  local name="$1"
  local url="$2"

  echo "Checking $name at $url ..."
  curl -k -sSf "$url/cainfo" >/dev/null
  echo "$name is reachable."
}

check_ca "Registry CA" "https://localhost:7054"
check_ca "Notary CA" "https://localhost:8054"
check_ca "Platform CA" "https://localhost:9054"
check_ca "Orderer CA" "https://localhost:10054"

echo "All Fabric CAs are reachable."
