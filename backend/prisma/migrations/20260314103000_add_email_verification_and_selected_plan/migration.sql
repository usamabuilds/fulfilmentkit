CREATE TYPE "SelectedPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

ALTER TABLE "User"
  ADD COLUMN "selectedPlan" "SelectedPlan";

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

ALTER TABLE "EmailVerificationCode"
  ADD CONSTRAINT "EmailVerificationCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId");
CREATE INDEX "EmailVerificationCode_expiresAt_idx" ON "EmailVerificationCode"("expiresAt");
CREATE INDEX "EmailVerificationCode_codeHash_idx" ON "EmailVerificationCode"("codeHash");
CREATE INDEX "EmailVerificationCode_userId_expiresAt_idx" ON "EmailVerificationCode"("userId", "expiresAt");
