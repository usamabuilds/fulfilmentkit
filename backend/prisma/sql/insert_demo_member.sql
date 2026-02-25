INSERT INTO "WorkspaceMember"
("id","workspaceId","userId","role","createdAt")
VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'demo-user-1',
  'OWNER',
  NOW()
);
