export default () => ({
  service: {
    name: process.env.SERVICE_NAME ?? 'blockchain-service',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  grpc: {
    host: process.env.GRPC_HOST ?? '0.0.0.0',
    port: Number(process.env.GRPC_PORT ?? 50055),
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'realestate.events',
    contractSubmissionQueue:
      process.env.RABBITMQ_CONTRACT_SUBMISSION_QUEUE ??
      'blockchain.contract-submission',
    contractSubmissionRoutingKey:
      process.env.RABBITMQ_CONTRACT_SUBMISSION_ROUTING_KEY ??
      'property.contract.submission.requested',
  },
  fabric: {
    channelName: process.env.FABRIC_CHANNEL_NAME ?? 'realestatechannel',
    chaincodeName: process.env.FABRIC_CHAINCODE_NAME ?? 'realestate-contract',
    mspId: process.env.FABRIC_MSP_ID ?? 'PlatformMSP',
    peerEndpoint:
      process.env.FABRIC_PEER_ENDPOINT ??
      'peer0.platform.realestate.local:9051',
    tlsCertPath:
      process.env.FABRIC_TLS_CERT_PATH ?? '/fabric/crypto/platform/tls/ca.crt',
    tlsServerNameOverride:
      process.env.FABRIC_TLS_SERVER_NAME_OVERRIDE ?? undefined,
    certPath:
      process.env.FABRIC_CERT_PATH ??
      '/fabric/crypto/platform/users/Admin@platform.realestate.local/msp/signcerts/cert.pem',
    privateKeyPath:
      process.env.FABRIC_PRIVATE_KEY_PATH ??
      '/fabric/crypto/platform/users/Admin@platform.realestate.local/msp/keystore/key.pem',
  },
});
