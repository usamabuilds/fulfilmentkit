UPDATE "User"
SET "authProviderUserId" = "id"
WHERE "authProvider" = 'local'
  AND "email" IS NOT NULL
  AND "authProviderUserId" = "email";
