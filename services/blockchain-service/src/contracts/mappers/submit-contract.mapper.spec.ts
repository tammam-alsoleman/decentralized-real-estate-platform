import type { SubmitContractRequest } from '../dto/submit-contract-request.dto';
import { validRentSubmitContractFixture } from '../test-fixtures/valid-rent-submit-contract.fixture';
import { validSaleSubmitContractFixture } from '../test-fixtures/valid-sale-submit-contract.fixture';
import { SubmitContractMapper } from './submit-contract.mapper';

describe('SubmitContractMapper', () => {
  it('maps a SALE payload without adding RENT-only fields', () => {
    const input = validSaleSubmitContractFixture();
    const original = structuredClone(input);

    const output = SubmitContractMapper.toFabricPayload(input);

    expect(output).toMatchObject({
      transactionId: input.transactionId,
      contractType: 'SALE',
      propertyId: input.propertyId,
      contractHash: input.contractHash,
      sellerUserId: input.sellerUserId,
      sellerFullName: input.sellerFullName,
      sellerNationalId: input.sellerNationalId,
      buyerUserId: input.buyerUserId,
      buyerFullName: input.buyerFullName,
      buyerNationalId: input.buyerNationalId,
      sellerSignedAt: input.sellerSignedAt,
      buyerSignedAt: input.buyerSignedAt,
      price: input.price,
      currency: input.currency,
    });
    expect(output).not.toHaveProperty('rentStartDate');
    expect(output).not.toHaveProperty('rentEndDate');
    expect(output).not.toHaveProperty('rentAmount');
    expect(output).not.toHaveProperty('landlordUserId');
    expect(input).toEqual(original);
  });

  it('maps a RENT payload without adding SALE-only fields', () => {
    const input = validRentSubmitContractFixture();
    const original = structuredClone(input);

    const output = SubmitContractMapper.toFabricPayload(input);

    expect(output).toMatchObject({
      transactionId: input.transactionId,
      contractType: 'RENT',
      propertyId: input.propertyId,
      contractHash: input.contractHash,
      landlordUserId: input.landlordUserId,
      landlordFullName: input.landlordFullName,
      landlordNationalId: input.landlordNationalId,
      tenantUserId: input.tenantUserId,
      tenantFullName: input.tenantFullName,
      tenantNationalId: input.tenantNationalId,
      landlordSignedAt: input.landlordSignedAt,
      tenantSignedAt: input.tenantSignedAt,
      rentStartDate: input.rentStartDate,
      rentEndDate: input.rentEndDate,
      rentAmount: input.rentAmount,
      currency: input.currency,
    });
    expect(output).not.toHaveProperty('sellerUserId');
    expect(output).not.toHaveProperty('buyerUserId');
    expect(output).not.toHaveProperty('price');
    expect(input).toEqual(original);
  });

  it('does not hash identity fields or mutate the original input', () => {
    const input: SubmitContractRequest = validSaleSubmitContractFixture();
    const original = structuredClone(input);

    const output = SubmitContractMapper.toFabricPayload(input);

    expect(output.sellerFullName).toBe(input.sellerFullName);
    expect(output.sellerNationalId).toBe(input.sellerNationalId);
    expect(output.buyerFullName).toBe(input.buyerFullName);
    expect(output.buyerNationalId).toBe(input.buyerNationalId);
    expect(output).not.toHaveProperty('sellerFullNameHash');
    expect(output).not.toHaveProperty('sellerNationalIdHash');
    expect(output).not.toHaveProperty('buyerFullNameHash');
    expect(output).not.toHaveProperty('buyerNationalIdHash');
    expect(input).toEqual(original);
    expect(output).not.toBe(input);
  });
});
