# Webhook Refactor Acceptance Criteria

## Grounding
This note freezes acceptance criteria using only the current repository behavior and locked webhook notes already present in this repo:
- Code-grounded current behavior: `POST /webhooks/:platform` is currently coupled to global JWT middleware + global workspace/member guard flow, and service ingestion currently depends on caller-provided `workspaceId` plus event-id extraction/dedupe behavior.
- Document-grounded target constraints: `WEBHOOK_INGRESS_MODEL.md`, `CURRENT_WEBHOOK_ROUTE_ASSUMPTIONS.md`, `FINAL_WEBHOOK_PUBLIC_REQUEST_CONTRACT.md`, `WEBHOOK_WORKSPACE_RESOLUTION_STRATEGY.md`.
- Verified audit finding (already repeated in those notes): current webhook ingress is ambiguous because provider callbacks are mixed with member-authenticated app-route assumptions.

## Relationship to Existing Webhook Notes
- `WEBHOOK_INGRESS_MODEL.md` defines the single allowed ingress model and trust baseline.
- `CURRENT_WEBHOOK_ROUTE_ASSUMPTIONS.md` defines the current pre-refactor baseline that must no longer govern webhook acceptance.
- `FINAL_WEBHOOK_PUBLIC_REQUEST_CONTRACT.md` defines the locked external request contract that must be matched.
- `WEBHOOK_WORKSPACE_RESOLUTION_STRATEGY.md` defines the locked internal workspace-resolution authority and forbidden trust sources.
- This note is the completion gate: refactor is done only when all criteria below are true simultaneously.

## Reachability Criteria
Done means all of the following are true:
- Provider-native callbacks can reach webhook ingress on `POST /webhooks/:platform` without requiring app-user/member-auth route prerequisites.
- Reachability no longer depends on member-route assumptions such as JWT-derived user identity and workspace membership gating.
- The mixed contract (provider callback semantics + member-auth route semantics on same webhook path) is removed.

## Authenticity Criteria
Done means all of the following are true:
- Untrusted callbacks are rejected when provider authenticity cannot be established by platform-native verification material.
- Trusted callbacks are accepted only when provider authenticity is valid per platform contract.
- App-user identity artifacts are not accepted as webhook authenticity proof.

## Workspace Resolution Criteria
Done means all of the following are true:
- Workspace is resolved only after successful provider authenticity verification.
- Workspace is resolved only via verified provider callback identity mapped through internal platform connection ownership records.
- No caller-supplied workspace assertion is treated as authoritative.
- If provider authenticity is valid but mapping is missing, webhook ingestion does not proceed.
- If mapping is ambiguous or inconsistent, webhook ingestion does not proceed.

## Request Contract Criteria
Done means all of the following are true:
- Final webhook route behavior matches the locked public request contract for path, caller model, authenticity model, payload/event identity expectations, and success/reject semantics.
- Trust for webhook acceptance is controlled only by provider-native verification and provider-native event identity material.
- `X-Workspace-Id` does not control trust or workspace authority for provider-native callbacks.
- `Authorization: Bearer ...` does not control trust or workspace authority for provider-native callbacks.
- No app-route workspace/member assumptions are required for webhook authorization.

## Duplicate Handling Criteria
Done means all of the following are true:
- Duplicate callback handling is explicit, deterministic, and stable for the same resolved `(workspace, platform, externalEventId)` scope.
- Duplicate callbacks intentionally return success semantics (accepted-but-deduped), not accidental behavior.
- Duplicate handling remains anchored to provider-native external event identity inside resolved scope.

## Failure Behavior Criteria
Done means all of the following are true:
- Malformed callbacks (missing/invalid contract-required route/platform/authenticity/event-identity inputs) are explicitly rejected.
- Valid-authenticity callbacks with no resolvable internal workspace mapping are explicitly rejected as unmapped.
- Valid-authenticity callbacks with ambiguous/inconsistent mapping outcomes are explicitly rejected as resolution-integrity failures.
- Failure outcomes are contractually explicit and do not rely on implicit member-auth fallbacks.

## Non-Regression Criteria
Done means all of the following are true:
- Webhook ingress cannot silently revert to member-authenticated route assumptions.
- Future webhook acceptance cannot reintroduce `X-Workspace-Id` as webhook trust/workspace authority.
- Future webhook acceptance cannot reintroduce app-user bearer JWT as provider-callback trust authority.
- The single-model invariant remains enforced: provider-native trust + internal mapping only.

## Required Verification Evidence
Before refactor completion can be claimed, evidence must exist that demonstrates at acceptance level:
- Provider-native callbacks are reachable without member-auth prerequisites.
- Untrusted callbacks are rejected and trusted callbacks are accepted according to provider verification.
- Workspace authority is derived only from verified provider callback mapping; forbidden trust sources are non-authoritative.
- Public webhook request contract behavior matches the locked contract, including forbidden header/auth assumptions.
- Duplicate callbacks produce intentional success-with-dedupe semantics in stable scope.
- Malformed, unmapped, and ambiguous-mapping callbacks each follow explicit reject behavior.
- Non-regression checks show no return of mixed member-auth assumptions on webhook ingress.

## Refactor Completion Rule
The webhook refactor is complete only when every criterion in this note is satisfied and evidenced; partial satisfaction is not completion.
