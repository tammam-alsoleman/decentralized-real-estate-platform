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

copy_msp_tls_ca_root_cert() {
  local ca_tls_cert="$1"
  local msp_dir="$2"
  local ca_root_cert
  ca_root_cert="$(dirname "$ca_tls_cert")/ca-cert.pem"

  if [ ! -f "$ca_root_cert" ]; then
    echo "Fabric CA root certificate not found: $ca_root_cert"
    exit 1
  fi

  mkdir -p "$msp_dir/tlscacerts"
  cp "$ca_root_cert" "$msp_dir/tlscacerts/ca.crt"
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

  copy_msp_tls_ca_root_cert "$ca_tls_cert" "$msp_dir"

  echo "$org_label CA admin enrolled."
}

register_identity() {
  local org_label="$1"
  local ca_admin_msp="$2"
  local ca_name="$3"
  local ca_url="$4"
  local ca_tls_cert="$5"
  local identity_name="$6"
  local identity_secret="$7"
  local identity_type="$8"
  local ca_admin_home
  ca_admin_home="$(dirname "$ca_admin_msp")"

  echo "Registering $identity_name for $org_label ..."

  local output
  if output=$(FABRIC_CA_CLIENT_HOME="$ca_admin_home" fabric-ca-client register \
      -u "$ca_url" \
      --caname "$ca_name" \
      --id.name "$identity_name" \
      --id.secret "$identity_secret" \
      --id.type "$identity_type" \
      --tls.certfiles "$ca_tls_cert" 2>&1); then
    echo "$identity_name registered for $org_label."
    return
  fi

  if [[ "$output" == *"already registered"* ]]; then
    echo "$identity_name is already registered for $org_label; continuing."
    return
  fi

  echo "$output"
  exit 1
}

write_node_ou_config() {
  local msp_dir="$1"
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
}

copy_single_file() {
  local source_dir="$1"
  local target_file="$2"
  local label="$3"
  local files=("$source_dir/"*)

  if [ ! -e "${files[0]}" ]; then
    echo "No $label file found under $source_dir."
    exit 1
  fi

  if [ "${#files[@]}" -ne 1 ]; then
    echo "Expected exactly one $label file under $source_dir."
    exit 1
  fi

  cp "${files[0]}" "$target_file"
}

normalize_tls_material() {
  local tls_dir="$1"

  copy_single_file "$tls_dir/tlscacerts" "$tls_dir/ca.crt" "TLS CA certificate"
  copy_single_file "$tls_dir/signcerts" "$tls_dir/server.crt" "TLS server certificate"
  copy_single_file "$tls_dir/keystore" "$tls_dir/server.key" "TLS server key"
}

enroll_peer_node() {
  local org_label="$1"
  local ca_name="$2"
  local ca_url="$3"
  local ca_tls_cert="$4"
  local peer_name="$5"
  local peer_secret="$6"
  local peer_host="$7"
  local peer_msp_dir="$8"
  local peer_tls_dir="$9"

  echo "Enrolling MSP for $peer_host ..."
  fabric-ca-client enroll \
    -u "https://$peer_name:$peer_secret@$ca_url" \
    --caname "$ca_name" \
    -M "$peer_msp_dir" \
    --csr.hosts "$peer_host" \
    --tls.certfiles "$ca_tls_cert"

  write_node_ou_config "$peer_msp_dir"

  echo "Enrolling TLS for $peer_host ..."
  fabric-ca-client enroll \
    -u "https://$peer_name:$peer_secret@$ca_url" \
    --caname "$ca_name" \
    -M "$peer_tls_dir" \
    --enrollment.profile tls \
    --csr.hosts "$peer_host" \
    --csr.hosts localhost \
    --tls.certfiles "$ca_tls_cert"

  normalize_tls_material "$peer_tls_dir"

  echo "$peer_host enrolled for $org_label."
}

enroll_orderer_node() {
  local org_label="$1"
  local ca_name="$2"
  local ca_url="$3"
  local ca_tls_cert="$4"
  local orderer_name="$5"
  local orderer_secret="$6"
  local orderer_host="$7"
  local orderer_msp_dir="$8"
  local orderer_tls_dir="$9"

  echo "Enrolling MSP for $orderer_host ..."
  fabric-ca-client enroll \
    -u "https://$orderer_name:$orderer_secret@$ca_url" \
    --caname "$ca_name" \
    -M "$orderer_msp_dir" \
    --csr.hosts "$orderer_host" \
    --tls.certfiles "$ca_tls_cert"

  write_node_ou_config "$orderer_msp_dir"

  echo "Enrolling TLS for $orderer_host ..."
  fabric-ca-client enroll \
    -u "https://$orderer_name:$orderer_secret@$ca_url" \
    --caname "$ca_name" \
    -M "$orderer_tls_dir" \
    --enrollment.profile tls \
    --csr.hosts "$orderer_host" \
    --csr.hosts localhost \
    --tls.certfiles "$ca_tls_cert"

  normalize_tls_material "$orderer_tls_dir"

  echo "$orderer_host enrolled for $org_label."
}

enroll_admin_identity() {
  local org_label="$1"
  local ca_name="$2"
  local ca_url="$3"
  local ca_tls_cert="$4"
  local admin_name="$5"
  local admin_secret="$6"
  local admin_msp_dir="$7"

  echo "Enrolling admin identity $admin_name for $org_label ..."
  fabric-ca-client enroll \
    -u "https://$admin_name:$admin_secret@$ca_url" \
    --caname "$ca_name" \
    -M "$admin_msp_dir" \
    --tls.certfiles "$ca_tls_cert"

  write_node_ou_config "$admin_msp_dir"

  echo "$admin_name enrolled for $org_label."
}

ensure_clean_crypto_dirs

enroll_ca_admin \
  "Registry Org" \
  "ca-registry" \
  "https://admin:adminpw@localhost:7054" \
  "$ORG_ROOT/fabric-ca/registry/tls-cert.pem" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/msp"

enroll_ca_admin \
  "Notary Org" \
  "ca-notary" \
  "https://admin:adminpw@localhost:8054" \
  "$ORG_ROOT/fabric-ca/notary/tls-cert.pem" \
  "$ORG_ROOT/peerOrganizations/notary.realestate.local/msp"

enroll_ca_admin \
  "Platform Org" \
  "ca-platform" \
  "https://admin:adminpw@localhost:9054" \
  "$ORG_ROOT/fabric-ca/platform/tls-cert.pem" \
  "$ORG_ROOT/peerOrganizations/platform.realestate.local/msp"

enroll_ca_admin \
  "Orderer Org" \
  "ca-orderer" \
  "https://admin:adminpw@localhost:10054" \
  "$ORG_ROOT/fabric-ca/orderer/tls-cert.pem" \
  "$ORG_ROOT/ordererOrganizations/realestate.local/msp"

echo "All CA admins enrolled."

register_identity \
  "Registry Org" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/msp" \
  "ca-registry" \
  "https://localhost:7054" \
  "$ORG_ROOT/fabric-ca/registry/tls-cert.pem" \
  "peer0" \
  "peer0pw" \
  "peer"

register_identity \
  "Notary Org" \
  "$ORG_ROOT/peerOrganizations/notary.realestate.local/msp" \
  "ca-notary" \
  "https://localhost:8054" \
  "$ORG_ROOT/fabric-ca/notary/tls-cert.pem" \
  "peer0" \
  "peer0pw" \
  "peer"

register_identity \
  "Platform Org" \
  "$ORG_ROOT/peerOrganizations/platform.realestate.local/msp" \
  "ca-platform" \
  "https://localhost:9054" \
  "$ORG_ROOT/fabric-ca/platform/tls-cert.pem" \
  "peer0" \
  "peer0pw" \
  "peer"

register_identity \
  "Orderer Org" \
  "$ORG_ROOT/ordererOrganizations/realestate.local/msp" \
  "ca-orderer" \
  "https://localhost:10054" \
  "$ORG_ROOT/fabric-ca/orderer/tls-cert.pem" \
  "orderer" \
  "ordererpw" \
  "orderer"

echo "All node identities registered."

register_identity \
  "Registry Org" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/msp" \
  "ca-registry" \
  "https://localhost:7054" \
  "$ORG_ROOT/fabric-ca/registry/tls-cert.pem" \
  "registryadmin" \
  "registryadminpw" \
  "admin"

register_identity \
  "Notary Org" \
  "$ORG_ROOT/peerOrganizations/notary.realestate.local/msp" \
  "ca-notary" \
  "https://localhost:8054" \
  "$ORG_ROOT/fabric-ca/notary/tls-cert.pem" \
  "notaryadmin" \
  "notaryadminpw" \
  "admin"

register_identity \
  "Platform Org" \
  "$ORG_ROOT/peerOrganizations/platform.realestate.local/msp" \
  "ca-platform" \
  "https://localhost:9054" \
  "$ORG_ROOT/fabric-ca/platform/tls-cert.pem" \
  "platformadmin" \
  "platformadminpw" \
  "admin"

register_identity \
  "Orderer Org" \
  "$ORG_ROOT/ordererOrganizations/realestate.local/msp" \
  "ca-orderer" \
  "https://localhost:10054" \
  "$ORG_ROOT/fabric-ca/orderer/tls-cert.pem" \
  "ordereradmin" \
  "ordereradminpw" \
  "admin"

echo "All organization admin identities registered."

enroll_admin_identity \
  "Registry Org" \
  "ca-registry" \
  "localhost:7054" \
  "$ORG_ROOT/fabric-ca/registry/tls-cert.pem" \
  "registryadmin" \
  "registryadminpw" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/users/Admin@registry.realestate.local/msp"

enroll_admin_identity \
  "Notary Org" \
  "ca-notary" \
  "localhost:8054" \
  "$ORG_ROOT/fabric-ca/notary/tls-cert.pem" \
  "notaryadmin" \
  "notaryadminpw" \
  "$ORG_ROOT/peerOrganizations/notary.realestate.local/users/Admin@notary.realestate.local/msp"

enroll_admin_identity \
  "Platform Org" \
  "ca-platform" \
  "localhost:9054" \
  "$ORG_ROOT/fabric-ca/platform/tls-cert.pem" \
  "platformadmin" \
  "platformadminpw" \
  "$ORG_ROOT/peerOrganizations/platform.realestate.local/users/Admin@platform.realestate.local/msp"

enroll_admin_identity \
  "Orderer Org" \
  "ca-orderer" \
  "localhost:10054" \
  "$ORG_ROOT/fabric-ca/orderer/tls-cert.pem" \
  "ordereradmin" \
  "ordereradminpw" \
  "$ORG_ROOT/ordererOrganizations/realestate.local/users/Admin@realestate.local/msp"

echo "All Fabric organization admin identities enrolled."

enroll_peer_node \
  "Registry Org" \
  "ca-registry" \
  "localhost:7054" \
  "$ORG_ROOT/fabric-ca/registry/tls-cert.pem" \
  "peer0" \
  "peer0pw" \
  "peer0.registry.realestate.local" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/peers/peer0.registry.realestate.local/msp" \
  "$ORG_ROOT/peerOrganizations/registry.realestate.local/peers/peer0.registry.realestate.local/tls"

enroll_peer_node \
  "Notary Org" \
  "ca-notary" \
  "localhost:8054" \
  "$ORG_ROOT/fabric-ca/notary/tls-cert.pem" \
  "peer0" \
  "peer0pw" \
  "peer0.notary.realestate.local" \
  "$ORG_ROOT/peerOrganizations/notary.realestate.local/peers/peer0.notary.realestate.local/msp" \
  "$ORG_ROOT/peerOrganizations/notary.realestate.local/peers/peer0.notary.realestate.local/tls"

enroll_peer_node \
  "Platform Org" \
  "ca-platform" \
  "localhost:9054" \
  "$ORG_ROOT/fabric-ca/platform/tls-cert.pem" \
  "peer0" \
  "peer0pw" \
  "peer0.platform.realestate.local" \
  "$ORG_ROOT/peerOrganizations/platform.realestate.local/peers/peer0.platform.realestate.local/msp" \
  "$ORG_ROOT/peerOrganizations/platform.realestate.local/peers/peer0.platform.realestate.local/tls"

enroll_orderer_node \
  "Orderer Org" \
  "ca-orderer" \
  "localhost:10054" \
  "$ORG_ROOT/fabric-ca/orderer/tls-cert.pem" \
  "orderer" \
  "ordererpw" \
  "orderer.realestate.local" \
  "$ORG_ROOT/ordererOrganizations/realestate.local/orderers/orderer.realestate.local/msp" \
  "$ORG_ROOT/ordererOrganizations/realestate.local/orderers/orderer.realestate.local/tls"

echo "All Fabric node MSP and TLS material enrolled."
