# Fabric Chaincode Workflow

## 1. Purpose

`realestate-contract` is the Hyperledger Fabric chaincode responsible for recording legally sensitive real estate contract lifecycle events on the permissioned ledger.

The chaincode is not responsible for storing full PDF files or large document payloads. Full documents are expected to be stored outside Fabric, for example in IPFS or another document storage layer. Fabric stores hashes, CIDs, status transitions, institutional decisions, Fabric transaction identifiers, and audit trail data so that contract lifecycle changes can be verified later.

## 2. Network Participants

The current Fabric network uses three business organizations:

- `PlatformMSP`
- `RegistryMSP`
- `NotaryMSP`

Each organization owns a peer in the Fabric network. These peers participate in endorsement and maintain the ledger for the shared real estate channel.

## 3. Endorsement vs Business Approval

Fabric endorsement and business approval are separate concepts.

Fabric endorsement happens at the peer level. The current endorsement policy is:

```text
AND('RegistryMSP.peer','NotaryMSP.peer','PlatformMSP.peer')
```

This means peers from Registry, Notary, and Platform must endorse transaction execution before the transaction can be committed.

Business approval is represented inside the chaincode state. Registry business approval is written through `ApproveByRegistry`. Notary business approval is written through `ApproveByNotary`. The Platform organization does not have an `ApproveByPlatform` function by design.

## 4. Platform Role

`PlatformMSP` has two business-level responsibilities.

### A. SubmitContract

The platform submits the contract package to Fabric after its internal checks are completed. The submitted record includes:

- `platformReference`
- `platformProofHash`
- `signaturesHash`
- `submittedByMsp = PlatformMSP`
- signed timestamps
- Fabric transaction id

Platform attestation is represented by `SubmitContract`.

### B. ConfirmContract

The platform confirms the contract only after Registry and Notary approvals exist. This moves the contract to `CONFIRMED`.

Platform finalization is represented by `ConfirmContract`. The workflow intentionally does not use `ApproveByPlatform` because Platform is not a legal authority in the same role as Registry or Notary.

## 5. Registry Role

`RegistryMSP` can call `ApproveByRegistry` or `RejectByRegistry`. The chaincode enforces that only `RegistryMSP` can perform these actions.

Registry approval stores:

- `approved = true`
- `approvedByMsp = RegistryMSP`
- registry reference
- evidence hash
- optional evidence CID
- decision notes hash
- Fabric transaction id
- decision payload hash

In the current smoke test, Registry approval is simulated by a script and does not read from `registry_schema`.

Future integration will add a Registry approval client or service. That component will compare the Fabric-submitted contract information with `registry_schema`, then invoke `ApproveByRegistry` or `RejectByRegistry`.

## 6. Notary Role

`NotaryMSP` can call `ApproveByNotary` or `RejectByNotary`. The chaincode enforces that only `NotaryMSP` can perform these actions.

Notary approval stores:

- `approved = true`
- `approvedByMsp = NotaryMSP`
- notary reference
- evidence hash
- optional evidence CID
- decision notes hash
- Fabric transaction id
- decision payload hash

In the current smoke test, Notary approval is simulated by a script and does not read from `notary_schema`.

Future integration will add a Notary approval client or service. That component will compare the Fabric-submitted contract information with `notary_schema`, then invoke `ApproveByNotary` or `RejectByNotary`.

## 7. Why Chaincode Does Not Read PostgreSQL

Chaincode must remain deterministic. All endorsing peers must execute the same transaction proposal and produce the same result.

Reading external PostgreSQL databases directly from chaincode would break determinism and endorsement safety because external database state can differ between organizations or change between endorsement attempts.

For that reason, database verification is done outside chaincode by institutional approval clients. Chaincode records the signed and verifiable result of the institutional decision.

## 8. Supported Contract Types

The model supports two contract types:

- `SALE`
- `RENT`

The successful smoke test currently validates the `SALE` workflow. The chaincode model also supports `RENT`.

Validation prevents cross-type payload pollution:

- `SALE` contracts must not include `RENT`-only fields.
- `RENT` contracts must not include `SALE`-only fields.

## 9. Contract Statuses

The current statuses are:

- `PENDING_EXTERNAL_APPROVALS`
- `REJECTED_BY_REGISTRY`
- `REJECTED_BY_NOTARY`
- `CONFIRMED`

The normal successful path is:

```text
SubmitContract
-> PENDING_EXTERNAL_APPROVALS
-> ApproveByRegistry
-> ApproveByNotary
-> ConfirmContract
-> CONFIRMED
```

Rejection paths:

- Registry rejection moves the contract to `REJECTED_BY_REGISTRY`.
- Notary rejection moves the contract to `REJECTED_BY_NOTARY`.

## 10. What Is Stored on the Ledger

The ledger record stores:

- `transactionId`: application-level transaction identifier.
- `contractType`: `SALE` or `RENT`.
- property information: property id, registry number, type, location, area, and ownership document references.
- `SALE` or `RENT` party information.
- identity hashes for the parties relevant to the contract type.
- `contractHash`: integrity hash for the contract document.
- `contractCid`: external content identifier for the contract document.
- `auditPackageHash`: integrity hash for the audit package.
- `auditPackageCid`: external content identifier for the audit package.
- `signaturesHash`: hash representing finalized signatures.
- `platformSubmission`: Platform attestation data.
- `registryApproval`: Registry decision data when present.
- `notaryApproval`: Notary decision data when present.
- `payloadHash`: deterministic hash of the submitted payload.
- `createdAt`: Fabric transaction timestamp for creation.
- `updatedAt`: Fabric transaction timestamp for the latest state change.
- Fabric transaction ids for submitted and institutional actions.

Full documents are expected to be stored outside Fabric. Fabric stores hashes and CIDs to prove integrity and traceability.

## 11. Chaincode Functions

### SubmitContract

Allowed caller: `PlatformMSP`.

Creates the contract ledger record after platform-side checks are complete. It sets the initial status to `PENDING_EXTERNAL_APPROVALS` and records platform submission evidence.

### ApproveByRegistry

Allowed caller: `RegistryMSP`.

Stores Registry approval data and keeps the contract pending until Notary approval and Platform confirmation are completed.

### RejectByRegistry

Allowed caller: `RegistryMSP`.

Stores Registry rejection data and moves the contract to `REJECTED_BY_REGISTRY`.

### ApproveByNotary

Allowed caller: `NotaryMSP`.

Stores Notary approval data and keeps the contract pending until Platform confirmation is completed.

### RejectByNotary

Allowed caller: `NotaryMSP`.

Stores Notary rejection data and moves the contract to `REJECTED_BY_NOTARY`.

### ConfirmContract

Allowed caller: `PlatformMSP`.

Confirms the contract after both Registry and Notary approvals exist. It moves the contract to `CONFIRMED`.

### GetContractByTxId

Allowed caller: any channel client able to query the chaincode.

Returns the current contract record by `transactionId`.

### GetContractHistory

Allowed caller: any channel client able to query the chaincode.

Returns Fabric history entries for the contract key.

## 12. Idempotency

Re-sending the same `transactionId` with the same payload returns the existing result. Re-sending the same `transactionId` with different payload data is rejected.

Approval and rejection idempotency also prevents duplicate event processing problems. If the same institutional decision is submitted again with the same decision payload hash, the existing record is returned. Conflicting approval or rejection data is rejected.

This is important for future RabbitMQ and Blockchain Service integration, where message retries may occur.

## 13. Events

The chaincode emits status-change events. Current event types include:

- `CONTRACT_SUBMITTED`
- `CONTRACT_APPROVED_BY_REGISTRY`
- `CONTRACT_REJECTED_BY_REGISTRY`
- `CONTRACT_APPROVED_BY_NOTARY`
- `CONTRACT_REJECTED_BY_NOTARY`
- `CONTRACT_CONFIRMED`

These events can later be consumed by Blockchain Service or event workers to update application services and notify contract parties.

## 14. Smoke Test Result

The current smoke test validates the `SALE` workflow end-to-end.

The tested flow is:

- `SubmitContract` by `PlatformMSP`
- `ApproveByRegistry` by `RegistryMSP`
- `ApproveByNotary` by `NotaryMSP`
- `ConfirmContract` by `PlatformMSP`
- `GetContractByTxId`
- `GetContractHistory`

The observed final status was `CONFIRMED`. Registry and Notary approvals were present. Platform submission MSP was `PlatformMSP`. The history query contained the major state transitions for the contract lifecycle.

The smoke test result confirms the happy-path SALE workflow, but it does not yet prove all negative or edge-case behavior.

## 15. Current Limitations and Next Steps

Implemented and tested:

- Fabric network
- three-org endorsement
- chaincode lifecycle
- `SALE` happy-path smoke test
- final `CONFIRMED` state
- history query

Not yet implemented:

- Blockchain Service
- actual Registry approval client reading from `registry_schema`
- actual Notary approval client reading from `notary_schema`
- REST/gRPC APIs around Fabric
- Property Service integration
- event worker integration
- `RENT` smoke test
- negative and edge-case smoke tests

The next step after this document is to add edge-case smoke tests, then implement Blockchain Service.
