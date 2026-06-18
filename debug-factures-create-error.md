[OPEN] Debug Session: factures-create-error

## Symptom
- In `Factures`, clicking the action to create/generate the invoice triggers toast: "Erreur lors de la création de la facture".

## Hypotheses
- H1: Insert into `invoices`/`factures` table fails due to RLS / missing session / constraint.
- H2: The code writes to a wrong/missing table name (PGRST205) or schema mismatch.
- H3: Payload contains invalid types (numeric/text/date) or missing required fields.
- H4: The flow creates an invoice but fails on subsequent steps (PDF generation / items insert) and rolls back UI.
- H5: Error is swallowed and only a generic toast is shown; underlying supabase error is not surfaced.

## Plan
- Add runtime instrumentation only around invoice creation path (UI + repository).
- Reproduce once.
- Read logs and confirm the failing stage.
- Apply minimal fix based on evidence.

## Status
- Evidence: Supabase returns `PGRST205` ("Could not find the table 'public.invoices' in the schema cache") when querying `invoices`.
- Instrumentation added in `invoicesRepository` to capture runtime errors from the UI.
- Fix prepared: create `public.invoices` table + RLS policies via migration `20260618100000_create_invoices.sql`.
- Waiting for user to apply SQL on Supabase and verify.
