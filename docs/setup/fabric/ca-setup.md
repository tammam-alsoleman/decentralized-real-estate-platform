# Fabric CA Setup

This document describes how to run the local Hyperledger Fabric Certificate Authorities for the real estate platform.

## Purpose

The Fabric CA containers issue the local development identities and certificates for the Fabric organizations:

- Registry Org
- Notary Org
- Platform Org
- Orderer Org

These identities are required before starting peers, orderers, channels, or deploying chaincode.

## CA Containers

| Organization | Container | Port |
|---|---|---:|
| Registry | ca.registry.realestate.local | 7054 |
| Notary | ca.notary.realestate.local | 8054 |
| Platform | ca.platform.realestate.local | 9054 |
| Orderer | ca.orderer.realestate.local | 10054 |

## Start CAs

Run from the repository root:

~~~bash
docker compose -p realestate-fabric -f infrastructure/fabric/compose/docker-compose-ca.yaml up -d
~~~

## Check CAs

~~~bash
docker ps --filter network=realestate_fabric --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
~~~

Expected containers:

~~~text
ca.registry.realestate.local
ca.notary.realestate.local
ca.platform.realestate.local
ca.orderer.realestate.local
~~~

## Stop CAs

~~~bash
docker compose -p realestate-fabric -f infrastructure/fabric/compose/docker-compose-ca.yaml down
~~~

## Notes

Always use the Compose project name realestate-fabric with -p realestate-fabric.

This keeps the Fabric containers grouped separately from the main application containers in Docker Desktop.
