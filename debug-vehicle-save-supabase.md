[OPEN] Debug Session: vehicle-save-supabase

## Symptom
- `Nouveau Véhicule` does not persist vehicle data to Supabase.

## Hypotheses
- H1: Insert is rejected by Supabase RLS or `user_id` constraints.
- H2: Frontend sends an invalid payload shape to `vehiclesRepository.createVehicle()`.
- H3: Repository catches or surfaces the wrong error path, hiding the real failure.
- H4: Optional fields like photos/documents/numeric values break the insert payload.
- H5: Insert succeeds but the UI list refresh path fails afterward.

## Plan
- Add runtime instrumentation only.
- Reproduce the save flow.
- Analyze logs.
- Apply the minimal fix based on evidence.

## Status
- Instrumentation added in save flow.
- Runtime evidence from direct Supabase insert confirms `42501` RLS rejection on `vehicles` inserts.
- Minimal fix applied: explicitly attach authenticated `user_id` in `vehiclesRepository.createVehicle()`.
- Waiting for user verification.
