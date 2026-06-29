import { ErrorCode } from '../../errors/error-codes';
import { ServiceError } from '../../errors/service-error';
import { SubmitContractRequest } from '../dto/submit-contract-request.dto';

const commonFields: Array<keyof SubmitContractRequest> = [
  'transactionId',
  'contractType',
  'propertyId',
  'registryNumber',
  'propertyType',
  'location',
  'area',
  'ownershipDocumentHash',
  'ownershipDocumentCid',
  'contractHash',
  'contractCid',
  'auditPackageHash',
  'auditPackageCid',
  'signaturesHash',
  'platformReference',
  'platformProofHash',
  'occurredAt',
];

const saleFields: Array<keyof SubmitContractRequest> = [
  'sellerUserId',
  'sellerFullName',
  'sellerNationalId',
  'buyerUserId',
  'buyerFullName',
  'buyerNationalId',
  'sellerSignedAt',
  'buyerSignedAt',
  'price',
  'currency',
];

const rentFields: Array<keyof SubmitContractRequest> = [
  'landlordUserId',
  'landlordFullName',
  'landlordNationalId',
  'tenantUserId',
  'tenantFullName',
  'tenantNationalId',
  'landlordSignedAt',
  'tenantSignedAt',
  'rentStartDate',
  'rentEndDate',
  'rentAmount',
  'currency',
];

export class ContractPayloadValidator {
  static validate(payload: SubmitContractRequest): void {
    this.requireFields(payload, commonFields);

    if (payload.contractType !== 'SALE' && payload.contractType !== 'RENT') {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'contractType must be SALE or RENT',
      );
    }

    if (payload.contractType === 'SALE') {
      this.requireFields(payload, saleFields);
      this.requireEmptyFields(payload, rentFields.filter((field) => field !== 'currency'), 'SALE');
      return;
    }

    this.requireFields(payload, rentFields);
    this.requireEmptyFields(payload, saleFields.filter((field) => field !== 'currency'), 'RENT');
  }

  private static requireFields(
    payload: SubmitContractRequest,
    fields: Array<keyof SubmitContractRequest>,
  ): void {
    const missing = fields.filter((field) => !this.hasValue(payload[field]));

    if (missing.length > 0) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        `Missing required contract fields: ${missing.join(', ')}`,
      );
    }
  }

  private static requireEmptyFields(
    payload: SubmitContractRequest,
    fields: Array<keyof SubmitContractRequest>,
    contractType: string,
  ): void {
    const present = fields.filter((field) => this.hasValue(payload[field]));

    if (present.length > 0) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        `${present.join(', ')} must be empty for ${contractType} contracts`,
      );
    }
  }

  private static hasValue(value: unknown): boolean {
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
  }
}
