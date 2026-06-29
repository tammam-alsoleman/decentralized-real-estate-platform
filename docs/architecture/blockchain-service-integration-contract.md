# Blockchain Service Integration Contract

## 1. Purpose

This document defines the integration boundary between:

- Property Service
- Blockchain Service
- RabbitMQ
- gRPC health/readiness
- Hyperledger Fabric chaincode

Property Service prepares transaction and document metadata. RabbitMQ is the main asynchronous communication mechanism between Property Service and Blockchain Service. Blockchain Service wraps Fabric access and invokes `realestate-contract` chaincode functions. Fabric stores hashes, CIDs, lifecycle status, institutional decisions, and audit trail.

Full documents are not stored on-chain. They are stored or referenced off-chain, for example through IPFS or another document storage system.

## 2. Service Responsibilities

### Property Service

Property Service:

- owns property lifecycle and transaction preparation
- validates property-side business rules
- ensures legal identity and transaction requirements are complete
- prepares property snapshot
- prepares sale/rent parties data
- prepares document metadata
- uploads or references off-chain documents, such as IPFS documents
- publishes blockchain-ready contract submission messages to RabbitMQ
- consumes Blockchain Service result events
- does not talk directly to Fabric

### Blockchain Service

Blockchain Service:

- consumes blockchain submission messages from RabbitMQ
- validates message shape and required fields
- maps RabbitMQ message contracts to Fabric chaincode payloads
- uses `PlatformMSP` identity to invoke `SubmitContract`
- queries Fabric contract status/history when needed
- invokes `ConfirmContract` only after Registry and Notary approvals exist
- publishes success/failure/result events back to RabbitMQ
- exposes gRPC health/readiness checks
- handles Fabric errors and idempotency
- does not approve as Registry or Notary
- does not require a local database in the first MVP

### RabbitMQ

RabbitMQ carries asynchronous commands/events between Property Service and Blockchain Service. It allows retry and decoupling, and improves responsiveness because Property Service does not block while Fabric processing is running.

RabbitMQ should support dead-letter queue and retry handling later.

### gRPC

gRPC is used only for internal health/readiness checks in the first MVP. It is not used as the main contract submission path.

### Fabric Chaincode

Fabric chaincode:

- enforces MSP authorization
- records contract lifecycle state
- records platform submission
- records Registry/Notary approval or rejection decisions
- emits lifecycle events
- stores hashes and CIDs, not full documents

## 3. High-Level Asynchronous Integration Flow

1. Property Service validates property-side business rules.
2. Property Service ensures legal identity and transaction requirements are complete.
3. Property Service stores or references documents off-chain.
4. Property Service computes or receives hashes and CIDs.
5. Property Service publishes `property.contract.submission.requested` to RabbitMQ.
6. Blockchain Service consumes the message.
7. Blockchain Service validates and maps the message to Fabric `SubmitContract` payload.
8. Blockchain Service invokes `SubmitContract` using `PlatformMSP`.
9. Fabric state becomes `PENDING_EXTERNAL_APPROVALS`.
10. Blockchain Service publishes `blockchain.contract.submitted` if successful.
11. If submission fails, Blockchain Service publishes `blockchain.contract.submission.failed`.
12. Registry/Notary approval clients later approve or reject using their own MSPs.
13. Blockchain Service or a Platform workflow confirms only after both approvals exist.
14. Fabric state becomes `CONFIRMED`, or rejected if an institution rejects.

## 4. SubmitContract Message Contract

The primary input message consumed by Blockchain Service is:

```text
property.contract.submission.requested
```

The message payload is equivalent to a `SubmitContractRequest`.

### Recommended Message Envelope

```json
{
  "messageId": "uuid",
  "correlationId": "uuid",
  "causationId": "uuid",
  "eventType": "property.contract.submission.requested",
  "schemaVersion": "1.0",
  "occurredAt": "2026-01-01T00:00:00Z",
  "producer": "property-service",
  "payload": {}
}
```

Envelope fields:

- `messageId`: messaging-level idempotency and tracing key.
- `correlationId`: groups related messages across services.
- `causationId`: identifies the message or command that caused this event.
- `eventType`: message type.
- `schemaVersion`: message schema version.
- `occurredAt`: message creation timestamp.
- `producer`: service that published the message.
- `payload`: contract submission payload.

`transactionId` is the Fabric-level idempotency key. `messageId` is the messaging-level idempotency key.

### Common Payload Fields

Required common fields:

- `transactionId`: stable application transaction id used as the Fabric contract key.
- `contractType`: `SALE` or `RENT`.
- `propertyId`: Property Service property identifier.
- `registryNumber`: official registry number.
- `propertyType`: property category/type.
- `location`: property location snapshot.
- `area`: property area snapshot.
- `ownershipDocumentHash`: integrity hash of ownership document evidence.
- `ownershipDocumentCid`: off-chain ownership document reference.
- `contractHash`: integrity hash of the contract document.
- `contractCid`: off-chain contract document reference.
- `auditPackageHash`: integrity hash of the full audit package.
- `auditPackageCid`: off-chain audit package reference.
- `signaturesHash`: hash representing finalized signature metadata.
- `platformReference`: Platform-side reference for the submitted package.
- `platformProofHash`: proof hash for Platform checks.
- `occurredAt`: business occurrence timestamp from the application workflow.

## 5. SALE-Specific Fields

For `contractType = SALE`, these fields are required:

- `sellerUserId`
- `sellerFullName`
- `sellerNationalId`
- `buyerUserId`
- `buyerFullName`
- `buyerNationalId`
- `sellerSignedAt`
- `buyerSignedAt`
- `price`
- `currency`

SALE payloads must not include RENT-only fields. Current chaincode computes identity hashes from submitted party identity fields. A later privacy enhancement may replace raw identity values with precomputed identity hashes.

## 6. RENT-Specific Fields

For `contractType = RENT`, these fields are required:

- `landlordUserId`
- `landlordFullName`
- `landlordNationalId`
- `tenantUserId`
- `tenantFullName`
- `tenantNationalId`
- `landlordSignedAt`
- `tenantSignedAt`
- `rentStartDate`
- `rentEndDate`
- `rentAmount`
- `currency`

RENT payloads must not include SALE-only fields. RENT is supported by the model but has not yet been covered by the current smoke tests.

## 7. Document Metadata Contract

Property Service sends document metadata, not the documents themselves.

Metadata categories:

### Ownership Document

- `ownershipDocumentHash`
- `ownershipDocumentCid`

### Contract Document

- `contractHash`
- `contractCid`

### Audit Package

- `auditPackageHash`
- `auditPackageCid`

### Signatures

- `signaturesHash`
- signed-at timestamps

### Platform Proof

- `platformReference`
- `platformProofHash`

Hashes prove integrity. CIDs/references locate off-chain documents. Fabric stores verifiable references and lifecycle evidence.

## 8. RabbitMQ Message Contracts

### Input Message

`property.contract.submission.requested`

- producer: Property Service
- consumer: Blockchain Service
- purpose: request Fabric `SubmitContract`

### Output Messages

`blockchain.contract.submitted`

- emitted after successful `SubmitContract`
- should include `transactionId`, `fabricTxId`, `status`, `payloadHash` if available, `occurredAt`, and `correlationId`

`blockchain.contract.submission.failed`

- emitted when `SubmitContract` fails
- should include `transactionId`, `errorCode`, `errorMessage`, `retryable`, `occurredAt`, and `correlationId`

### Future Output Messages

`blockchain.contract.confirmed`

- emitted after `ConfirmContract` succeeds

`blockchain.contract.rejected`

- emitted when Fabric state indicates `REJECTED_BY_REGISTRY` or `REJECTED_BY_NOTARY`

RabbitMQ should use durable queues and persistent messages. Manual acknowledgements should be used. Transient failures may be retried. Permanent failures should be published as failure events and/or routed to a dead-letter queue depending on the failure type.

## 9. gRPC Health and Readiness

The first MVP exposes gRPC health/readiness only.

Proposed proto file:

```text
proto/blockchain/v1/blockchain_health.proto
```

Proposed service:

```text
BlockchainHealthService
```

Methods:

- `CheckLiveness`
- `CheckReadiness`

`CheckLiveness` verifies that the service process is alive.

`CheckReadiness` verifies that the service is ready to process messages, including RabbitMQ connection, required Fabric configuration, and certificate/key file availability.

gRPC is not the main contract submission mechanism. Contract submission is asynchronous through RabbitMQ.

## 10. No Local Database in First MVP

Blockchain Service does not require a local database in the first MVP.

Reasons:

- The service consumes RabbitMQ messages.
- It invokes Fabric.
- It publishes result events.
- Fabric is the source of truth for contract lifecycle state.
- Idempotency is handled using `transactionId` and Fabric chaincode idempotency.
- Property Service must also handle duplicate result events idempotently.

Optional future persistence:

- inbox/outbox pattern
- retry tracking
- event checkpoints
- observability
- last error tracking
- local read model

Future persistence, if added, is operational persistence, not the legal source of truth.

## 11. Idempotency Rules

Property Service must send a stable `transactionId`. Blockchain Service should treat `transactionId` as the Fabric idempotency key. RabbitMQ `messageId` is used for message-level tracing/idempotency.

If `SubmitContract` is retried with the same `transactionId` and same payload, Fabric should return the existing record. If `SubmitContract` is retried with the same `transactionId` but different payload, Fabric rejects it.

Blockchain Service should publish a conflict failure event. This protects RabbitMQ retries and temporary processing failures.

## 12. Error Handling Mapping

Expected error categories:

- `VALIDATION_ERROR`: missing or invalid DTO/message fields.
- `FABRIC_AUTHORIZATION_ERROR`: MSP not allowed for chaincode action.
- `FABRIC_CONFLICT_ERROR`: same `transactionId` with different payload.
- `FABRIC_NOT_FOUND`: contract not found.
- `FABRIC_TRANSIENT_ERROR`: temporary peer/orderer/network issue.
- `FABRIC_REJECTED_STATE_ERROR`: cannot confirm rejected contract.
- `FABRIC_PRECONDITION_ERROR`: cannot confirm before required approvals.
- `CONTRACT_SUBMISSION_REJECTED`: `SubmitContract` was not accepted.
- `CONTRACT_CONFIRMATION_REJECTED`: `ConfirmContract` was not accepted.
- `CONTRACT_ALREADY_REJECTED`: operation failed because the contract is already rejected.
- `CONTRACT_APPROVALS_MISSING`: confirmation attempted before approvals exist.
- `UNKNOWN_ERROR`

Blockchain Service should publish stable application-level error events to RabbitMQ instead of exposing raw Fabric errors directly.

## 13. Security and Trust Boundaries

- Blockchain Service uses `PlatformMSP` for platform actions only.
- It must not use `PlatformMSP` to simulate Registry or Notary approval.
- `RegistryMSP` and `NotaryMSP` are separate institutional identities.
- Full documents should not be sent to Fabric.
- Sensitive data exposure must be minimized.
- Future privacy improvement: send identity hashes instead of raw identity fields if the chaincode is updated.
- Fabric endorsement is not the same as legal approval.
- Business approval is stored in chaincode state through `ApproveByRegistry` and `ApproveByNotary`.

## 14. Event Integration

The chaincode emits lifecycle events such as:

- `CONTRACT_SUBMITTED`
- `CONTRACT_APPROVED_BY_REGISTRY`
- `CONTRACT_REJECTED_BY_REGISTRY`
- `CONTRACT_APPROVED_BY_NOTARY`
- `CONTRACT_REJECTED_BY_NOTARY`
- `CONTRACT_CONFIRMED`

A future Blockchain Service event worker can:

- listen to Fabric events
- update a local read model if introduced
- notify Property Service or Notification Service through RabbitMQ
- handle event replay or checkpointing

This event worker is future work and is not required for the first Blockchain Service skeleton.

## 15. Final Service Folder Structure

The intended folder structure is:

```text
services/blockchain-service/
|-- proto/
|   `-- blockchain/
|       `-- v1/
|           `-- blockchain_health.proto
|
|-- src/
|   |-- main.ts
|   |-- app.module.ts
|
|   |-- config/
|   |   |-- configuration.ts
|   |   `-- env.validation.ts
|
|   |-- grpc/
|   |   |-- grpc.module.ts
|   |   |-- health.grpc.controller.ts
|   |   `-- readiness.service.ts
|
|   |-- messaging/
|   |   |-- messaging.module.ts
|   |   |-- rabbitmq.service.ts
|   |   |-- consumers/
|   |   |   `-- contract-submission.consumer.ts
|   |   |-- publishers/
|   |   |   `-- blockchain-events.publisher.ts
|   |   `-- contracts/
|   |       |-- property-contract-submission-requested.event.ts
|   |       |-- blockchain-contract-submitted.event.ts
|   |       |-- blockchain-contract-submission-failed.event.ts
|   |       |-- blockchain-contract-confirmed.event.ts
|   |       `-- blockchain-contract-rejected.event.ts
|
|   |-- fabric/
|   |   |-- fabric.module.ts
|   |   |-- fabric-client.service.ts
|   |   |-- fabric-gateway.factory.ts
|   |   |-- fabric-identity.service.ts
|   |   `-- fabric.types.ts
|
|   |-- contracts/
|   |   |-- contracts.module.ts
|   |   |-- contract-submission.service.ts
|   |   |-- mappers/
|   |   |   `-- submit-contract.mapper.ts
|   |   |-- dto/
|   |   |   |-- submit-contract-request.dto.ts
|   |   |   |-- sale-contract.dto.ts
|   |   |   `-- rent-contract.dto.ts
|   |   |-- validators/
|   |   |   `-- contract-payload.validator.ts
|   |   `-- types/
|   |       |-- contract-status.type.ts
|   |       `-- contract-type.type.ts
|
|   |-- errors/
|   |   |-- error-codes.ts
|   |   |-- fabric-error.mapper.ts
|   |   `-- service-error.ts
|
|   `-- common/
|       |-- logger/
|       |   `-- logger.service.ts
|       `-- utils/
|           `-- hash.util.ts
|
|-- test/
|-- Dockerfile
|-- package.json
|-- tsconfig.json
|-- tsconfig.build.json
|-- nest-cli.json
|-- .env.example
`-- README.md
```

## 16. Current Implementation Status

Implemented:

- Fabric network
- three-org endorsement
- `realestate-contract` chaincode
- `SALE` happy-path smoke test
- edge-case smoke test
- Fabric chaincode workflow documentation
- institutional approval flow documentation

Not yet implemented:

- Blockchain Service code
- Property Service integration
- RabbitMQ message handlers
- Fabric SDK integration inside Blockchain Service
- gRPC health/readiness
- event listener
- Registry/Notary database-backed approval clients
- RENT smoke test

## 17. Next Implementation Step

The next implementation step is to create the Blockchain Service skeleton with:

- NestJS application bootstrap
- gRPC health/readiness
- RabbitMQ module
- message contracts
- DTOs and validators
- Fabric client abstraction
- error mapping
- Docker-ready configuration

The first functional milestone should be:

Blockchain Service consumes `property.contract.submission.requested`, validates/maps the payload, invokes `SubmitContract` on Fabric using `PlatformMSP`, and publishes either `blockchain.contract.submitted` or `blockchain.contract.submission.failed`.
