# FulfilmentKit Webhook Ingress Model
## Grounding
- Repo-grounded: FulfilmentKit currently exposes direct provider callback endpoints at `POST /webhooks/:platform`, with `platform` restricted to `shopify|woocommerce|amazon`.
- Repo-grounded: Webhook handling currently consumes `req.workspaceId`, and the global `WorkspaceGuard` sets `workspaceId` from `X-Workspace-Id` plus workspace membership checks for non-exempt routes.
- Repo-grounded: `JwtAuthMiddleware` is global, so inbound webhook requests are currently processed in the same auth middleware path used for app-user routes.
- Repo-grounded: Current webhook ingestion has no provider signature verification implemented; it only derives external event id from generic headers/body.
- Verified audit finding (already established outside this note): current ingress assumptions are ambiguous because provider callbacks are being treated like member-authenticated app routes.

## Chosen Model
**Allowed model: provider-native callback ingress.**

This is a design choice that aligns with existing repository shape (`/webhooks/:platform` provider callbacks) and removes the audited ambiguity. FulfilmentKit will accept webhook calls directly from external commerce providers, not from an internal relay tier.

## Trusted Caller
The trusted caller is **the external provider** (e.g., Shopify/WooCommerce/Amazon webhook sender), never an app user.

Trust source for caller authenticity is **provider webhook verification material** (provider signature and/or provider webhook secret, depending on platform contract).

## Trusted Inputs
For webhook ingress, trusted inputs are limited to:
- Path platform identifier (`:platform`) constrained to supported providers.
- Provider verification headers/body material used to validate signature/secret.
- Provider-native event identity fields used for idempotency.

No app-user identity artifacts are part of trusted webhook identity.

## Rejected Assumptions
The following are explicitly **not allowed**:
- Treating provider callbacks as member-authenticated app routes.
- Depending on workspace membership checks tied to app-user JWT identity for webhook acceptance.
- Accepting mixed ingress assumptions where either provider callback *or* app-user-authenticated route semantics can authorize the same webhook path.
- Treating webhook caller as an app user under any circumstance.

## Workspace Resolution Principle
Workspace resolution for webhook ingress must come from **provider-verified connection context**, not from app-user headers.

Design-level rule:
- Resolve workspace by looking up the internal connection mapping associated with the verified provider callback (for example: verified provider account/shop + platform -> connection -> workspace).
- Do not use app-user membership context to determine webhook workspace.

## Required Request Contract
Webhook ingress contract (design lock):
- **Required path param:** `:platform` (`shopify|woocommerce|amazon`).
- **Allowed headers:** provider-defined webhook verification/idempotency headers for the selected platform.
- **Forbidden assumptions:** app-user session context, workspace membership context, or any app-route authorization semantics.
- **`X-Workspace-Id`: forbidden** for webhook ingress (must be ignored/rejected as a trust source).
- **App-user JWT (`Authorization: Bearer ...`): forbidden as an auth mechanism for webhook ingress** (must not be required; if present, it is ignored for trust and must not influence workspace resolution).

## Acceptance Criteria
After webhook refactor implementation, all of the following must be true:
1. Webhook ingress supports exactly one model: **provider-native callback ingress**.
2. Webhook acceptance depends on provider verification material (signature/secret per provider), not app-user auth.
3. Webhook caller identity is treated as external provider only; never as app user.
4. `X-Workspace-Id` is not a valid trust input for webhook ingress.
5. App-user JWT is not required and not used to authorize webhook ingress.
6. Workspace resolution is derived from verified provider callback -> internal connection mapping.
7. The ambiguous mixed model (provider callback + member-authenticated route assumptions) is removed.
8. Webhook idempotency remains tied to provider event identity within resolved workspace/platform scope.
