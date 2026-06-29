import type { SubmitContractRequest } from '../dto/submit-contract-request.dto';

export function validSaleSubmitContractFixture(): SubmitContractRequest {
  return {
    transactionId: 'test-sale-transaction-001',
    contractType: 'SALE',
    propertyId: 'property-001',
    registryNumber: 'REG-001',
    propertyType: 'APARTMENT',
    location: 'Test City',
    area: '120',
    ownershipDocumentHash: 'sha256:ownership',
    ownershipDocumentCid: 'ipfs://ownership',
    contractHash: 'sha256:contract',
    contractCid: 'ipfs://contract',
    auditPackageHash: 'sha256:audit',
    auditPackageCid: 'ipfs://audit',
    signaturesHash: 'sha256:signatures',
    platformReference: 'PLATFORM-001',
    platformProofHash: 'sha256:platform-proof',
    occurredAt: '2026-01-01T00:00:00Z',
    sellerUserId: 'seller-001',
    sellerFullName: 'Test Seller',
    sellerNationalId: 'SELLER-ID',
    buyerUserId: 'buyer-001',
    buyerFullName: 'Test Buyer',
    buyerNationalId: 'BUYER-ID',
    sellerSignedAt: '2026-01-01T00:01:00Z',
    buyerSignedAt: '2026-01-01T00:02:00Z',
    price: '100000',
    currency: 'USD',
  };
}
