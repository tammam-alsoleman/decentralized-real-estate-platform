#!/usr/bin/env bash

# Usage:
# source infrastructure/fabric/scripts/set-fabric-env.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FABRIC_TOOLS_DIR="$REPO_ROOT/tools/fabric"

if [ ! -d "$FABRIC_TOOLS_DIR/bin" ]; then
  echo "Fabric tools were not found at: $FABRIC_TOOLS_DIR/bin"
  echo "Please install Fabric tools first under tools/fabric."
  return 1 2>/dev/null || exit 1
fi

export PATH="$FABRIC_TOOLS_DIR/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_TOOLS_DIR/config"

echo "Fabric environment loaded."
echo "FABRIC_TOOLS_DIR=$FABRIC_TOOLS_DIR"
echo "FABRIC_CFG_PATH=$FABRIC_CFG_PATH"
