# Blockchain Service

Blockchain Service is the planned application boundary around Hyperledger Fabric access for the real estate platform.

The service is responsible for consuming blockchain submission messages from RabbitMQ, validating and mapping them to Fabric chaincode payloads, invoking Platform-side Fabric actions, and publishing result events back to RabbitMQ.

## Integration Model

RabbitMQ is the main integration path. Property Service must not call Fabric directly. It publishes `property.contract.submission.requested`, and Blockchain Service consumes that message.

gRPC is used only for health/readiness in the first MVP. The service does not expose REST endpoints and does not use gRPC for contract submission.

## Current State

This package is an initial NestJS skeleton. Fabric integration is abstracted behind `FabricClientService`, but real Fabric Gateway submit/query logic is not implemented yet.

The service is configured for `PlatformMSP` only. It must not submit Registry or Notary approvals. Registry and Notary approvals are expected to be handled later by separate institutional clients or services using `RegistryMSP` and `NotaryMSP`.

## Database

Blockchain Service does not require a local database in the first MVP. Fabric remains the source of truth for contract lifecycle state. Future persistence may be added for operational concerns such as inbox/outbox, retry tracking, event checkpoints, or read models.

## First Functional Milestone

The first functional milestone is:

1. Consume `property.contract.submission.requested`.
2. Validate and map the payload.
3. Invoke `SubmitContract` on Fabric using `PlatformMSP`.
4. Publish either `blockchain.contract.submitted` or `blockchain.contract.submission.failed`.

## Local Development

Copy `.env.example` to `.env` for local development and adjust values as needed.

```bash
npm install
npm run start:dev
```

The skeleton does not connect to RabbitMQ or Fabric automatically during startup.
