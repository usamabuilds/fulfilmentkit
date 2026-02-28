/**
 * Toast triggering rules (locked):
 * - Toast only for user-triggered actions (mutations).
 * - No toasts for background queries.
 * - Sync triggered: success toast after API accepts request.
 * - Failures: show error toast on mutation error.
 * - AI failures: toast only when user clicks an AI action and it fails.
 */
