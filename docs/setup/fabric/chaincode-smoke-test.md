# Fabric Chaincode Smoke Test

This smoke test exercises the committed `realestate-contract` chaincode on `realestatechannel`.

The script runs the approved SALE workflow:

```text
SubmitContract -> ApproveByRegistry -> ApproveByNotary -> ConfirmContract
```

It then queries `GetContractByTxId`, verifies the final status is `CONFIRMED`, checks Registry and Notary approvals, verifies the Platform submission MSP, and prints `GetContractHistory`.

## Prerequisites

- Fabric network containers are running.
- `realestatechannel` is joined by RegistryMSP, NotaryMSP, and PlatformMSP peers.
- `realestate-contract` is committed on `realestatechannel`.
- Fabric tools are available through `infrastructure/fabric/scripts/set-fabric-env.sh`.
- `python3` is available in WSL.

## Run

From PowerShell:

```powershell
wsl bash -lc 'export PATH="/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"; cd /mnt/d/PROJECT/decentralized-real-estate-platform && bash infrastructure/fabric/scripts/smoke-test-chaincode.sh'
```

## Expected Result

- Submit, Registry approval, Notary approval, and Confirm all complete.
- The final queried contract status is `CONFIRMED`.
- The script prints the contract history.

To provide a custom transaction id:

```powershell
wsl bash -lc 'export PATH="/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"; cd /mnt/d/PROJECT/decentralized-real-estate-platform && SMOKE_TX_ID=smoke-sale-custom-001 bash infrastructure/fabric/scripts/smoke-test-chaincode.sh'
```
