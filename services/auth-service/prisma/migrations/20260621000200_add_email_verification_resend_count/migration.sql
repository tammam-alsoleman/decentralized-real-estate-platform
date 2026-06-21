-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verification_resend_count" INTEGER NOT NULL DEFAULT 0;
