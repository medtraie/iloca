[OPEN] Debug Session: vehicle-save-refresh

## Symptom
- In `Vehicles`, after adding a new vehicle (with photo), the vehicle appears initially.
- After `Actualiser` (page reload), the vehicle/photo disappear.
- Expected: vehicle data and photo should persist in Supabase and reappear after reload.

## Hypotheses (falsifiable)
- H1: Insert fails (RLS / constraints / payload too large), but UI adds optimistic item locally.
- H2: Insert succeeds but `listVehicles()` mapping omits fields (brand/model/registration/photos) so row appears empty and gets filtered out.
- H3: Insert succeeds but photo field is stored in a column that is not read back (schema mismatch).
- H4: Vehicle is created in Supabase but later cleanup/sync logic overwrites or deletes it.
- H5: Refresh uses a different dataset (local fallback / filters) than the create flow.

## Plan
- Add instrumentation only in submit → repository create → repository list.
- Reproduce once (create + refresh).
- Analyze logs and confirm the failing stage.
- Apply minimal fix based on evidence.

## Status
- Evidence: Supabase has at least one `vehicles` row with empty `brand` + null `registration` + empty `photos_urls`, which matches the wipe pattern when updating with partial fields.
- Fix applied: `vehiclesRepository.updateVehicle()` now only updates provided fields (no more overwriting brand/registration/photos/documents with empty defaults).
- Waiting for user verification.
