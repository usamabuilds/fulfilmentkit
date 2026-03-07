SELECT "id","workspaceId","userId","role","createdAt"
FROM "WorkspaceMember"
WHERE "workspaceId" = '11111111-1111-1111-1111-111111111111'
  AND "userId" = 'demo-user-1';
