import type { SubmitContractRequest } from '../../contracts/dto/submit-contract-request.dto';

export type PropertyContractSubmissionRequestedEvent = {
  messageId: string;
  correlationId: string;
  causationId: string;
  eventType: 'property.contract.submission.requested';
  schemaVersion: string;
  occurredAt: string;
  producer: string;
  payload: SubmitContractRequest;
};
