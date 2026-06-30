import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { FabricClientService } from '../fabric/fabric-client.service';
import type { SubmitContractRequest } from '../contracts/dto/submit-contract-request.dto';

const EXPECTED_STATUS = 'PENDING_EXTERNAL_APPROVALS';

function buildSalePayload(transactionId: string): SubmitContractRequest {
  const now = new Date().toISOString();

  return {
    transactionId,
    contractType: 'SALE',
    propertyId: `smoke-property-${transactionId}`,
    registryNumber: `SMOKE-REG-${transactionId}`,
    propertyType: 'APARTMENT',
    location: 'Smoke Test City',
    area: '100',
    ownershipDocumentHash: `sha256:${transactionId}:ownership`,
    ownershipDocumentCid: `ipfs://${transactionId}/ownership`,
    contractHash: `sha256:${transactionId}:contract`,
    contractCid: `ipfs://${transactionId}/contract`,
    auditPackageHash: `sha256:${transactionId}:audit`,
    auditPackageCid: `ipfs://${transactionId}/audit`,
    signaturesHash: `sha256:${transactionId}:signatures`,
    platformReference: `SMOKE-PLATFORM-${transactionId}`,
    platformProofHash: `sha256:${transactionId}:platform-proof`,
    occurredAt: now,
    sellerUserId: `seller-${transactionId}`,
    sellerFullName: 'Smoke Test Seller',
    sellerNationalId: `seller-national-id-${transactionId}`,
    buyerUserId: `buyer-${transactionId}`,
    buyerFullName: 'Smoke Test Buyer',
    buyerNationalId: `buyer-national-id-${transactionId}`,
    sellerSignedAt: now,
    buyerSignedAt: now,
    price: '100000',
    currency: 'USD',
  };
}

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const transactionId = `smoke-bc-sale-${Date.now()}`;
  const payload = buildSalePayload(transactionId);

  try {
    const fabricClientService = app.get(FabricClientService);
    const submitResult = await fabricClientService.submitContract({ ...payload });
    const contractRecord =
      await fabricClientService.getContractByTxId(transactionId);

    if (submitResult.status !== EXPECTED_STATUS) {
      throw new Error(
        `SubmitContract returned status ${submitResult.status}, expected ${EXPECTED_STATUS}`,
      );
    }

    if (contractRecord.transactionId !== transactionId) {
      throw new Error(
        `GetContractByTxId returned transactionId ${contractRecord.transactionId}, expected ${transactionId}`,
      );
    }

    if (contractRecord.status !== EXPECTED_STATUS) {
      throw new Error(
        `GetContractByTxId returned status ${contractRecord.status}, expected ${EXPECTED_STATUS}`,
      );
    }

    console.log('Fabric SubmitContract smoke test succeeded.');
    console.log(`transactionId=${transactionId}`);
    console.log(`fabricTxId=${submitResult.fabricTxId}`);
    console.log(`status=${contractRecord.status}`);
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error('Fabric SubmitContract smoke test failed.');
  console.error(message);
  process.exitCode = 1;
});
