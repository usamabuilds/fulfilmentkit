INSERT INTO "User" ("id", "authProvider", "providerUserId", "email", "createdAt", "updatedAt")
SELECT DISTINCT
  wm."userId" as id,
  'SUPABASE' as "authProvider",
  wm."userId" as "providerUserId",
  NULL as email,
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM "WorkspaceMember" wm
LEFT JOIN "User" u ON u."id" = wm."userId"
WHERE u."id" IS NULL;
