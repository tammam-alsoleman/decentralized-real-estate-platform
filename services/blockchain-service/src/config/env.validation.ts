type Environment = Record<string, string | undefined>;

const requiredNames = [
  'SERVICE_NAME',
  'GRPC_HOST',
  'GRPC_PORT',
  'RABBITMQ_URL',
  'RABBITMQ_EXCHANGE',
  'RABBITMQ_CONTRACT_SUBMISSION_QUEUE',
  'RABBITMQ_CONTRACT_SUBMISSION_ROUTING_KEY',
  'RABBITMQ_CONTRACT_SUBMITTED_ROUTING_KEY',
  'RABBITMQ_CONTRACT_SUBMISSION_FAILED_ROUTING_KEY',
  'FABRIC_CHANNEL_NAME',
  'FABRIC_CHAINCODE_NAME',
  'FABRIC_MSP_ID',
  'FABRIC_PEER_ENDPOINT',
  'FABRIC_TLS_CERT_PATH',
  'FABRIC_CERT_PATH',
  'FABRIC_PRIVATE_KEY_PATH',
];

export function validateEnvironment(config: Environment): Environment {
  const missing = requiredNames.filter((name) => !config[name]);

  if (missing.length > 0 && config.NODE_ENV === 'production') {
    throw new Error(
      `Missing required Blockchain Service environment variables: ${missing.join(
        ', ',
      )}`,
    );
  }

  if (config.FABRIC_MSP_ID && config.FABRIC_MSP_ID !== 'PlatformMSP') {
    throw new Error('Blockchain Service must be configured with PlatformMSP');
  }

  return config;
}
