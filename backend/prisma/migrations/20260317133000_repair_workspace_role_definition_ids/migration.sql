CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE "_WorkspaceRoleDefinitionIdRepair" (
  "oldId" TEXT PRIMARY KEY,
  "newId" TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO "_WorkspaceRoleDefinitionIdRepair" ("oldId", "newId")
SELECT "id", gen_random_uuid()::text
FROM "WorkspaceRoleDefinition"
WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

UPDATE "WorkspaceRoleDefinition" rd
SET "id" = repair."newId"
FROM "_WorkspaceRoleDefinitionIdRepair" repair
WHERE rd."id" = repair."oldId";

DO $$
DECLARE
  malformed_count BIGINT;
  orphan_count BIGINT;
BEGIN
  SELECT COUNT(*)::bigint
  INTO malformed_count
  FROM "WorkspaceRoleDefinition"
  WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  SELECT COUNT(*)::bigint
  INTO orphan_count
  FROM "WorkspaceMember" wm
  WHERE wm."roleDefinitionId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "WorkspaceRoleDefinition" rd
      WHERE rd."id" = wm."roleDefinitionId"
    );

  IF malformed_count > 0 THEN
    RAISE EXCEPTION 'WorkspaceRoleDefinition contains % malformed id values after repair migration', malformed_count;
  END IF;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'WorkspaceMember contains % orphaned roleDefinitionId values after repair migration', orphan_count;
  END IF;
END $$;
