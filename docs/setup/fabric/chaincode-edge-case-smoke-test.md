# Fabric Chaincode Edge-Case Smoke Test

This smoke test validates negative and recovery behavior for the committed `realestate-contract` chaincode on `realestatechannel`.

It covers these SALE-only edge cases:

- confirming before Registry and Notary approvals fails
- Registry approval using the wrong MSP fails
- Notary approval using the wrong MSP fails
- submitting the same payload with the same `transactionId` is idempotent
- submitting a different payload with the same `transactionId` fails
- Registry rejection moves the contract to `REJECTED_BY_REGISTRY`
- Notary rejection moves the contract to `REJECTED_BY_NOTARY`

The script then completes recoverable flows correctly and asserts final statuses.

## Prerequisites

- Fabric network containers are running.
- `realestatechannel` is joined by all peers.
- `realestate-contract` is committed.
- Chaincode v1.2 / sequence 3 or later is expected.
- Fabric tools are available through `infrastructure/fabric/scripts/set-fabric-env.sh`.
- `python3` is available in WSL.

## Run

From PowerShell:

```powershell
wsl /usr/bin/bash --noprofile --norc -c 'export PATH="/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/Docker/host/bin"; cd /mnt/d/PROJECT/decentralized-real-estate-platform && /usr/bin/bash infrastructure/fabric/scripts/smoke-test-chaincode-edge-cases.sh'
```

## Expected Result

- all expected failures fail correctly
- all recovery and confirmation flows complete correctly
- rejection paths end in the expected rejected statuses
- the script prints a final success message

The script writes test transactions to the ledger. It generates unique transaction IDs by default using `EDGE_TX_PREFIX`.

To provide a custom prefix:

```powershell
wsl /usr/bin/bash --noprofile --norc -c 'export PATH="/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/Docker/host/bin"; cd /mnt/d/PROJECT/decentralized-real-estate-platform && EDGE_TX_PREFIX=edge-sale-custom-001 /usr/bin/bash infrastructure/fabric/scripts/smoke-test-chaincode-edge-cases.sh'
```
