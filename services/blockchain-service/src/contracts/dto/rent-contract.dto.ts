import { IsNotEmpty, IsString } from 'class-validator';

export class RentContractDto {
  @IsString()
  @IsNotEmpty()
  landlordUserId!: string;

  @IsString()
  @IsNotEmpty()
  landlordFullName!: string;

  @IsString()
  @IsNotEmpty()
  landlordNationalId!: string;

  @IsString()
  @IsNotEmpty()
  tenantUserId!: string;

  @IsString()
  @IsNotEmpty()
  tenantFullName!: string;

  @IsString()
  @IsNotEmpty()
  tenantNationalId!: string;

  @IsString()
  @IsNotEmpty()
  landlordSignedAt!: string;

  @IsString()
  @IsNotEmpty()
  tenantSignedAt!: string;

  @IsString()
  @IsNotEmpty()
  rentStartDate!: string;

  @IsString()
  @IsNotEmpty()
  rentEndDate!: string;

  @IsString()
  @IsNotEmpty()
  rentAmount!: string;

  @IsString()
  @IsNotEmpty()
  currency!: string;
}
