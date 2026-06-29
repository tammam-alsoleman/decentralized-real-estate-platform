import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { ReadinessService } from './readiness.service';
import type { HealthCheckResponse } from './readiness.service';

@Controller()
export class HealthGrpcController {
  constructor(private readonly readinessService: ReadinessService) {}

  @GrpcMethod('BlockchainHealthService', 'CheckLiveness')
  checkLiveness(): HealthCheckResponse {
    return this.readinessService.checkLiveness();
  }

  @GrpcMethod('BlockchainHealthService', 'CheckReadiness')
  checkReadiness(): HealthCheckResponse {
    return this.readinessService.checkReadiness();
  }
}
