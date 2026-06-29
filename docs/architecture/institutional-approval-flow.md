# Institutional Approval Flow

## 1. Purpose

This document clarifies how real institutional verification by Registry and Notary is expected to work around the Fabric chaincode.

The current Fabric implementation already supports the core lifecycle functions:

- `SubmitContract`
- `ApproveByRegistry`
- `RejectByRegistry`
- `ApproveByNotary`
- `RejectByNotary`
- `ConfirmContract`

However, the current smoke tests use synthetic approval payloads. They prove the Fabric workflow and authorization behavior, but they do not yet perform database-based verification against Registry or Notary data.

## 2. Current Implemented State

The implemented Fabric setup currently includes:

- three-organization Fabric network:
  - `PlatformMSP`
  - `RegistryMSP`
  - `NotaryMSP`
- endorsement policy:

```text
AND('RegistryMSP.peer','NotaryMSP.peer','PlatformMSP.peer')
```

- `SALE` happy-path smoke test
- edge-case smoke tests
- MSP authorization enforcement:
  - only `PlatformMSP` can submit and confirm
  - only `RegistryMSP` can approve or reject as Registry
  - only `NotaryMSP` can approve or reject as Notary
- rejection statuses:
  - `REJECTED_BY_REGISTRY`
  - `REJECTED_BY_NOTARY`

The tests prove the Fabric workflow, authorization rules, idempotency, rejection paths, and final confirmation logic. They do not prove real-world institutional database verification yet.

## 3. Why Chaincode Does Not Read Registry or Notary Databases

Hyperledger Fabric chaincode must remain deterministic. All endorsing peers must execute the same chaincode logic and produce the same result.

Directly reading external PostgreSQL databases from chaincode would make execution non-deterministic. External databases may differ between organizations, be unavailable, or change between endorsement attempts.

Therefore, the chaincode records decisions and evidence, but does not perform external database reads.

Database-based verification must happen outside chaincode.

## 4. Target Institutional Verification Architecture

### Property Service

Property Service prepares property and contract data, prepares document metadata, and sends transaction/document metadata to Blockchain Service.

### Blockchain Service

Blockchain Service uses the `PlatformMSP` identity. It submits contract metadata to Fabric using `SubmitContract`, queries contract status/history, and confirms the contract only when both institutional approvals are present.

Blockchain Service must not fake Registry or Notary approvals.

### Registry Approval Client/Service

The Registry approval client/service uses the `RegistryMSP` identity. It reads submitted contract metadata from Fabric or from an application read model and compares it with `registry_schema`.

It verifies property ownership, registry number, property identity, and ownership document metadata. After verification, it invokes `ApproveByRegistry` or `RejectByRegistry`.

### Notary Approval Client/Service

The Notary approval client/service uses the `NotaryMSP` identity. It reads submitted contract metadata from Fabric or from an application read model and compares it with `notary_schema`.

It verifies signed contract metadata, parties, signatures, and notarial requirements. After verification, it invokes `ApproveByNotary` or `RejectByNotary`.

### Platform Finalization

After both Registry and Notary approvals exist, Blockchain Service or another Platform-side workflow invokes `ConfirmContract` using `PlatformMSP`.

## 5. Proposed High-Level Flow

1. Property Service prepares the transaction package.
2. Documents are stored off-chain, for example IPFS.
3. Property Service sends hashes, CIDs, property snapshot, party data, and signature metadata to Blockchain Service.
4. Blockchain Service invokes `SubmitContract` as `PlatformMSP`.
5. The contract state becomes `PENDING_EXTERNAL_APPROVALS`.
6. Registry approval client reads/verifies data against `registry_schema`.
7. Registry client invokes `ApproveByRegistry` or `RejectByRegistry`.
8. Notary approval client reads/verifies data against `notary_schema`.
9. Notary client invokes `ApproveByNotary` or `RejectByNotary`.
10. If both approvals are present, Platform invokes `ConfirmContract`.
11. The contract state becomes `CONFIRMED`.
12. If either institution rejects, the contract remains rejected and cannot be confirmed.

## 6. Registry Verification Scope

The Registry side should later verify:

- `propertyId`
- `registryNumber`
- property type
- location
- area
- ownership document hash
- ownership document CID/reference
- whether the seller/landlord is allowed to transfer or rent the property
- whether the property is locked, disputed, inactive, or already pending another transaction
- consistency between submitted property metadata and `registry_schema`

Registry approval output should include:

- `transactionId`
- `registryReference`
- `evidenceHash`
- optional `evidenceCid`
- `decisionNotesHash`
- `decidedAt`

Registry rejection output should include:

- `transactionId`
- `registryReference`
- `evidenceHash`
- optional `evidenceCid`
- `reasonCode`
- `reasonSummary`
- `decisionNotesHash`
- `decidedAt`

## 7. Notary Verification Scope

The Notary side should later verify:

- `transactionId`
- `contractHash`
- contract CID/reference
- `signaturesHash`
- party identity consistency
- signed timestamps
- legal completeness of the sale or rent contract metadata
- consistency between submitted contract metadata and `notary_schema`
- whether required signatures are present
- whether the notarial record/reference matches the submitted contract

Notary approval output should include:

- `transactionId`
- `notaryReference`
- `evidenceHash`
- optional `evidenceCid`
- `decisionNotesHash`
- `decidedAt`

Notary rejection output should include:

- `transactionId`
- `notaryReference`
- `evidenceHash`
- optional `evidenceCid`
- `reasonCode`
- `reasonSummary`
- `decisionNotesHash`
- `decidedAt`

## 8. Evidence Hashes and CIDs

Registry and Notary should not necessarily put full evidence documents on-chain.

Instead:

- `evidenceHash` proves the integrity of the institutional verification evidence.
- `evidenceCid` or another storage reference points to off-chain evidence.
- `decisionNotesHash` proves the integrity of private notes without exposing them.
- Fabric stores proof and traceability, not large sensitive documents.

## 9. Difference Between Test Approval and Real Approval

### Test Approval

Test approval is generated by shell smoke test scripts. It uses synthetic `evidenceHash` and `evidenceCid` values.

This proves chaincode workflow and MSP enforcement. It does not read `registry_schema` or `notary_schema`.

### Real Approval

Real approval is generated by Registry and Notary approval clients. These clients read institutional database schemas, compare submitted data with institutional records, produce an evidence hash and approval/rejection decision, and invoke Fabric with the correct institutional MSP identity.

## 10. MVP Boundary

### Current Phase

- Fabric network
- chaincode
- happy-path and edge-case smoke tests
- documentation

### Next Phase

- Blockchain Service
- API/DTO contract with Property Service
- Fabric client integration

### Later Phase

- Registry approval client/service
- Notary approval client/service
- actual `registry_schema` and `notary_schema` verification
- event workers and notification updates

It is acceptable for the academic MVP to first implement Blockchain Service and Property Service integration, while documenting Registry/Notary database verification as the next controlled phase, as long as the report clearly states the limitation.

## 11. Security and Trust Notes

- Blockchain Service must not submit Registry or Notary approvals on their behalf.
- Registry approvals must be invoked using `RegistryMSP`.
- Notary approvals must be invoked using `NotaryMSP`.
- Platform can submit and confirm, but cannot replace institutional approval.
- Fabric endorsement is not the same as legal approval.
- Business approval is stored in chaincode state through `ApproveByRegistry` and `ApproveByNotary`.

## 12. Final Summary

The current implementation proves that Fabric can enforce the lifecycle and institutional roles. Real database verification is intentionally placed outside chaincode and will be implemented through Registry and Notary approval clients that read their respective schemas and then submit signed approval or rejection decisions to Fabric.
