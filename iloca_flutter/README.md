# iLOCA PRO 2026 — Spatial Flutter App (Android & iOS)

Application mobile **Android & iOS** développée en **Dart / Flutter** avec une architecture **Spatial Glass & Bento Grid 2026** et une **synchronisation bidirectionnelle instantanée (Temps Réel)** avec l'application Web iLOCA via **Supabase Realtime (`postgres_changes`)** et **GPSWOX / SF-Tracker**.

---

## ✨ Les 8 Sections Unifiées (Web + Android + iOS)

1. **`Overview`** : Tableau de bord Bento 2026 avec télémétrie en direct, taux d'occupation, revenus, alertes critiques et accès rapide.
2. **`Clients`** : CRM complet synchronisé en temps réel (`clients` table Supabase), création/édition/suppression instantanée et appel téléphonique direct.
3. **`Véhicules`** : Gestion du parc automobile (`vehicles` table), Liaison GPSWOX en direct (vitesse, contact moteur, statut `disponible` / `loue` / `maintenance`).
4. **`Contrats`** : Gestion des contrats de location (`contracts` table) avec calcul automatique du montant total, reste à payer, et mise à jour automatique du statut du véhicule (`loue` ↔ `disponible`).
5. **`Rapports`** : Intelligence financière 2026 avec graphiques interactifs (`fl_chart`), répartition du parc et classement de rentabilité par véhicule.
6. **`Carte`** :
   - Couches **Google Maps** (`Google Hybride`, `Google Routes`, `Google Satellite`, `Google Relief`, `Spatial Dark 2026`).
   - Bouton **`Activer Suivi & Traceur`** : Démarre le traceur lumineux **exactement à partir du point où le suivi est activé (`DÉPART`)**, suit le véhicule en direct et met à jour le **`Lecteur de trajet` (`🔴 EN DIRECT`)** en continu.
   - Personnalisation artistique du Traceur (couleur néon, épaisseur, halo lumineux, vitesse de lecture).
7. **`Suivi`** :
   - Studio de trajectoire dédié avec sélection de **`Période d'analyse`** (`1h`, `Aujourd'hui`, `24h`, `7j`, `Personnalisé` jusqu'à `23:59:59`).
   - Bouton **`Charger & Tracer l'Historique`** connecté directement à l'API GPSWOX (`get_history`).
   - **`Lecteur Vidéo` flottant** avec bouton **Fermer (`X`)** pour libérer la carte et bouton de réouverture dans le dock latéral.
   - **Zone de Sécurité (Geofence)** dynamique.
8. **`Alertes`** : Centre d'alertes intelligent fusionnant les événements GPSWOX, les excès de vitesse (>110 km/h), les batteries faibles et les retards de contrats.

---

## ⚡ Synchronisation Instantanée Web ↔ Mobile

- Toute modification effectuée sur **Android / iOS** (ajout d'un client, création d'un contrat, changement de statut d'un véhicule) est **immédiatement visible sur le Web** sans rafraîchir la page grâce à [`src/services/realtimeSyncService.ts`](../src/services/realtimeSyncService.ts).
- Toute modification effectuée sur le **Web** est **immédiatement répercutée dans l'application Flutter** grâce au canal WebSocket `iloca-flutter-realtime-2026` dans [`lib/services/supabase_sync_service.dart`](lib/services/supabase_sync_service.dart).

---

## 🚀 Lancer ou Compiler l'Application

### 1. En local (avec Flutter SDK installé)
```bash
cd iloca_flutter
# Génère les fichiers natifs Gradle/Xcode manquants si nécessaire sans écraser lib/
flutter create . --project-name iloca_flutter --org com.sft.iloca --platforms=android,ios
flutter pub get

# Lancer sur Android ou iOS en mode développement (120Hz)
flutter run

# Compiler l'APK Android de production
flutter build apk --release

# Compiler pour iOS (sur macOS)
flutter build ipa --release
```

### 2. Via GitHub Actions (Automatique dans le Cloud)
Le workflow [`.github/workflows/flutter_mobile_build.yml`](../.github/workflows/flutter_mobile_build.yml) compile automatiquement l'**APK Android Release** et le **build iOS** à chaque push sur `main`. Vous pouvez télécharger l'APK prêt à installer directement depuis l'onglet **Actions** de votre dépôt GitHub.
