/*
  Warnings:

  - Added the required column `national_id_encrypted` to the `legal_identity_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "legal_identity_profiles" ADD COLUMN     "legal_address" TEXT,
ADD COLUMN     "national_id_encrypted" TEXT NOT NULL;
