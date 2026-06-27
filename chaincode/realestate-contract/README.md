# Real Estate Contract Chaincode

This chaincode records the institutional approval workflow for real estate transactions on a permissioned Hyperledger Fabric channel.

## Workflow

Approved flow:

```text
SubmitContract -> ApproveByRegistry -> ApproveByNotary -> ConfirmContract
```

`SubmitContract` is called by a `PlatformMSP` identity after the Property Service has already completed platform-side verification:

- legal identity exists
- parties signed the final contract
- parties signed the same `contractHash`
- `signaturesHash` is finalized
- contract file is uploaded
- audit package is ready
- transaction is ready for Registry and Notary review

There is no `ApproveByPlatform` function. Platform verification happens before `SubmitContract`, outside chaincode. The chaincode stores a `platformSubmission` object proving that the contract entered Fabric through the official platform flow.

## Institutional Review

Registry and Notary compare submitted data with their institutional databases outside chaincode through future approval clients.

For the MVP, `registry_schema` and `notary_schema` will later be represented as separate PostgreSQL schemas inside the existing PostgreSQL container. This chaincode does not access those schemas directly.

## External Systems

The chaincode does not connect to PostgreSQL, Property Service, Auth Service, IPFS, RabbitMQ, or any other external system. It only records:

- submitted contract data
- platform proof
- institutional decisions
- evidence hashes
- state transitions
- Fabric history

## Chaincode Events

The chaincode emits one Fabric event name: `ContractStatusChanged`.

The JSON payload includes `eventType`, `transactionId`, `status`, `actorMsp`, `fabricTxId`, and `emittedAt`. Registry and Notary decision events can also include `reference`, `evidenceHash`, `evidenceCid`, `reasonCode`, `reasonSummary`, and `decidedAt`.

Blockchain Service can subscribe to these events to update Property Service state and notify contract parties. Business rejections by Registry or Notary are successful ledger transactions and emit events. Technical invocation errors are returned directly and are not ledger state transitions.

## Privacy Model

Raw identity fields are included in this MVP because the Fabric channel is permissioned and shared by authorized institutions only. The record also stores deterministic SHA-256 hashes of identity values for audit support.

This can evolve later into a stricter privacy model if required.
