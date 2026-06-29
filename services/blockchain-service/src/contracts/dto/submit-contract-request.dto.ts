import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import type { ContractType } from '../types/contract-type.type';

export class SubmitContractRequest {
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsIn(['SALE', 'RENT'])
  contractType!: ContractType;

  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @IsString()
  @IsNotEmpty()
  registryNumber!: string;

  @IsString()
  @IsNotEmpty()
  propertyType!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsString()
  @IsNotEmpty()
  area!: string;

  @IsString()
  @IsNotEmpty()
  ownershipDocumentHash!: string;

  @IsString()
  @IsNotEmpty()
  ownershipDocumentCid!: string;

  @IsString()
  @IsNotEmpty()
  contractHash!: string;

  @IsString()
  @IsNotEmpty()
  contractCid!: string;

  @IsString()
  @IsNotEmpty()
  auditPackageHash!: string;

  @IsString()
  @IsNotEmpty()
  auditPackageCid!: string;

  @IsString()
  @IsNotEmpty()
  signaturesHash!: string;

  @IsString()
  @IsNotEmpty()
  platformReference!: string;

  @IsString()
  @IsNotEmpty()
  platformProofHash!: string;

  @IsString()
  @IsNotEmpty()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  sellerUserId?: string;

  @IsOptional()
  @IsString()
  sellerFullName?: string;

  @IsOptional()
  @IsString()
  sellerNationalId?: string;

  @IsOptional()
  @IsString()
  buyerUserId?: string;

  @IsOptional()
  @IsString()
  buyerFullName?: string;

  @IsOptional()
  @IsString()
  buyerNationalId?: string;

  @IsOptional()
  @IsString()
  sellerSignedAt?: string;

  @IsOptional()
  @IsString()
  buyerSignedAt?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  landlordUserId?: string;

  @IsOptional()
  @IsString()
  landlordFullName?: string;

  @IsOptional()
  @IsString()
  landlordNationalId?: string;

  @IsOptional()
  @IsString()
  tenantUserId?: string;

  @IsOptional()
  @IsString()
  tenantFullName?: string;

  @IsOptional()
  @IsString()
  tenantNationalId?: string;

  @IsOptional()
  @IsString()
  landlordSignedAt?: string;

  @IsOptional()
  @IsString()
  tenantSignedAt?: string;

  @IsOptional()
  @IsString()
  rentStartDate?: string;

  @IsOptional()
  @IsString()
  rentEndDate?: string;

  @IsOptional()
  @IsString()
  rentAmount?: string;
}
