[OPEN] Debug Session: settings-clear-all

## Symptom
- In Settings → Zone dangereuse → "Effacer toutes les données", it does not remove all app data from Supabase (and/or local).

## Expected
- After confirming, all app data in Supabase (tables used by the app) is cleared, and the UI reflects an empty state after refresh.

## Hypotheses (falsifiable)
- H1: The button only clears localStorage and does not call Supabase delete APIs.
- H2: Supabase deletions are attempted but fail due to RLS / missing session / missing tables.
- H3: Only some tables are cleared; others remain (e.g., contracts/payments) and keep showing data.
- H4: Deletes succeed but the UI keeps cached data and appears unchanged until hard reload.

## Plan
- Add instrumentation only to capture what the button triggers and Supabase responses.
- Collect runtime evidence (direct Supabase calls) to confirm permissions and missing tables.
- Implement minimal, correct clear-all flow based on evidence.

## Status
- Evidence: `supabase.rpc('clear_all_app_data')` returns `PGRST202` (function missing).
- Fix applied:
  - Add RPC `public.clear_all_app_data()` (security definer) to clear all user data across app tables.
  - Wire Settings → "Effacer toutes les données" to call the RPC, then clear localStorage and reload.
- Waiting for user to apply SQL on Supabase and verify.
