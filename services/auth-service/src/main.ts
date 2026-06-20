import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'realestate.auth.v1',
        protoPath: join(process.cwd(), '../../packages/proto/auth.proto'),
        url: process.env.AUTH_GRPC_URL ?? '0.0.0.0:50051',
      },
    },
  );

  await app.listen();
}
bootstrap();
