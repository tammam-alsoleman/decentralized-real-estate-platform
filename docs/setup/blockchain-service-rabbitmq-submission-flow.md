# Blockchain Service RabbitMQ Submission Flow

## Purpose

This document explains the RabbitMQ contract submission flow implemented inside
Blockchain Service.

The flow receives contract submission messages from RabbitMQ, validates and maps
them to the Fabric chaincode payload, invokes `SubmitContract` through
`FabricClientService`, and publishes either a success or failure event.

This flow does not connect Property Service yet. Property Service integration is
the producer-side work that will publish the input event later.

## Flow

```text
property.contract.submission.requested
  -> ContractSubmissionConsumer
  -> ContractSubmissionService
  -> ContractPayloadValidator
  -> SubmitContractMapper
  -> FabricClientService.submitContract
  -> blockchain.contract.submitted | blockchain.contract.submission.failed
```

The consumer starts only when:

```text
RABBITMQ_CONSUMER_ENABLED=true
```

The default is `false` so unit tests and the local Fabric smoke script do not
require RabbitMQ.

## Required Environment Variables

```text
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
RABBITMQ_EXCHANGE=realestate.events
RABBITMQ_CONTRACT_SUBMISSION_QUEUE=blockchain.contract-submission
RABBITMQ_CONTRACT_SUBMISSION_ROUTING_KEY=property.contract.submission.requested
RABBITMQ_CONTRACT_SUBMITTED_ROUTING_KEY=blockchain.contract.submitted
RABBITMQ_CONTRACT_SUBMISSION_FAILED_ROUTING_KEY=blockchain.contract.submission.failed
RABBITMQ_CONSUMER_ENABLED=false
```

Set `RABBITMQ_CONSUMER_ENABLED=true` only when RabbitMQ is running and the
Blockchain Service should consume submission messages.

## Input Event

Routing key:

```text
property.contract.submission.requested
```

The message body is JSON and should use the existing
`PropertyContractSubmissionRequestedEvent` envelope:

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

`payload` must match the current `SubmitContractRequest` rules for `SALE` or
`RENT`.

## Success Event

Routing key:

```text
blockchain.contract.submitted
```

Payload shape:

```json
{
  "eventId": "uuid",
  "eventType": "blockchain.contract.submitted",
  "occurredAt": "2026-01-01T00:00:00Z",
  "transactionId": "tx-001",
  "contractType": "SALE",
  "status": "PENDING_EXTERNAL_APPROVALS",
  "fabricTxId": "fabric-tx-id",
  "channelName": "realestatechannel",
  "chaincodeName": "realestate-contract",
  "payloadHash": "optional-payload-hash",
  "correlationId": "uuid"
}
```

The success event does not include full identity data or sensitive PII.

## Failure Event

Routing key:

```text
blockchain.contract.submission.failed
```

Payload shape:

```json
{
  "eventId": "uuid",
  "eventType": "blockchain.contract.submission.failed",
  "occurredAt": "2026-01-01T00:00:00Z",
  "transactionId": "tx-001",
  "contractType": "SALE",
  "errorCode": "VALIDATION_ERROR",
  "errorMessage": "Sanitized error message",
  "retryable": false,
  "correlationId": "uuid"
}
```

Failure events do not expose stack traces or raw Fabric internal errors.

Invalid JSON messages are acknowledged after a failure event is published. This
avoids infinite requeue loops for malformed messages.

## Not Covered

This flow does not cover:

- Property Service integration yet.
- Registry or Notary approvals.
- `ApproveByRegistry`, `RejectByRegistry`, `ApproveByNotary`, or
  `RejectByNotary`.
- `ConfirmContract`.
- A Blockchain Service database.

Fabric remains the source of truth for contract lifecycle state in the first
MVP.
