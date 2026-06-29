import { ServiceError } from '../../errors/service-error';
import type { SubmitContractRequest } from '../dto/submit-contract-request.dto';
import { validRentSubmitContractFixture } from '../test-fixtures/valid-rent-submit-contract.fixture';
import { validSaleSubmitContractFixture } from '../test-fixtures/valid-sale-submit-contract.fixture';
import { ContractPayloadValidator } from './contract-payload.validator';

describe('ContractPayloadValidator', () => {
  it('passes a valid SALE payload', () => {
    const payload = validSaleSubmitContractFixture();

    expect(() => ContractPayloadValidator.validate(payload)).not.toThrow();
  });

  it('fails a SALE payload with RENT-only fields', () => {
    const payload: SubmitContractRequest = {
      ...validSaleSubmitContractFixture(),
      rentStartDate: '2026-02-01',
      rentEndDate: '2027-02-01',
      rentAmount: '1500',
    };

    expect(() => ContractPayloadValidator.validate(payload)).toThrow(
      ServiceError,
    );
  });

  it('fails a SALE payload with a missing sale-specific field', () => {
    const payload = {
      ...validSaleSubmitContractFixture(),
    } as Partial<SubmitContractRequest>;
    delete payload.buyerNationalId;

    expect(() =>
      ContractPayloadValidator.validate(payload as SubmitContractRequest),
    ).toThrow(ServiceError);
  });

  it('passes a valid RENT payload', () => {
    const payload = validRentSubmitContractFixture();

    expect(() => ContractPayloadValidator.validate(payload)).not.toThrow();
  });

  it('fails a RENT payload with SALE-only fields', () => {
    const payload: SubmitContractRequest = {
      ...validRentSubmitContractFixture(),
      sellerUserId: 'seller-001',
      buyerUserId: 'buyer-001',
      price: '100000',
    };

    expect(() => ContractPayloadValidator.validate(payload)).toThrow(
      ServiceError,
    );
  });

  it('fails a RENT payload with a missing rent-specific field', () => {
    const payload = {
      ...validRentSubmitContractFixture(),
    } as Partial<SubmitContractRequest>;
    delete payload.rentEndDate;

    expect(() =>
      ContractPayloadValidator.validate(payload as SubmitContractRequest),
    ).toThrow(ServiceError);
  });

  it('fails when a common field is missing', () => {
    const payload = {
      ...validSaleSubmitContractFixture(),
    } as Partial<SubmitContractRequest>;
    delete payload.transactionId;

    expect(() =>
      ContractPayloadValidator.validate(payload as SubmitContractRequest),
    ).toThrow(ServiceError);
  });

  it('fails for an unsupported contractType', () => {
    const payload = {
      ...validSaleSubmitContractFixture(),
      contractType: 'LEASE',
    } as unknown as SubmitContractRequest;

    expect(() => ContractPayloadValidator.validate(payload)).toThrow(
      ServiceError,
    );
  });
});
