[OPEN] Tracking runtime debugging session

- Session ID: `tracking-runtime`
- Date: 2026-05-04
- Scope:
  - Trajet video ne fonctionne pas
  - Les vehicules GPSwox ne s'affichent pas sur la carte
  - Ameliorer la fiabilite des fonctionnalites du module tracking
- Status: Hypotheses defined, evidence collection pending

## Symptoms
- Le module `tracking` charge mais certaines fonctions ne marchent pas en execution.
- Les vehicules n'apparaissent pas correctement sur la carte.
- La lecture du trajet video ne fonctionne pas comme attendu.

## Initial hypotheses
- H1: Les donnees GPSwox chargees dans `tracking` ne sont pas normalisees correctement, donc les coordonnees sont absentes ou invalides.
- H2: La selection du vehicule dans `tracking` ne correspond pas toujours a l'identifiant reel du device GPSwox, donc l'historique est demande avec un mauvais `deviceId`.
- H3: Le trajet video ne demarre pas parce que `points` reste vide ou contient moins de 2 points apres chargement de l'historique.
- H4: Le rendu Leaflet de la route/markers est efface ou remplace par une sequence d'effets React qui vide les overlays au mauvais moment.
- H5: Certaines reponses GPSwox reelles ont une forme differente de celle attendue par `useGPSwoxVehiclesOnly.ts` ou `gpswoxService.getDeviceHistory()`, ce qui casse l'affichage sans erreur claire.

## Evidence plan
- Add instrumentation only:
  - Log the GPSwox device payload shape returned to `tracking`
  - Log selected device ID / plate / normalized coordinates
  - Log loaded history count and first/last points
  - Log playback start conditions and overlay draw state

## Next step
- Start debug server
- Add instrumentation points
- Reproduce in browser
- Analyze logs before any business logic fix

## Evidence analysis

### External runtime evidence
- GPSwox login succeeded and returned a valid `user_api_hash`.
- `get_devices` returned 729 devices, with 725 devices having valid non-zero coordinates.
- `get_history` with current app-style params (`from`, `to`) returned HTTP `422`:
  - `The from date field is required.`
  - `The to date field is required.`
  - `The from time field is required.`
  - `The to time field is required.`
- `get_history` succeeded with GPSwox-native params:
  - `from_date=2026-06-12`
  - `from_time=00:00:00`
  - `to_date=2026-06-12`
  - `to_time=23:59:59`
- Successful history payload shape contains grouped records under `items[].items[]`, not a flat root-level list of points.

### Hypothesis status
- H1: CONFIRMED
  - GPSwox history payload shape differs from expected flat array.
- H2: INCONCLUSIVE
  - Device selection mismatch not yet observed in evidence.
- H3: CONFIRMED
  - `points` can remain empty because history request params are wrong and the successful payload still needs nested flattening.
- H4: REJECTED
  - No evidence yet that Leaflet rendering is the primary root cause.
- H5: CONFIRMED
  - Real GPSwox responses differ from assumptions in current history parsing.

## Root cause candidate
- The tracking module sends the wrong history query parameters to GPSwox.
- The history parser expects a flat point array, while GPSwox returns grouped items with nested `items`.
- Vehicles do not appear as live markers on the map because the page currently draws only loaded routes, not device markers for the GPS device list.
