# Blockchain Service RabbitMQ Submission Runtime Smoke Test

## Purpose

This manual smoke test validates the complete Blockchain Service RabbitMQ
submission flow with real RabbitMQ and real Fabric, without Property Service.

It publishes a `property.contract.submission.requested` message, lets the
Blockchain Service consumer process it, waits for a matching result event, and
verifies the submitted contract reaches `PENDING_EXTERNAL_APPROVALS`.

## Prerequisites

- RabbitMQ is running and reachable through `RABBITMQ_URL`.
- Fabric network is running.
- `realestate-contract` chaincode is deployed on `realestatechannel`.
- `services/blockchain-service/.env` is configured.
- PlatformMSP certificate, private key, and peer TLS paths are configured in
  the `FABRIC_*` environment variables.

The script sets `RABBITMQ_CONSUMER_ENABLED=true` at runtime before bootstrapping
the Nest application context. Do not commit `.env` files with local secrets or
machine-specific Fabric private key paths.

## Run

```bash
cd services/blockchain-service
npm run smoke:rabbitmq:submission
```

The npm script builds first, then runs:

```bash
ts-node -r tsconfig-paths/register src/scripts/rabbitmq-submission-flow.smoke.ts
```

Do not run this script unless RabbitMQ, Fabric, and the deployed chaincode are
already available.

## Expected Successful Result

The script should report:

- Input event is published with routing key
  `property.contract.submission.requested`.
- Blockchain Service consumes the event.
- `SubmitContract` succeeds through PlatformMSP.
- `blockchain.contract.submitted` is received from RabbitMQ.
- Status is `PENDING_EXTERNAL_APPROVALS`.
- `fabricTxId` is present.

## Covered

This runtime smoke test covers:

- Real RabbitMQ publish/consume behavior.
- `ContractSubmissionConsumer`.
- `ContractSubmissionService`.
- `ContractPayloadValidator`.
- `SubmitContractMapper`.
- `FabricClientService.submitContract`.
- Result event publishing for `blockchain.contract.submitted` or
  `blockchain.contract.submission.failed`.

## Not Covered

This runtime smoke test does not cover:

- Property Service integration.
- Registry or Notary approvals.
- `ConfirmContract`.
- Mobile/API Gateway flow.
- Database workflows.
