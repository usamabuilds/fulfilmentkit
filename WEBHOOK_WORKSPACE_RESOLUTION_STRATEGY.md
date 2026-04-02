# Webhook Workspace Resolution Strategy
## Grounding
This note is grounded only in the current repository webhook ingress code and guard/middleware behavior, plus the locked and supporting webhook notes: `WEBHOOK_INGRESS_MODEL.md`, `CURRENT_WEBHOOK_ROUTE_ASSUMPTIONS.md`, and `FINAL_WEBHOOK_PUBLIC_REQUEST_CONTRACT.md`. It also adopts the already-verified webhook audit finding repeated in those notes: current ambiguity came from mixing provider callbacks with member-authenticated app-route assumptions.

## Relationship to Existing Webhook Notes
`WEBHOOK_INGRESS_MODEL.md` is the authority for webhook trust model and establishes provider-native callbacks as the only allowed ingress model.

`CURRENT_WEBHOOK_ROUTE_ASSUMPTIONS.md` captures the current mismatch baseline (header-provided workspace plus app-user membership gating), which this strategy explicitly rejects as a workspace trust source.

`FINAL_WEBHOOK_PUBLIC_REQUEST_CONTRACT.md` defines the final external request contract; this note narrows that contract to one exact internal rule set for workspace resolution so the implementation cannot drift back to mixed assumptions.

## Trusted Workspace Resolution Source
Workspace identity for webhook ingress must be resolved only from verified provider-callback context through internal FulfilmentKit linkage records.

The required linkage is provider callback identity -> platform-scoped internal connection records -> owning workspace.

The trusted resolver anchor is internal ownership data (`Connection.workspaceId`, and where relevant correlated `ConnectionSecret` ownership/metadata for the same platform/connection), not caller-supplied workspace identifiers.

Therefore, workspace is an internal lookup result after provider authenticity is established, never a direct request assertion.

## Forbidden Workspace Resolution Sources
The following are forbidden as webhook workspace trust sources:

- `X-Workspace-Id` (including any direct header-to-workspace assignment semantics).
- App-user/member identity context (JWT-derived user identity, workspace membership checks, workspace role context).
- Any mixed fallback model where workspace may come from either provider linkage or member-authenticated request context.
- Any request field that attempts to directly declare workspace identity.

For provider-native callbacks, workspace resolution must not depend on app-user membership context at any stage.

## Resolution Preconditions
Workspace resolution may succeed only after all of the following preconditions are true:

1. The webhook route/platform input is valid (`shopify|woocommerce|amazon`).
2. Provider authenticity has been verified using provider-native verification material for that platform.
3. The verified callback contains sufficient provider account/shop identity to perform internal mapping to a single owned connection/workspace context.

Order of trust is strict: authenticity verification first, internal mapping second, ingestion only after workspace resolution succeeds.

## Failure Contract
If workspace cannot be resolved from verified provider callback context and internal mapping, ingestion must not proceed.

If provider authenticity is valid but no internal mapping exists, the callback is rejected as unmapped (no workspace context is inferred from headers or member auth).

If mapping results are ambiguous or internally inconsistent (for example, non-unique or conflicting ownership linkage), the callback is rejected and treated as a resolution integrity failure; ingestion must not continue under guessed or fallback workspace scope.

## Stability Rules
To prevent drift, webhook ingress must remain single-model: provider-native callback trust plus internal connection ownership mapping.

Workspace resolution logic must remain isolated from app-route membership authorization semantics.

Any future changes to middleware/guards/controllers must preserve this invariant: webhook workspace identity is internally derived from verified provider linkage, not request-scoped member context.

## Decisions That Must Not Drift
- Do not restore `X-Workspace-Id` as a webhook workspace authority.
- Do not require or use app-user JWT/member context to resolve webhook workspace.
- Do not accept any “either provider-auth or member-auth” dual trust model on `POST /webhooks/:platform`.
- Do not allow ingestion before provider authenticity and singular internal mapping resolution both succeed.
- Do not introduce fallback workspace inference when mapping is missing, ambiguous, or inconsistent.
