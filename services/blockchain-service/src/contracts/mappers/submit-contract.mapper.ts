import { SubmitContractRequest } from '../dto/submit-contract-request.dto';

export class SubmitContractMapper {
  static toFabricPayload(payload: SubmitContractRequest): Record<string, unknown> {
    return {
      ...payload,
    };
  }
}
