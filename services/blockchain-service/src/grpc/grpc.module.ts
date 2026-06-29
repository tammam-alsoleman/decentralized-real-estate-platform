import { Module } from '@nestjs/common';

import { HealthGrpcController } from './health.grpc.controller';
import { ReadinessService } from './readiness.service';

@Module({
  controllers: [HealthGrpcController],
  providers: [ReadinessService],
})
export class GrpcModule {}
