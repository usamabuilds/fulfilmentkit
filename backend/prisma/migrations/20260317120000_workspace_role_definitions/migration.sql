-- CreateTable
CREATE TABLE "WorkspaceRoleDefinition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "legacyRole" "WorkspaceRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceRoleDefinition_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN "roleDefinitionId" TEXT;

-- CreateIndex
CREATE INDEX "WorkspaceRoleDefinition_workspaceId_idx" ON "WorkspaceRoleDefinition"("workspaceId");
CREATE UNIQUE INDEX "WorkspaceRoleDefinition_workspaceId_name_key" ON "WorkspaceRoleDefinition"("workspaceId", "name");
CREATE UNIQUE INDEX "WorkspaceRoleDefinition_workspaceId_legacyRole_key" ON "WorkspaceRoleDefinition"("workspaceId", "legacyRole");
CREATE INDEX "WorkspaceMember_roleDefinitionId_idx" ON "WorkspaceMember"("roleDefinitionId");

-- AddForeignKey
ALTER TABLE "WorkspaceRoleDefinition" ADD CONSTRAINT "WorkspaceRoleDefinition_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_roleDefinitionId_fkey" FOREIGN KEY ("roleDefinitionId") REFERENCES "WorkspaceRoleDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill default role definitions for every workspace
INSERT INTO "WorkspaceRoleDefinition" ("id", "workspaceId", "name", "description", "permissions", "isSystem", "legacyRole", "createdAt", "updatedAt")
SELECT
  CONCAT(
    SUBSTRING(MD5(CONCAT(w."id", ':', r."role"::TEXT)) FROM 1 FOR 8), '-',
    SUBSTRING(MD5(CONCAT(w."id", ':', r."role"::TEXT)) FROM 9 FOR 4), '-',
    SUBSTRING(MD5(CONCAT(w."id", ':', r."role"::TEXT)) FROM 13 FOR 4), '-',
    SUBSTRING(MD5(CONCAT(w."id", ':', r."role"::TEXT)) FROM 17 FOR 4), '-',
    SUBSTRING(MD5(CONCAT(w."id", ':', r."role"::TEXT)) FROM 21 FOR 12)
  ),
  w."id",
  INITCAP(LOWER(r."role"::TEXT)),
  CONCAT('Default ', LOWER(r."role"::TEXT), ' role'),
  CASE
    WHEN r."role" = 'OWNER'::"WorkspaceRole" THEN '["workspace.manage","members.manage","roles.manage","catalog.write","inventory.write","orders.write","forecast.write","connections.write","analytics.view"]'::jsonb
    WHEN r."role" = 'ADMIN'::"WorkspaceRole" THEN '["members.manage","catalog.write","inventory.write","orders.write","forecast.write","connections.write","analytics.view"]'::jsonb
    ELSE '["catalog.read","inventory.read","orders.read","forecast.read","analytics.view"]'::jsonb
  END,
  true,
  r."role",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Workspace" w
CROSS JOIN (
  VALUES ('OWNER'::"WorkspaceRole"), ('ADMIN'::"WorkspaceRole"), ('VIEWER'::"WorkspaceRole")
) AS r("role")
ON CONFLICT ("workspaceId", "legacyRole") DO NOTHING;

-- Link existing memberships to their default role definitions
UPDATE "WorkspaceMember" m
SET "roleDefinitionId" = rd."id"
FROM "WorkspaceRoleDefinition" rd
WHERE rd."workspaceId" = m."workspaceId"
  AND rd."legacyRole" = m."role";
