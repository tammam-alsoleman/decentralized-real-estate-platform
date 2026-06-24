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

ensure_clean_crypto_dirs() {
  if [ -d "$ORG_ROOT/peerOrganizations" ] || [ -d "$ORG_ROOT/ordererOrganizations" ]; then
    echo "Generated Fabric organization crypto already exists. Remove it manually before regenerating."
    exit 1
  fi
}

enroll_ca_admin() {
  local org_label="$1"
  local ca_name="$2"
  local ca_url="$3"
  local ca_tls_cert="$4"
  local msp_dir="$5"

  echo "Enrolling $org_label CA admin ..."
  mkdir -p "$(dirname "$msp_dir")"

  fabric-ca-client enroll \
    -u "$ca_url" \
    --caname "$ca_name" \
    -M "$msp_dir" \
    --tls.certfiles "$ca_tls_cert"

  local ca_certs=("$msp_dir/cacerts/"*)

  if [ ! -e "${ca_certs[0]}" ]; then
    echo "No CA certificate found under $msp_dir/cacerts."
    exit 1
  fi

  if [ "${#ca_certs[@]}" -ne 1 ]; then
    echo "Expected exactly one CA certificate under $msp_dir/cacerts."
    exit 1
  fi

  local ca_cert_filename
  ca_cert_filename="$(basename "${ca_certs[0]}")"

  cat >"$msp_dir/config.yaml" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/$ca_cert_filename
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/$ca_cert_filename
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/$ca_cert_filename
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/$ca_cert_filename
    OrganizationalUnitIdentifier: orderer
EOF

  echo "$org_label CA admin enrolled."
}

ensure_clean_crypto_dirs

enroll_ca_admin \
  "Registry Org" \
  "ca-registry" \
  "https://admin:adminpw@localhost:7054" \
  "$ORG_ROOT/fabric-ca/registry/tls-cert.pem" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/users/Admin@registry.realestate.local/msp"

enroll_ca_admin \
  "Notary Org" \
  "ca-notary" \
  "https://admin:adminpw@localhost:8054" \
  "$ORG_ROOT/fabric-ca/notary/tls-cert.pem" \
  "$ORG_ROOT/peerOrganizations/notary.realestate.local/users/Admin@notary.realestate.local/msp"

enroll_ca_admin \
  "Platform Org" \
  "ca-platform" \
  "https://admin:adminpw@localhost:9054" \
  "$ORG_ROOT/fabric-ca/platform/tls-cert.pem" \
  "$ORG_ROOT/peerOrganizations/platform.realestate.local/users/Admin@platform.realestate.local/msp"

enroll_ca_admin \
  "Orderer Org" \
  "ca-orderer" \
  "https://admin:adminpw@localhost:10054" \
  "$ORG_ROOT/fabric-ca/orderer/tls-cert.pem" \
  "$ORG_ROOT/ordererOrganizations/realestate.local/users/Admin@realestate.local/msp"

echo "All CA admins enrolled."
