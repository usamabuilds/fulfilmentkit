# Final Webhook Public Request Contract
## Grounding
This contract is grounded only in: (a) current webhook route/service code paths, (b) the locked ingress model in `WEBHOOK_INGRESS_MODEL.md`, (c) the current-state assumptions/mismatches in `CURRENT_WEBHOOK_ROUTE_ASSUMPTIONS.md`, and (d) the already-verified audit finding repeated in those notes (current ambiguity from mixing provider callbacks with member-authenticated app-route semantics).

## Relationship to Existing Webhook Notes
- `WEBHOOK_INGRESS_MODEL.md` is the design lock and trust model baseline: provider-native callback ingress, provider authenticity as trust source, and explicit rejection of app-user route assumptions.
- `CURRENT_WEBHOOK_ROUTE_ASSUMPTIONS.md` documents the current mismatch baseline that must not define the final public contract (JWT/member/workspace-header gatekeeping on the webhook path).
- This note defines the final public request contract by taking the locked model as authoritative and explicitly excluding the documented mismatch assumptions.

## Route Path Contract
- Public webhook ingress route path is `POST /webhooks/:platform`.
- `:platform` valid values are exactly: `shopify`, `woocommerce`, `amazon`.
- Any other `:platform` value is outside contract.

## Caller Identity Contract
- Valid caller identity is the external commerce provider webhook sender for the selected `:platform`.
- Invalid caller identity includes any app-user/member identity attempting to act as route trust principal.
- App-user identity has no trust role in this route contract.

## Authenticity Contract
- Trust is established only by provider webhook authenticity material defined by the selected provider contract (signature and/or shared secret verification material).
- Route trust verification must validate provider authenticity before callback acceptance.
- The following must never be treated as proof of webhook trust:
  - app-user JWT identity
  - workspace membership context
  - `X-Workspace-Id`
  - any mixed “either provider callback or member-authenticated app route” trust model

## Header Contract
- Required headers: provider-required webhook authenticity/idempotency headers for the selected `:platform`.
- Optional headers: additional provider-sent metadata headers not used as trust source.
- Accepted-but-ignored headers: app-route identity/scope headers that are not part of provider authenticity.
- Explicitly forbidden assumptions:
  - requiring app-route workspace/member headers for webhook authorization
  - requiring app-user auth headers for webhook authorization
- `X-Workspace-Id` in final public contract: **forbidden as trust input** (if present, it does not establish trust or workspace identity).
- `Authorization: Bearer <jwt>` in final public contract: **forbidden as webhook auth mechanism** (not required; if present, not a webhook trust source).

## Payload Contract
- Minimum event identity requirement: callback must carry provider event identity sufficient for idempotency.
- External event identity must come from provider-native webhook identity fields (provider webhook headers and/or provider payload event id fields per platform contract).
- Duplicate detection requires a stable external event identity within resolved webhook scope (workspace + platform + external event id).

## Workspace Resolution Contract
- Workspace is contractually determined from verified provider callback context via internal connection mapping.
- Caller is not allowed to provide trusted workspace identity directly for webhook acceptance.
- Specifically, the mismatch documented in `CURRENT_WEBHOOK_ROUTE_ASSUMPTIONS.md` is explicitly rejected in the final contract: workspace must not be trusted from `X-Workspace-Id` + app-user membership gating on this route.

## Response Contract
- Success means: trusted provider callback accepted and processed under resolved workspace/platform scope.
- Duplicate success means: callback is trusted but already ingested for the same resolved scope/event identity; response is still success with dedupe semantics.
- Invalid or untrusted callback means: caller authenticity cannot be established from provider verification material; callback is rejected.
- Malformed callback means: required route/platform/provider-authenticity/event-identity inputs are missing or invalid for contract requirements; callback is rejected.

## Contract Decisions That Must Not Drift
- Do not reintroduce mixed route semantics where provider callback and member-authenticated app-route assumptions both authorize `POST /webhooks/:platform`.
- Do not treat app-user identity as webhook caller identity.
- Do not require or trust `X-Workspace-Id` for webhook ingress workspace authority.
- Do not require or trust app-user JWT as webhook auth mechanism.
- Keep workspace resolution anchored to verified provider callback -> internal connection mapping.
- Keep idempotency anchored to provider event identity within resolved workspace/platform scope.
