ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "selectedPlan" TEXT;

ALTER TABLE "User"
  ALTER COLUMN "selectedPlan" TYPE TEXT USING "selectedPlan"::TEXT;

CREATE TABLE IF NOT EXISTS "EmailVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EmailVerificationCode"
  ADD COLUMN IF NOT EXISTS "code" TEXT;

UPDATE "EmailVerificationCode"
SET "code" = COALESCE("code", "codeHash")
WHERE "code" IS NULL;

ALTER TABLE "EmailVerificationCode"
  ALTER COLUMN "code" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId");
CREATE INDEX IF NOT EXISTS "EmailVerificationCode_expiresAt_idx" ON "EmailVerificationCode"("expiresAt");
CREATE INDEX IF NOT EXISTS "EmailVerificationCode_codeHash_idx" ON "EmailVerificationCode"("codeHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationCode_userId_expiresAt_idx" ON "EmailVerificationCode"("userId", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EmailVerificationCode_userId_fkey'
  ) THEN
    ALTER TABLE "EmailVerificationCode"
      ADD CONSTRAINT "EmailVerificationCode_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
