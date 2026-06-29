import { Inject, Injectable, forwardRef } from '@nestjs/common';

import { ContractSubmissionService } from '../../contracts/contract-submission.service';
import { PropertyContractSubmissionRequestedEvent } from '../contracts/property-contract-submission-requested.event';

@Injectable()
export class ContractSubmissionConsumer {
  static readonly eventType = 'property.contract.submission.requested';

  constructor(
    @Inject(forwardRef(() => ContractSubmissionService))
    private readonly contractSubmissionService: ContractSubmissionService,
  ) {}

  async handle(
    event: PropertyContractSubmissionRequestedEvent,
  ): Promise<void> {
    await this.contractSubmissionService.handleSubmissionRequested(event);
  }
}
