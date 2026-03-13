-- CreateEnum
CREATE TYPE "SelectedPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "selectedPlan" "SelectedPlan",
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_expiresAt_idx" ON "EmailVerificationCode"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_codeHash_idx" ON "EmailVerificationCode"("codeHash");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_userId_expiresAt_idx" ON "EmailVerificationCode"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "EmailVerificationCode" ADD CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
