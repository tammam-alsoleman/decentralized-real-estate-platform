#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FABRIC_ROOT="$REPO_ROOT/infrastructure/fabric"
ORG_ROOT="$FABRIC_ROOT/organizations"

source "$FABRIC_ROOT/scripts/set-fabric-env.sh"

CHANNEL_NAME="${CHANNEL_NAME:-realestatechannel}"
CHAINCODE_NAME="${CHAINCODE_NAME:-realestate-contract}"
SMOKE_TX_ID="${SMOKE_TX_ID:-smoke-sale-$(date -u +%Y%m%d%H%M%S)}"

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

  log "Invoking chaincode as $org_label"
  set_peer_context "$msp_id" "$peer_address" "$admin_msp_path" "$peer_tls_root_cert"

  peer chaincode invoke \
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
    -c "$args_json"
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

assert_final_confirmed() {
  local final_output_file="$1"

  python3 - "$final_output_file" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as file:
    record = json.load(file)

assert record.get("status") == "CONFIRMED", f"expected CONFIRMED, got {record.get('status')}"
assert record.get("registryApproval", {}).get("approved") is True, "registry approval is not approved"
assert record.get("notaryApproval", {}).get("approved") is True, "notary approval is not approved"
assert record.get("platformSubmission", {}).get("submittedByMsp") == "PlatformMSP", "platform submission MSP mismatch"

print("Final contract assertion passed.")
PY
}

log "Validating Fabric smoke test prerequisites"

echo "SMOKE_TX_ID=$SMOKE_TX_ID"

command -v peer >/dev/null 2>&1 || fail "peer binary not found in PATH"
command -v python3 >/dev/null 2>&1 || fail "python3 binary not found in PATH"

require_file "$ORDERER_CA"
require_file "$REGISTRY_MSP_PATH/signcerts/cert.pem"
require_file "$REGISTRY_TLS_CERT"
require_file "$NOTARY_MSP_PATH/signcerts/cert.pem"
require_file "$NOTARY_TLS_CERT"
require_file "$PLATFORM_MSP_PATH/signcerts/cert.pem"
require_file "$PLATFORM_TLS_CERT"

NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

SUBMIT_INPUT_FILE="$TMP_DIR/submit-contract.json"
REGISTRY_INPUT_FILE="$TMP_DIR/approve-registry.json"
NOTARY_INPUT_FILE="$TMP_DIR/approve-notary.json"
FINAL_OUTPUT_FILE="$TMP_DIR/final-contract.json"

cat >"$SUBMIT_INPUT_FILE" <<JSON
{
  "transactionId": "$SMOKE_TX_ID",
  "contractType": "SALE",
  "propertyId": "prop-smoke-001",
  "registryNumber": "REG-SMOKE-001",
  "propertyType": "APARTMENT",
  "location": "Smoke Test City",
  "area": "120",
  "ownershipDocumentHash": "sha256:ownership-smoke",
  "ownershipDocumentCid": "ipfs://ownership-smoke",
  "contractHash": "sha256:contract-smoke-$SMOKE_TX_ID",
  "contractCid": "ipfs://contract-smoke-$SMOKE_TX_ID",
  "auditPackageHash": "sha256:audit-smoke-$SMOKE_TX_ID",
  "auditPackageCid": "ipfs://audit-smoke-$SMOKE_TX_ID",
  "signaturesHash": "sha256:signatures-smoke-$SMOKE_TX_ID",
  "platformReference": "PLATFORM-SMOKE-001",
  "platformProofHash": "sha256:platform-proof-smoke-$SMOKE_TX_ID",
  "occurredAt": "$NOW",
  "sellerUserId": "seller-smoke-001",
  "sellerFullName": "Smoke Seller",
  "sellerNationalId": "SELLER-SMOKE-ID",
  "buyerUserId": "buyer-smoke-001",
  "buyerFullName": "Smoke Buyer",
  "buyerNationalId": "BUYER-SMOKE-ID",
  "sellerSignedAt": "$NOW",
  "buyerSignedAt": "$NOW",
  "price": "100000",
  "currency": "USD"
}
JSON

cat >"$REGISTRY_INPUT_FILE" <<JSON
{
  "transactionId": "$SMOKE_TX_ID",
  "registryReference": "REG-APPROVAL-SMOKE-001",
  "evidenceHash": "sha256:registry-evidence-$SMOKE_TX_ID",
  "evidenceCid": "ipfs://registry-evidence-$SMOKE_TX_ID",
  "decisionNotesHash": "sha256:registry-notes-$SMOKE_TX_ID",
  "decidedAt": "$NOW"
}
JSON

cat >"$NOTARY_INPUT_FILE" <<JSON
{
  "transactionId": "$SMOKE_TX_ID",
  "notaryReference": "NOTARY-APPROVAL-SMOKE-001",
  "evidenceHash": "sha256:notary-evidence-$SMOKE_TX_ID",
  "evidenceCid": "ipfs://notary-evidence-$SMOKE_TX_ID",
  "decisionNotesHash": "sha256:notary-notes-$SMOKE_TX_ID",
  "decidedAt": "$NOW"
}
JSON

SUBMIT_INPUT="$(compact_json_file "$SUBMIT_INPUT_FILE")"
REGISTRY_INPUT="$(compact_json_file "$REGISTRY_INPUT_FILE")"
NOTARY_INPUT="$(compact_json_file "$NOTARY_INPUT_FILE")"

invoke_chaincode \
  "Platform Org" \
  "PlatformMSP" \
  "$PLATFORM_PEER_ENDPOINT" \
  "$PLATFORM_MSP_PATH" \
  "$PLATFORM_TLS_CERT" \
  "$(chaincode_args_json SubmitContract "$SUBMIT_INPUT")"

invoke_chaincode \
  "Registry Org" \
  "RegistryMSP" \
  "$REGISTRY_PEER_ENDPOINT" \
  "$REGISTRY_MSP_PATH" \
  "$REGISTRY_TLS_CERT" \
  "$(chaincode_args_json ApproveByRegistry "$REGISTRY_INPUT")"

invoke_chaincode \
  "Notary Org" \
  "NotaryMSP" \
  "$NOTARY_PEER_ENDPOINT" \
  "$NOTARY_MSP_PATH" \
  "$NOTARY_TLS_CERT" \
  "$(chaincode_args_json ApproveByNotary "$NOTARY_INPUT")"

invoke_chaincode \
  "Platform Org" \
  "PlatformMSP" \
  "$PLATFORM_PEER_ENDPOINT" \
  "$PLATFORM_MSP_PATH" \
  "$PLATFORM_TLS_CERT" \
  "$(chaincode_args_json ConfirmContract "$SMOKE_TX_ID")"

query_chaincode \
  "Platform Org" \
  "PlatformMSP" \
  "$PLATFORM_PEER_ENDPOINT" \
  "$PLATFORM_MSP_PATH" \
  "$PLATFORM_TLS_CERT" \
  "$(chaincode_args_json GetContractByTxId "$SMOKE_TX_ID")" >"$FINAL_OUTPUT_FILE"

cat "$FINAL_OUTPUT_FILE"
assert_final_confirmed "$FINAL_OUTPUT_FILE"

query_chaincode \
  "Platform Org" \
  "PlatformMSP" \
  "$PLATFORM_PEER_ENDPOINT" \
  "$PLATFORM_MSP_PATH" \
  "$PLATFORM_TLS_CERT" \
  "$(chaincode_args_json GetContractHistory "$SMOKE_TX_ID")"

log "Smoke test completed"
echo "Final status: CONFIRMED"
