#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FABRIC_ROOT="$REPO_ROOT/infrastructure/fabric"

source "$FABRIC_ROOT/scripts/set-fabric-env.sh"

export FABRIC_CFG_PATH="$FABRIC_ROOT/configtx"

mkdir -p "$FABRIC_ROOT/channel-artifacts"

CHANNEL_BLOCK="$FABRIC_ROOT/channel-artifacts/realestatechannel.block"

configtxgen \
  -profile RealEstateChannelGenesis \
  -outputBlock "$CHANNEL_BLOCK" \
  -channelID realestatechannel

echo "Generated channel genesis block: $CHANNEL_BLOCK"
