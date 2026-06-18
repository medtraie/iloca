[OPEN] Debug Session: recette-payment-refresh

## Symptom
- In `Recette`, after `Regler` -> `Enregistrer un Paiement`, the contracts table does not refresh correctly.
- `reste a payer` remains stale or incorrect.

## Hypotheses
- H1: Payment insert succeeds, but `Recette` does not refetch contracts/payments.
- H2: `reste a payer` is computed from stale contract fields instead of payments aggregation.
- H3: Payment insert fails or partially fails, then the page shows a generic load error.
- H4: The page reload path reads from a missing or wrong Supabase table/repository.
- H5: State updates happen, but memoized or derived rows are not recomputed after payment save.

## Plan
- Add instrumentation only in payment save and recette refresh flow.
- Reproduce once.
- Analyze logs and identify the failing stage.
- Apply the minimal fix and verify.

## Status
- Instrumentation added in payment dialog, recette payment flow, and payments repository.
- Runtime evidence from browser shows repeated `contracts`/`payments` fetches ending with `ERR_INSUFFICIENT_RESOURCES`.
- Minimal fix applied:
  - stabilize `useContracts.fetchContracts` with `useCallback`
  - stabilize `Recette.fetchData` with `useCallback`
  - await refresh after payment create
  - optimistic local `payments` state update after payment create
  - explicit `user_id` and session check in `paymentsRepository.create`
- Waiting for user verification.
