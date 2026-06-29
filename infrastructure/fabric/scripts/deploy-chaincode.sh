#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FABRIC_ROOT="$REPO_ROOT/infrastructure/fabric"
ORG_ROOT="$FABRIC_ROOT/organizations"

source "$FABRIC_ROOT/scripts/set-fabric-env.sh"

CHANNEL_NAME="${CHANNEL_NAME:-realestatechannel}"
CHAINCODE_NAME="${CHAINCODE_NAME:-realestate-contract}"
CHAINCODE_VERSION="${CHAINCODE_VERSION:-1.0}"
CHAINCODE_SEQUENCE="${CHAINCODE_SEQUENCE:-1}"
CHAINCODE_LABEL="${CHAINCODE_LABEL:-realestate-contract_1.0}"
CHAINCODE_LANG="${CHAINCODE_LANG:-golang}"
ENDORSEMENT_POLICY="${ENDORSEMENT_POLICY:-AND('RegistryMSP.peer','NotaryMSP.peer','PlatformMSP.peer')}"

CHAINCODE_PATH="${CHAINCODE_PATH:-$REPO_ROOT/chaincode/realestate-contract}"
ARTIFACTS_DIR="$FABRIC_ROOT/chaincode-artifacts"
PACKAGE_FILE="$ARTIFACTS_DIR/${CHAINCODE_LABEL}.tar.gz"

ORDERER_ENDPOINT="${ORDERER_ENDPOINT:-localhost:17050}"
ORDERER_HOSTNAME_OVERRIDE="${ORDERER_HOSTNAME_OVERRIDE:-orderer.realestate.local}"
ORDERER_CA="$ORG_ROOT/ordererOrganizations/realestate.local/orderers/orderer.realestate.local/tls/ca.crt"

REGISTRY_MSP_PATH="$ORG_ROOT/peerOrganizations/registry.realestate.local/users/Admin@registry.realestate.local/msp"
REGISTRY_TLS_CERT="$ORG_ROOT/peerOrganizations/registry.realestate.local/peers/peer0.registry.realestate.local/tls/ca.crt"
REGISTRY_PEER_ENDPOINT="${REGISTRY_PEER_ENDPOINT:-localhost:17051}"

NOTARY_MSP_PATH="$ORG_ROOT/peerOrganizations/notary.realestate.local/users/Admin@notary.realestate.local/msp"
NOTARY_TLS_CERT="$ORG_ROOT/peerOrganizations/notary.realestate.local/peers/peer0.notary.realestate.local/tls/ca.crt"
NOTARY_PEER_ENDPOINT="${NOTARY_PEER_ENDPOINT:-localhost:8051}"

PLATFORM_MSP_PATH="$ORG_ROOT/peerOrganizations/platform.realestate.local/users/Admin@platform.realestate.local/msp"
PLATFORM_TLS_CERT="$ORG_ROOT/peerOrganizations/platform.realestate.local/peers/peer0.platform.realestate.local/tls/ca.crt"
PLATFORM_PEER_ENDPOINT="${PLATFORM_PEER_ENDPOINT:-localhost:9051}"

PACKAGE_ID=""

log() {
  echo
  echo "==> $*"
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_file() {
  local path="$1"

  if [ ! -f "$path" ]; then
    fail "Required file not found: $path"
  fi
}

set_peer_context() {
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

package_chaincode() {
  log "Packaging chaincode"

  mkdir -p "$ARTIFACTS_DIR"
  peer lifecycle chaincode package "$PACKAGE_FILE" \
    --path "$CHAINCODE_PATH" \
    --lang "$CHAINCODE_LANG" \
    --label "$CHAINCODE_LABEL"

  echo "Packaged chaincode: $PACKAGE_FILE"
}

calculate_package_id() {
  log "Calculating chaincode package ID"

  PACKAGE_ID="$(peer lifecycle chaincode calculatepackageid "$PACKAGE_FILE")"
  if [ -z "$PACKAGE_ID" ]; then
    fail "Failed to calculate chaincode package ID"
  fi

  echo "PACKAGE_ID=$PACKAGE_ID"
}

install_chaincode() {
  local org_label="$1"
  local msp_id="$2"
  local peer_address="$3"
  local admin_msp_path="$4"
  local peer_tls_root_cert="$5"
  local installed_packages

  log "Installing chaincode on $org_label"
  set_peer_context "$msp_id" "$peer_address" "$admin_msp_path" "$peer_tls_root_cert"

  if ! installed_packages="$(peer lifecycle chaincode queryinstalled 2>&1)"; then
    echo "$installed_packages"
    fail "Failed to query installed chaincode packages for $org_label"
  fi

  if printf '%s\n' "$installed_packages" | grep -q "$PACKAGE_ID"; then
    echo "$CHAINCODE_LABEL is already installed on $org_label; continuing."
    return
  fi

  peer lifecycle chaincode install "$PACKAGE_FILE"
}

approve_for_org() {
  local org_label="$1"
  local msp_id="$2"
  local peer_address="$3"
  local admin_msp_path="$4"
  local peer_tls_root_cert="$5"

  log "Approving chaincode definition for $org_label"
  set_peer_context "$msp_id" "$peer_address" "$admin_msp_path" "$peer_tls_root_cert"

  peer lifecycle chaincode approveformyorg \
    -o "$ORDERER_ENDPOINT" \
    --ordererTLSHostnameOverride "$ORDERER_HOSTNAME_OVERRIDE" \
    --channelID "$CHANNEL_NAME" \
    --name "$CHAINCODE_NAME" \
    --version "$CHAINCODE_VERSION" \
    --package-id "$PACKAGE_ID" \
    --sequence "$CHAINCODE_SEQUENCE" \
    --signature-policy "$ENDORSEMENT_POLICY" \
    --tls \
    --cafile "$ORDERER_CA"
}

check_commit_readiness() {
  log "Checking commit readiness"

  set_peer_context "RegistryMSP" "$REGISTRY_PEER_ENDPOINT" "$REGISTRY_MSP_PATH" "$REGISTRY_TLS_CERT"

  peer lifecycle chaincode checkcommitreadiness \
    --channelID "$CHANNEL_NAME" \
    --name "$CHAINCODE_NAME" \
    --version "$CHAINCODE_VERSION" \
    --sequence "$CHAINCODE_SEQUENCE" \
    --signature-policy "$ENDORSEMENT_POLICY" \
    --output json
}

commit_chaincode() {
  local committed_definition
  local commit_output

  log "Committing chaincode definition"

  set_peer_context "RegistryMSP" "$REGISTRY_PEER_ENDPOINT" "$REGISTRY_MSP_PATH" "$REGISTRY_TLS_CERT"

  if committed_definition="$(peer lifecycle chaincode querycommitted \
      --channelID "$CHANNEL_NAME" \
      --name "$CHAINCODE_NAME" 2>&1)"; then
    if printf '%s\n' "$committed_definition" | grep -q "Version: $CHAINCODE_VERSION" &&
      printf '%s\n' "$committed_definition" | grep -q "Sequence: $CHAINCODE_SEQUENCE"; then
      echo "$CHAINCODE_NAME is already committed on $CHANNEL_NAME with version $CHAINCODE_VERSION and sequence $CHAINCODE_SEQUENCE; continuing."
      return
    fi
  fi

  if ! commit_output="$(peer lifecycle chaincode commit \
      -o "$ORDERER_ENDPOINT" \
      --ordererTLSHostnameOverride "$ORDERER_HOSTNAME_OVERRIDE" \
      --channelID "$CHANNEL_NAME" \
      --name "$CHAINCODE_NAME" \
      --version "$CHAINCODE_VERSION" \
      --sequence "$CHAINCODE_SEQUENCE" \
      --signature-policy "$ENDORSEMENT_POLICY" \
      --tls \
      --cafile "$ORDERER_CA" \
      --peerAddresses "$REGISTRY_PEER_ENDPOINT" \
      --tlsRootCertFiles "$REGISTRY_TLS_CERT" \
      --peerAddresses "$NOTARY_PEER_ENDPOINT" \
      --tlsRootCertFiles "$NOTARY_TLS_CERT" \
      --peerAddresses "$PLATFORM_PEER_ENDPOINT" \
      --tlsRootCertFiles "$PLATFORM_TLS_CERT" 2>&1)"; then
    if printf '%s\n' "$commit_output" | grep -qi "already.*committed"; then
      echo "$CHAINCODE_NAME is already committed on $CHANNEL_NAME; continuing."
      return
    fi
    echo "$commit_output"
    fail "Failed to commit chaincode definition"
  fi

  echo "$commit_output"
}

query_committed() {
  log "Querying committed chaincode definition"

  set_peer_context "RegistryMSP" "$REGISTRY_PEER_ENDPOINT" "$REGISTRY_MSP_PATH" "$REGISTRY_TLS_CERT"

  peer lifecycle chaincode querycommitted \
    --channelID "$CHANNEL_NAME" \
    --name "$CHAINCODE_NAME"
}

log "Validating Fabric deployment prerequisites"

command -v peer >/dev/null 2>&1 || fail "peer binary not found in PATH"

if [ ! -d "$CHAINCODE_PATH" ]; then
  fail "Chaincode path not found: $CHAINCODE_PATH"
fi

require_file "$ORDERER_CA"
require_file "$REGISTRY_MSP_PATH/signcerts/cert.pem"
require_file "$REGISTRY_TLS_CERT"
require_file "$NOTARY_MSP_PATH/signcerts/cert.pem"
require_file "$NOTARY_TLS_CERT"
require_file "$PLATFORM_MSP_PATH/signcerts/cert.pem"
require_file "$PLATFORM_TLS_CERT"

package_chaincode
calculate_package_id

install_chaincode "Registry Org" "RegistryMSP" "$REGISTRY_PEER_ENDPOINT" "$REGISTRY_MSP_PATH" "$REGISTRY_TLS_CERT"
install_chaincode "Notary Org" "NotaryMSP" "$NOTARY_PEER_ENDPOINT" "$NOTARY_MSP_PATH" "$NOTARY_TLS_CERT"
install_chaincode "Platform Org" "PlatformMSP" "$PLATFORM_PEER_ENDPOINT" "$PLATFORM_MSP_PATH" "$PLATFORM_TLS_CERT"

approve_for_org "Registry Org" "RegistryMSP" "$REGISTRY_PEER_ENDPOINT" "$REGISTRY_MSP_PATH" "$REGISTRY_TLS_CERT"
approve_for_org "Notary Org" "NotaryMSP" "$NOTARY_PEER_ENDPOINT" "$NOTARY_MSP_PATH" "$NOTARY_TLS_CERT"
approve_for_org "Platform Org" "PlatformMSP" "$PLATFORM_PEER_ENDPOINT" "$PLATFORM_MSP_PATH" "$PLATFORM_TLS_CERT"

check_commit_readiness
commit_chaincode
query_committed

log "Chaincode deployment completed"
