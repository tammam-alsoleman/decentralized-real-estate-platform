# Fabric Chaincode Deployment

This document describes how to deploy the local `realestate-contract` chaincode to `realestatechannel`.

The deployment script is:

```text
infrastructure/fabric/scripts/deploy-chaincode.sh
```

It packages the Go chaincode from `chaincode/realestate-contract`, installs it on the Registry, Notary, and Platform peers, approves the chaincode definition for each organization, checks commit readiness, commits the definition, and runs `querycommitted`.

## Prerequisites

- Fabric network containers are running.
- `realestatechannel` is created.
- RegistryMSP, NotaryMSP, and PlatformMSP peers have joined `realestatechannel`.
- Fabric tools are installed under `tools/fabric`.
- The chaincode has already been compiled and tested.
- Go is available in the WSL `PATH`; this project was tested with Go 1.21.
- Fabric CLI commands are loaded by sourcing `infrastructure/fabric/scripts/set-fabric-env.sh`.

## Run

From PowerShell:

```powershell
wsl bash -lc "cd /mnt/d/PROJECT/decentralized-real-estate-platform && bash infrastructure/fabric/scripts/deploy-chaincode.sh"
```

## Expected Result

The chaincode definition is committed on `realestatechannel`, and `querycommitted` shows `realestate-contract`.

Generated chaincode packages under `infrastructure/fabric/chaincode-artifacts` are local artifacts and should not be committed.
