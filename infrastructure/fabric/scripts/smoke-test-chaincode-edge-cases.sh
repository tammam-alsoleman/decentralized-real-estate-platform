#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FABRIC_ROOT="$REPO_ROOT/infrastructure/fabric"
ORG_ROOT="$FABRIC_ROOT/organizations"

source "$FABRIC_ROOT/scripts/set-fabric-env.sh"

CHANNEL_NAME="${CHANNEL_NAME:-realestatechannel}"
CHAINCODE_NAME="${CHAINCODE_NAME:-realestate-contract}"
EDGE_TX_PREFIX="${EDGE_TX_PREFIX:-edge-sale-$(date -u +%Y%m%d%H%M%S)}"

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

expect_invoke_failure() {
  local case_name="$1"
  shift
  local output

  echo "Expecting failure: $case_name"
  if output="$(invoke_chaincode "$@" 2>&1)"; then
    echo "$output"
    fail "$case_name unexpectedly succeeded"
  fi

  echo "$case_name failed as expected."
}

assert_status() {
  local tx_id="$1"
  local expected_status="$2"
  local output_file="$TMP_DIR/${tx_id}-query.json"

  query_chaincode \
    "Platform Org" \
    "PlatformMSP" \
    "$PLATFORM_PEER_ENDPOINT" \
    "$PLATFORM_MSP_PATH" \
    "$PLATFORM_TLS_CERT" \
    "$(chaincode_args_json GetContractByTxId "$tx_id")" >"$output_file"

  python3 - "$output_file" "$expected_status" <<'PY'
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

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"

  if ! printf '%s\n' "$haystack" | grep -q "$needle"; then
    fail "$label did not contain expected text: $needle"
  fi
}

write_sale_payload() {
  local tx_id="$1"
  local output_file="$2"
  local price="${3:-100000}"
  local contract_hash_suffix="${4:-$tx_id}"
  local now

  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat >"$output_file" <<JSON
{
  "transactionId": "$tx_id",
  "contractType": "SALE",
  "propertyId": "prop-edge-001",
  "registryNumber": "REG-EDGE-001",
  "propertyType": "APARTMENT",
  "location": "Edge Test City",
  "area": "120",
  "ownershipDocumentHash": "sha256:ownership-edge",
  "ownershipDocumentCid": "ipfs://ownership-edge",
  "contractHash": "sha256:contract-edge-$contract_hash_suffix",
  "contractCid": "ipfs://contract-edge-$tx_id",
  "auditPackageHash": "sha256:audit-edge-$tx_id",
  "auditPackageCid": "ipfs://audit-edge-$tx_id",
  "signaturesHash": "sha256:signatures-edge-$tx_id",
  "platformReference": "PLATFORM-EDGE-001",
  "platformProofHash": "sha256:platform-proof-edge-$tx_id",
  "occurredAt": "$now",
  "sellerUserId": "seller-edge-001",
  "sellerFullName": "Edge Seller",
  "sellerNationalId": "SELLER-EDGE-ID",
  "buyerUserId": "buyer-edge-001",
  "buyerFullName": "Edge Buyer",
  "buyerNationalId": "BUYER-EDGE-ID",
  "sellerSignedAt": "$now",
  "buyerSignedAt": "$now",
  "price": "$price",
  "currency": "USD"
}
JSON
}

write_registry_approval_payload() {
  local tx_id="$1"
  local output_file="$2"
  local now

  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat >"$output_file" <<JSON
{
  "transactionId": "$tx_id",
  "registryReference": "REG-APPROVAL-EDGE-001",
  "evidenceHash": "sha256:registry-evidence-$tx_id",
  "evidenceCid": "ipfs://registry-evidence-$tx_id",
  "decisionNotesHash": "sha256:registry-notes-$tx_id",
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
  "notaryReference": "NOTARY-APPROVAL-EDGE-001",
  "evidenceHash": "sha256:notary-evidence-$tx_id",
  "evidenceCid": "ipfs://notary-evidence-$tx_id",
  "decisionNotesHash": "sha256:notary-notes-$tx_id",
  "decidedAt": "$now"
}
JSON
}

write_registry_rejection_payload() {
  local tx_id="$1"
  local output_file="$2"
  local now

  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat >"$output_file" <<JSON
{
  "transactionId": "$tx_id",
  "registryReference": "REG-REJECTION-EDGE-001",
  "evidenceHash": "sha256:registry-rejection-evidence-$tx_id",
  "evidenceCid": "ipfs://registry-rejection-evidence-$tx_id",
  "reasonCode": "REGISTRY_DATA_MISMATCH",
  "reasonSummary": "Registry smoke test rejection",
  "decisionNotesHash": "sha256:registry-rejection-notes-$tx_id",
  "decidedAt": "$now"
}
JSON
}

write_notary_rejection_payload() {
  local tx_id="$1"
  local output_file="$2"
  local now

  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat >"$output_file" <<JSON
{
  "transactionId": "$tx_id",
  "notaryReference": "NOTARY-REJECTION-EDGE-001",
  "evidenceHash": "sha256:notary-rejection-evidence-$tx_id",
  "evidenceCid": "ipfs://notary-rejection-evidence-$tx_id",
  "reasonCode": "NOTARY_SIGNATURE_MISMATCH",
  "reasonSummary": "Notary smoke test rejection",
  "decisionNotesHash": "sha256:notary-rejection-notes-$tx_id",
  "decidedAt": "$now"
}
JSON
}

invoke_submit() {
  local tx_id="$1"
  local payload_file="$2"
  local payload

  payload="$(compact_json_file "$payload_file")"
  invoke_chaincode \
    "Platform Org" \
    "PlatformMSP" \
    "$PLATFORM_PEER_ENDPOINT" \
    "$PLATFORM_MSP_PATH" \
    "$PLATFORM_TLS_CERT" \
    "$(chaincode_args_json SubmitContract "$payload")"
}

invoke_registry_approval() {
  local payload_file="$1"
  local payload

  payload="$(compact_json_file "$payload_file")"
  invoke_chaincode \
    "Registry Org" \
    "RegistryMSP" \
    "$REGISTRY_PEER_ENDPOINT" \
    "$REGISTRY_MSP_PATH" \
    "$REGISTRY_TLS_CERT" \
    "$(chaincode_args_json ApproveByRegistry "$payload")"
}

invoke_notary_approval() {
  local payload_file="$1"
  local payload

  payload="$(compact_json_file "$payload_file")"
  invoke_chaincode \
    "Notary Org" \
    "NotaryMSP" \
    "$NOTARY_PEER_ENDPOINT" \
    "$NOTARY_MSP_PATH" \
    "$NOTARY_TLS_CERT" \
    "$(chaincode_args_json ApproveByNotary "$payload")"
}

invoke_confirm() {
  local tx_id="$1"

  invoke_chaincode \
    "Platform Org" \
    "PlatformMSP" \
    "$PLATFORM_PEER_ENDPOINT" \
    "$PLATFORM_MSP_PATH" \
    "$PLATFORM_TLS_CERT" \
    "$(chaincode_args_json ConfirmContract "$tx_id")"
}

complete_successfully() {
  local tx_id="$1"
  local registry_payload="$TMP_DIR/${tx_id}-registry-approval.json"
  local notary_payload="$TMP_DIR/${tx_id}-notary-approval.json"

  write_registry_approval_payload "$tx_id" "$registry_payload"
  write_notary_approval_payload "$tx_id" "$notary_payload"

  invoke_registry_approval "$registry_payload"
  invoke_notary_approval "$notary_payload"
  invoke_confirm "$tx_id"
  assert_status "$tx_id" "CONFIRMED"
}

test_confirm_before_external_approvals() {
  local tx_id="${EDGE_TX_PREFIX}-confirm-before-approvals"
  local submit_payload="$TMP_DIR/${tx_id}-submit.json"

  log "Test 1: Confirm before external approvals should fail"
  write_sale_payload "$tx_id" "$submit_payload"
  invoke_submit "$tx_id" "$submit_payload"

  expect_invoke_failure \
    "Confirm before external approvals" \
    "Platform Org" \
    "PlatformMSP" \
    "$PLATFORM_PEER_ENDPOINT" \
    "$PLATFORM_MSP_PATH" \
    "$PLATFORM_TLS_CERT" \
    "$(chaincode_args_json ConfirmContract "$tx_id")"

  complete_successfully "$tx_id"
}

test_registry_approval_by_wrong_msp() {
  local tx_id="${EDGE_TX_PREFIX}-wrong-registry-msp"
  local submit_payload="$TMP_DIR/${tx_id}-submit.json"
  local registry_payload="$TMP_DIR/${tx_id}-registry-approval.json"
  local registry_payload_compact

  log "Test 2: Registry approval by wrong MSP should fail"
  write_sale_payload "$tx_id" "$submit_payload"
  write_registry_approval_payload "$tx_id" "$registry_payload"
  registry_payload_compact="$(compact_json_file "$registry_payload")"

  invoke_submit "$tx_id" "$submit_payload"

  expect_invoke_failure \
    "ApproveByRegistry using PlatformMSP" \
    "Platform Org" \
    "PlatformMSP" \
    "$PLATFORM_PEER_ENDPOINT" \
    "$PLATFORM_MSP_PATH" \
    "$PLATFORM_TLS_CERT" \
    "$(chaincode_args_json ApproveByRegistry "$registry_payload_compact")"

  complete_successfully "$tx_id"
}

test_notary_approval_by_wrong_msp() {
  local tx_id="${EDGE_TX_PREFIX}-wrong-notary-msp"
  local submit_payload="$TMP_DIR/${tx_id}-submit.json"
  local registry_payload="$TMP_DIR/${tx_id}-registry-approval.json"
  local notary_payload="$TMP_DIR/${tx_id}-notary-approval.json"
  local notary_payload_compact

  log "Test 3: Notary approval by wrong MSP should fail"
  write_sale_payload "$tx_id" "$submit_payload"
  write_registry_approval_payload "$tx_id" "$registry_payload"
  write_notary_approval_payload "$tx_id" "$notary_payload"
  notary_payload_compact="$(compact_json_file "$notary_payload")"

  invoke_submit "$tx_id" "$submit_payload"
  invoke_registry_approval "$registry_payload"

  expect_invoke_failure \
    "ApproveByNotary using RegistryMSP" \
    "Registry Org" \
    "RegistryMSP" \
    "$REGISTRY_PEER_ENDPOINT" \
    "$REGISTRY_MSP_PATH" \
    "$REGISTRY_TLS_CERT" \
    "$(chaincode_args_json ApproveByNotary "$notary_payload_compact")"

  invoke_notary_approval "$notary_payload"
  invoke_confirm "$tx_id"
  assert_status "$tx_id" "CONFIRMED"
}

test_submit_idempotency_same_payload() {
  local tx_id="${EDGE_TX_PREFIX}-idempotent-submit"
  local submit_payload="$TMP_DIR/${tx_id}-submit.json"

  log "Test 4: SubmitContract idempotency with same payload"
  write_sale_payload "$tx_id" "$submit_payload"

  invoke_submit "$tx_id" "$submit_payload"
  invoke_submit "$tx_id" "$submit_payload"

  complete_successfully "$tx_id"
}

test_submit_conflict_same_transaction_id() {
  local tx_id="${EDGE_TX_PREFIX}-conflict-submit"
  local submit_payload="$TMP_DIR/${tx_id}-submit.json"
  local conflict_payload="$TMP_DIR/${tx_id}-conflict-submit.json"
  local conflict_payload_compact

  log "Test 5: SubmitContract conflict with same transactionId and different payload"
  write_sale_payload "$tx_id" "$submit_payload"
  write_sale_payload "$tx_id" "$conflict_payload" "100001" "${tx_id}-changed"
  conflict_payload_compact="$(compact_json_file "$conflict_payload")"

  invoke_submit "$tx_id" "$submit_payload"

  expect_invoke_failure \
    "SubmitContract conflict with different payload" \
    "Platform Org" \
    "PlatformMSP" \
    "$PLATFORM_PEER_ENDPOINT" \
    "$PLATFORM_MSP_PATH" \
    "$PLATFORM_TLS_CERT" \
    "$(chaincode_args_json SubmitContract "$conflict_payload_compact")"

  complete_successfully "$tx_id"
}

test_registry_rejection_path() {
  local tx_id="${EDGE_TX_PREFIX}-registry-rejection"
  local submit_payload="$TMP_DIR/${tx_id}-submit.json"
  local rejection_payload="$TMP_DIR/${tx_id}-registry-rejection.json"
  local rejection_payload_compact

  log "Test 6: Registry rejection path"
  write_sale_payload "$tx_id" "$submit_payload"
  write_registry_rejection_payload "$tx_id" "$rejection_payload"
  rejection_payload_compact="$(compact_json_file "$rejection_payload")"

  invoke_submit "$tx_id" "$submit_payload"

  invoke_chaincode \
    "Registry Org" \
    "RegistryMSP" \
    "$REGISTRY_PEER_ENDPOINT" \
    "$REGISTRY_MSP_PATH" \
    "$REGISTRY_TLS_CERT" \
    "$(chaincode_args_json RejectByRegistry "$rejection_payload_compact")"

  assert_status "$tx_id" "REJECTED_BY_REGISTRY"

  expect_invoke_failure \
    "Confirm rejected Registry contract" \
    "Platform Org" \
    "PlatformMSP" \
    "$PLATFORM_PEER_ENDPOINT" \
    "$PLATFORM_MSP_PATH" \
    "$PLATFORM_TLS_CERT" \
    "$(chaincode_args_json ConfirmContract "$tx_id")"
}

test_notary_rejection_path() {
  local tx_id="${EDGE_TX_PREFIX}-notary-rejection"
  local submit_payload="$TMP_DIR/${tx_id}-submit.json"
  local registry_payload="$TMP_DIR/${tx_id}-registry-approval.json"
  local rejection_payload="$TMP_DIR/${tx_id}-notary-rejection.json"
  local rejection_payload_compact

  log "Test 7: Notary rejection path"
  write_sale_payload "$tx_id" "$submit_payload"
  write_registry_approval_payload "$tx_id" "$registry_payload"
  write_notary_rejection_payload "$tx_id" "$rejection_payload"
  rejection_payload_compact="$(compact_json_file "$rejection_payload")"

  invoke_submit "$tx_id" "$submit_payload"
  invoke_registry_approval "$registry_payload"

  invoke_chaincode \
    "Notary Org" \
    "NotaryMSP" \
    "$NOTARY_PEER_ENDPOINT" \
    "$NOTARY_MSP_PATH" \
    "$NOTARY_TLS_CERT" \
    "$(chaincode_args_json RejectByNotary "$rejection_payload_compact")"

  assert_status "$tx_id" "REJECTED_BY_NOTARY"

  expect_invoke_failure \
    "Confirm rejected Notary contract" \
    "Platform Org" \
    "PlatformMSP" \
    "$PLATFORM_PEER_ENDPOINT" \
    "$PLATFORM_MSP_PATH" \
    "$PLATFORM_TLS_CERT" \
    "$(chaincode_args_json ConfirmContract "$tx_id")"
}

log "Validating Fabric edge-case smoke test prerequisites"

echo "EDGE_TX_PREFIX=$EDGE_TX_PREFIX"

command -v peer >/dev/null 2>&1 || fail "peer binary not found in PATH"
command -v python3 >/dev/null 2>&1 || fail "python3 binary not found in PATH"

require_file "$ORDERER_CA"
require_file "$REGISTRY_MSP_PATH/signcerts/cert.pem"
require_file "$REGISTRY_TLS_CERT"
require_file "$NOTARY_MSP_PATH/signcerts/cert.pem"
require_file "$NOTARY_TLS_CERT"
require_file "$PLATFORM_MSP_PATH/signcerts/cert.pem"
require_file "$PLATFORM_TLS_CERT"

test_confirm_before_external_approvals
test_registry_approval_by_wrong_msp
test_notary_approval_by_wrong_msp
test_submit_idempotency_same_payload
test_submit_conflict_same_transaction_id
test_registry_rejection_path
test_notary_rejection_path

log "All Fabric chaincode edge-case smoke tests passed."
