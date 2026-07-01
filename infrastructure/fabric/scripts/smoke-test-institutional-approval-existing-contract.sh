#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FABRIC_ROOT="$REPO_ROOT/infrastructure/fabric"
ORG_ROOT="$FABRIC_ROOT/organizations"

source "$FABRIC_ROOT/scripts/set-fabric-env.sh"

CHANNEL_NAME="${CHANNEL_NAME:-realestatechannel}"
CHAINCODE_NAME="${CHAINCODE_NAME:-realestate-contract}"

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

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log() {
  echo
  echo "==> $*"
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

usage() {
  echo "Usage: bash infrastructure/fabric/scripts/smoke-test-institutional-approval-existing-contract.sh <transactionId>" >&2
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

compact_json_file() {
  local json_file="$1"

  python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1])), separators=(",", ":")))' "$json_file"
}

chaincode_args_json() {
  python3 -c 'import json,sys; print(json.dumps({"Args": sys.argv[1:]}, separators=(",", ":")))' "$@"
}

invoke_chaincode() {
  local org_label="$1"
  local msp_id="$2"
  local peer_address="$3"
  local admin_msp_path="$4"
  local peer_tls_root_cert="$5"
  local args_json="$6"
  local output

  log "Invoking chaincode as $org_label" >&2
  set_peer_context "$msp_id" "$peer_address" "$admin_msp_path" "$peer_tls_root_cert"

  if ! output="$(peer chaincode invoke \
    -o "$ORDERER_ENDPOINT" \
    --ordererTLSHostnameOverride "$ORDERER_HOSTNAME_OVERRIDE" \
    --tls \
    --cafile "$ORDERER_CA" \
    -C "$CHANNEL_NAME" \
    -n "$CHAINCODE_NAME" \
    --peerAddresses "$REGISTRY_PEER_ENDPOINT" \
    --tlsRootCertFiles "$REGISTRY_TLS_CERT" \
    --peerAddresses "$NOTARY_PEER_ENDPOINT" \
    --tlsRootCertFiles "$NOTARY_TLS_CERT" \
    --peerAddresses "$PLATFORM_PEER_ENDPOINT" \
    --tlsRootCertFiles "$PLATFORM_TLS_CERT" \
    --waitForEvent \
    --waitForEventTimeout 120s \
    -c "$args_json" 2>&1)"; then
    echo "$output" >&2
    fail "Chaincode invoke failed for $org_label"
  fi

  echo "$output"
}

query_chaincode() {
  local org_label="$1"
  local msp_id="$2"
  local peer_address="$3"
  local admin_msp_path="$4"
  local peer_tls_root_cert="$5"
  local args_json="$6"

  echo >&2
  echo "==> Querying chaincode as $org_label" >&2
  set_peer_context "$msp_id" "$peer_address" "$admin_msp_path" "$peer_tls_root_cert"

  peer chaincode query \
    -C "$CHANNEL_NAME" \
    -n "$CHAINCODE_NAME" \
    -c "$args_json"
}

assert_status() {
  local record_file="$1"
  local expected_status="$2"

  python3 - "$record_file" "$expected_status" <<'PY'
import json
import sys

path = sys.argv[1]
expected_status = sys.argv[2]

with open(path, "r", encoding="utf-8") as file:
    record = json.load(file)

actual_status = record.get("status")
assert actual_status == expected_status, f"expected {expected_status}, got {actual_status}"

print(f"Status assertion passed: {actual_status}")
PY
}

extract_invoke_tx_id() {
  local output="$1"
  local tx_id

  tx_id="$(printf '%s\n' "$output" | sed -n 's/.*txid: \([^ ]*\).*/\1/p' | tail -1)"

  if [ -z "$tx_id" ]; then
    tx_id="$(printf '%s\n' "$output" | sed -n 's/.*txid \[\([^]]*\)\].*/\1/p' | tail -1)"
  fi

  if [ -z "$tx_id" ]; then
    echo "unavailable"
    return
  fi

  echo "$tx_id"
}

write_registry_approval_payload() {
  local tx_id="$1"
  local output_file="$2"
  local now

  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat >"$output_file" <<JSON
{
  "transactionId": "$tx_id",
  "registryReference": "REG-INSTITUTIONAL-SMOKE-$tx_id",
  "evidenceHash": "sha256:registry-institutional-smoke-evidence-$tx_id",
  "evidenceCid": "ipfs://registry-institutional-smoke-evidence-$tx_id",
  "decisionNotesHash": "sha256:registry-institutional-smoke-notes-$tx_id",
  "decidedAt": "$now"
}
JSON
}

write_notary_approval_payload() {
  local tx_id="$1"
  local output_file="$2"
  local now

  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat >"$output_file" <<JSON
{
  "transactionId": "$tx_id",
  "notaryReference": "NOTARY-INSTITUTIONAL-SMOKE-$tx_id",
  "evidenceHash": "sha256:notary-institutional-smoke-evidence-$tx_id",
  "evidenceCid": "ipfs://notary-institutional-smoke-evidence-$tx_id",
  "decisionNotesHash": "sha256:notary-institutional-smoke-notes-$tx_id",
  "decidedAt": "$now"
}
JSON
}

if [ "$#" -ne 1 ]; then
  usage
  exit 1
fi

TRANSACTION_ID="$1"

if [ -z "$TRANSACTION_ID" ]; then
  usage
  exit 1
fi

INITIAL_OUTPUT_FILE="$TMP_DIR/initial-contract.json"
FINAL_OUTPUT_FILE="$TMP_DIR/final-contract.json"
REGISTRY_INPUT_FILE="$TMP_DIR/approve-registry.json"
NOTARY_INPUT_FILE="$TMP_DIR/approve-notary.json"

log "Validating institutional approval smoke test prerequisites"

echo "TRANSACTION_ID=$TRANSACTION_ID"

command -v peer >/dev/null 2>&1 || fail "peer binary not found in PATH"
command -v python3 >/dev/null 2>&1 || fail "python3 binary not found in PATH"

require_file "$ORDERER_CA"
require_file "$REGISTRY_MSP_PATH/signcerts/cert.pem"
require_file "$REGISTRY_TLS_CERT"
require_file "$NOTARY_MSP_PATH/signcerts/cert.pem"
require_file "$NOTARY_TLS_CERT"
require_file "$PLATFORM_MSP_PATH/signcerts/cert.pem"
require_file "$PLATFORM_TLS_CERT"

query_chaincode \
  "Platform Org" \
  "PlatformMSP" \
  "$PLATFORM_PEER_ENDPOINT" \
  "$PLATFORM_MSP_PATH" \
  "$PLATFORM_TLS_CERT" \
  "$(chaincode_args_json GetContractByTxId "$TRANSACTION_ID")" >"$INITIAL_OUTPUT_FILE"

cat "$INITIAL_OUTPUT_FILE"
assert_status "$INITIAL_OUTPUT_FILE" "PENDING_EXTERNAL_APPROVALS"

write_registry_approval_payload "$TRANSACTION_ID" "$REGISTRY_INPUT_FILE"
write_notary_approval_payload "$TRANSACTION_ID" "$NOTARY_INPUT_FILE"

REGISTRY_OUTPUT="$(invoke_chaincode \
  "Registry Org" \
  "RegistryMSP" \
  "$REGISTRY_PEER_ENDPOINT" \
  "$REGISTRY_MSP_PATH" \
  "$REGISTRY_TLS_CERT" \
  "$(chaincode_args_json ApproveByRegistry "$(compact_json_file "$REGISTRY_INPUT_FILE")")")"
echo "$REGISTRY_OUTPUT"
REGISTRY_APPROVAL_TX_ID="$(extract_invoke_tx_id "$REGISTRY_OUTPUT")"

NOTARY_OUTPUT="$(invoke_chaincode \
  "Notary Org" \
  "NotaryMSP" \
  "$NOTARY_PEER_ENDPOINT" \
  "$NOTARY_MSP_PATH" \
  "$NOTARY_TLS_CERT" \
  "$(chaincode_args_json ApproveByNotary "$(compact_json_file "$NOTARY_INPUT_FILE")")")"
echo "$NOTARY_OUTPUT"
NOTARY_APPROVAL_TX_ID="$(extract_invoke_tx_id "$NOTARY_OUTPUT")"

CONFIRM_OUTPUT="$(invoke_chaincode \
  "Platform Org" \
  "PlatformMSP" \
  "$PLATFORM_PEER_ENDPOINT" \
  "$PLATFORM_MSP_PATH" \
  "$PLATFORM_TLS_CERT" \
  "$(chaincode_args_json ConfirmContract "$TRANSACTION_ID")")"
echo "$CONFIRM_OUTPUT"
CONFIRM_TX_ID="$(extract_invoke_tx_id "$CONFIRM_OUTPUT")"

query_chaincode \
  "Platform Org" \
  "PlatformMSP" \
  "$PLATFORM_PEER_ENDPOINT" \
  "$PLATFORM_MSP_PATH" \
  "$PLATFORM_TLS_CERT" \
  "$(chaincode_args_json GetContractByTxId "$TRANSACTION_ID")" >"$FINAL_OUTPUT_FILE"

cat "$FINAL_OUTPUT_FILE"
assert_status "$FINAL_OUTPUT_FILE" "CONFIRMED"

log "Institutional approval smoke test completed"
echo "transactionId: $TRANSACTION_ID"
echo "final status: CONFIRMED"
echo "registry approval transaction id: $REGISTRY_APPROVAL_TX_ID"
echo "notary approval transaction id: $NOTARY_APPROVAL_TX_ID"
echo "confirm transaction id: $CONFIRM_TX_ID"
