import { IsNotEmpty, IsString } from 'class-validator';

export class SaleContractDto {
  @IsString()
  @IsNotEmpty()
  sellerUserId!: string;

  @IsString()
  @IsNotEmpty()
  sellerFullName!: string;

  @IsString()
  @IsNotEmpty()
  sellerNationalId!: string;

  @IsString()
  @IsNotEmpty()
  buyerUserId!: string;

  @IsString()
  @IsNotEmpty()
  buyerFullName!: string;

  @IsString()
  @IsNotEmpty()
  buyerNationalId!: string;

  @IsString()
  @IsNotEmpty()
  sellerSignedAt!: string;

  @IsString()
  @IsNotEmpty()
  buyerSignedAt!: string;

  @IsString()
  @IsNotEmpty()
  price!: string;

  @IsString()
  @IsNotEmpty()
  currency!: string;
}
