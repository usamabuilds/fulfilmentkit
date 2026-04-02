# Current Webhook Route Assumptions
## Grounding
- This note is grounded in current repository code for webhook routing (`WebhookController`), global middleware (`JwtAuthMiddleware`), global guards (`WorkspaceGuard`, `RolesGuard`), and webhook ingestion service behavior (`WebhookService`).
- This note uses the locked ingress reference in `WEBHOOK_INGRESS_MODEL.md` as the comparison baseline.
- Verified audit finding context (already established and repeated in the locked model note): current ingress assumptions are ambiguous because provider callbacks are treated as member-authenticated app routes.

## Relationship to the Locked Webhook Ingress Model
- Step 1 (locked model) defines intended webhook ingress semantics: provider-native callback ingress.
- This note documents only current “before state” semantics and where they conflict with that locked model.
- Facts below reflect what runs today for `POST /webhooks/:platform`, not desired behavior.

## Route Entrypoint
- Route entrypoint is `@Controller('webhooks')` + `@Post(':platform')`, giving `POST /webhooks/:platform`.
- `:platform` is parsed as lowercase and validated against `shopify|woocommerce|amazon`.
- Before invoking service ingestion, controller reads:
  - `req.workspaceId` (cast to string)
  - full request headers (`@Headers()`)
  - request body payload (`@Body()`)
  - parsed path platform
- Controller then calls `webhookService.ingestWebhook({ workspaceId, platform, headers, payload })`.

## Middleware Assumptions
- `JwtAuthMiddleware` is applied globally to all routes (`forRoutes('(.*)', ALL)`), so it always runs before webhook controllers.
- Missing `Authorization` header: middleware clears `req.user` and `req.auth`, then continues.
- Malformed `Authorization` header (non-`Bearer` or missing token): middleware clears `req.user` and `req.auth`, then continues.
- Invalid JWT (issuer mismatch, provider mismatch, failed verify, missing external user id, or any verification failure): middleware clears `req.user` and `req.auth`, then continues.
- Valid JWT: middleware sets both `req.auth` (provider-scoped external identity + claims) and `req.user` (external identity fields) and continues.
- Middleware itself does not reject requests; it only enriches or clears auth context, leaving enforcement to downstream guards.

## Guard Assumptions
- Global guards are active for webhook route via `APP_GUARD`: `WorkspaceGuard` then `RolesGuard`.
- Webhook route is **not exempt** in `WorkspaceGuard` route exceptions.
- Therefore `X-Workspace-Id` header is required for `POST /webhooks/:platform`; missing/non-string throws `BadRequestException`.
- Workspace existence is checked via `prisma.workspace.findUnique`; missing workspace throws `NotFoundException`.
- If workspace exists, guard attaches `request.workspaceId` from header.
- Authenticated identity is required (for non-exempt route) through `resolveOrCreateUserFromAuth(... requireIdentity: true)`; missing identity throws `UnauthorizedException`.
- Workspace membership is required via `workspaceMember.findUnique(workspaceId, userId)`; missing membership throws `ForbiddenException`.
- On success guard attaches:
  - `request.user` (resolved/created internal user record)
  - `request.workspaceMember`
  - `request.workspaceRole`
  - `request.workspaceId`
- `RolesGuard` also runs globally, but for webhook handler with no role/permission metadata it returns true without extra constraints.

## Controller and Service Assumptions
- Webhook controller depends directly on `req.workspaceId`; there is no fallback or internal resolution in controller.
- `WebhookService.ingestWebhook` requires `workspaceId` as input and persists events under that workspace.
- Service does not resolve workspace from provider callback context (shop/account/connection mapping) internally; it inherits workspace scope from caller/guard-attached request state.
- Current implementation treats provider callback context alone as insufficient, because webhook path execution depends on guard-provided workspace + authenticated user membership gating before controller execution.

## Current Effective Request Contract
To successfully reach and execute webhook ingestion at `POST /webhooks/:platform`, current request must satisfy all of:
1. `:platform` must be one of `shopify|woocommerce|amazon`.
2. Route must pass global `WorkspaceGuard`:
   - include `X-Workspace-Id` header
   - referenced workspace must exist
   - request must carry a valid app-user identity resolvable from JWT middleware output
   - resolved user must be a member of that workspace
3. Payload/headers must include an external event id source accepted by service (`x-event-id` OR `x-shopify-webhook-id` OR `payload.id`) or service throws `BadRequestException`.
- Therefore, a provider-native callback request by itself does **not** satisfy current contract directly unless it also conforms to app-user auth + workspace-member assumptions.

## Confirmed Mismatches Against the Locked Model
1. **Caller model mismatch**: Locked model says caller is external provider only; current route enforces app-user identity + workspace membership.
2. **Auth mechanism mismatch**: Locked model forbids JWT as webhook auth mechanism; current path requires JWT-derived identity for non-exempt guard passage.
3. **Workspace trust-source mismatch**: Locked model forbids `X-Workspace-Id` as webhook trust input; current route requires and trusts `X-Workspace-Id` for workspace scoping.
4. **Workspace resolution mismatch**: Locked model requires workspace resolution from verified provider connection context; current flow resolves workspace externally (header + guard), then injects it into controller/service.
5. **Route semantics mismatch**: Locked model rejects mixed app-route semantics; current webhook route is governed by the same global middleware/guard chain used for member-authenticated app routes.

## Refactor-Relevant Before State
- Webhook ingress currently behaves as a member-authenticated workspace-scoped app route, not a pure provider-native callback route.
- Trust and gating currently occur in this order:
  1. global JWT middleware parses app-user auth context
  2. global workspace guard requires workspace header + membership
  3. controller reads `req.workspaceId` and forwards to service
  4. service performs event-id presence check and persistence
- This exact sequence is the “before state” baseline to preserve during analysis and use for subsequent refactor planning.
