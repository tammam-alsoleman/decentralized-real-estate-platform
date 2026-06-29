#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FABRIC_ROOT="$REPO_ROOT/infrastructure/fabric"
ORG_ROOT="$FABRIC_ROOT/organizations"

source "$FABRIC_ROOT/scripts/set-fabric-env.sh"

CHANNEL_NAME="realestatechannel"
CHANNEL_BLOCK="$FABRIC_ROOT/channel-artifacts/realestatechannel.block"
FETCHED_BLOCK="$FABRIC_ROOT/channel-artifacts/${CHANNEL_NAME}-from-orderer.block"

ORDERER_CA="$ORG_ROOT/ordererOrganizations/realestate.local/orderers/orderer.realestate.local/tls/ca.crt"
ORDERER_ADMIN_TLS_CERT="$ORG_ROOT/ordererOrganizations/realestate.local/orderers/orderer.realestate.local/tls/server.crt"
ORDERER_ADMIN_TLS_KEY="$ORG_ROOT/ordererOrganizations/realestate.local/orderers/orderer.realestate.local/tls/server.key"

if [ ! -f "$CHANNEL_BLOCK" ]; then
  echo "Channel genesis block not found: $CHANNEL_BLOCK"
  exit 1
fi

join_orderer() {
  local orderer_channels

  if ! orderer_channels=$(osnadmin channel list \
      -o localhost:17053 \
      --ca-file "$ORDERER_CA" \
      --client-cert "$ORDERER_ADMIN_TLS_CERT" \
      --client-key "$ORDERER_ADMIN_TLS_KEY" 2>&1); then
    echo "$orderer_channels"
    exit 1
  fi

  if printf '%s\n' "$orderer_channels" | grep -q "$CHANNEL_NAME"; then
    echo "Orderer already joined $CHANNEL_NAME; continuing."
    return
  fi

  osnadmin channel join \
    --channelID "$CHANNEL_NAME" \
    --config-block "$CHANNEL_BLOCK" \
    -o localhost:17053 \
    --ca-file "$ORDERER_CA" \
    --client-cert "$ORDERER_ADMIN_TLS_CERT" \
    --client-key "$ORDERER_ADMIN_TLS_KEY"
}

set_peer_env() {
  local msp_id="$1"
  local peer_address="$2"
  local admin_msp_path="$3"
  local peer_tls_root_cert="$4"

  export CORE_PEER_LOCALMSPID="$msp_id"
  export CORE_PEER_ADDRESS="$peer_address"
  export CORE_PEER_MSPCONFIGPATH="$admin_msp_path"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_TLS_ROOTCERT_FILE="$peer_tls_root_cert"
}

join_peer() {
  local org_label="$1"
  local msp_id="$2"
  local peer_address="$3"
  local admin_msp_path="$4"
  local peer_tls_root_cert="$5"
  local peer_channels

  set_peer_env "$msp_id" "$peer_address" "$admin_msp_path" "$peer_tls_root_cert"

  if ! peer_channels=$(peer channel list 2>&1); then
    echo "$peer_channels"
    exit 1
  fi

  if printf '%s\n' "$peer_channels" | grep -q "$CHANNEL_NAME"; then
    echo "$org_label peer already joined $CHANNEL_NAME; continuing."
  else
    peer channel join -b "$FETCHED_BLOCK"
  fi

  peer channel list
}

join_orderer

set_peer_env \
  "RegistryMSP" \
  "localhost:17051" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/users/Admin@registry.realestate.local/msp" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/peers/peer0.registry.realestate.local/tls/ca.crt"

rm -f "$FETCHED_BLOCK"

echo "Fetching genesis block for $CHANNEL_NAME from orderer ..."
peer channel fetch 0 "$FETCHED_BLOCK" \
  -o localhost:17050 \
  -c "$CHANNEL_NAME" \
  --tls \
  --cafile "$ORDERER_CA"

join_peer \
  "Registry Org" \
  "RegistryMSP" \
  "localhost:17051" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/users/Admin@registry.realestate.local/msp" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/peers/peer0.registry.realestate.local/tls/ca.crt"

join_peer \
  "Notary Org" \
  "NotaryMSP" \
  "localhost:8051" \
  "$ORG_ROOT/peerOrganizations/notary.realestate.local/users/Admin@notary.realestate.local/msp" \
  "$ORG_ROOT/peerOrganizations/notary.realestate.local/peers/peer0.notary.realestate.local/tls/ca.crt"

join_peer \
  "Platform Org" \
  "PlatformMSP" \
  "localhost:9051" \
  "$ORG_ROOT/peerOrganizations/platform.realestate.local/users/Admin@platform.realestate.local/msp" \
  "$ORG_ROOT/peerOrganizations/platform.realestate.local/peers/peer0.platform.realestate.local/tls/ca.crt"

echo "All Fabric peers joined $CHANNEL_NAME."
