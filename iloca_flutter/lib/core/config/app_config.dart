/// 2026 Unified Configuration for iLoca SFT (Web, Android, iOS)
class AppConfig {
  // Supabase Backend Configuration (Shared with Web App)
  static const String supabaseProjectId = 'wypifrsooooeejfckomg';
  static const String supabaseUrl = 'https://wypifrsooooeejfckomg.supabase.co';
  static const String supabasePublishableKey =
      'sb_publishable_jIwo-BIWgvOKbADDiKalbQ_bR2OqH_K';

  // Super Admin Email
  static const String superAdminEmail = 'medoraelis93@gmail.com';

  // Default GPSWOX Telemetry Endpoints
  static const List<String> defaultGpswoxApiCandidates = [
    'http://sf-tracker.pro/api',
    'https://sf-tracker.pro/api',
    'https://trackpremierlocation.com/api',
    'http://trackpremierlocation.com/api',
  ];

  // Google Maps & 2026 Tile Layers
  static const Map<String, MapTileStyle> mapTileStyles = {
    'google_hybrid': MapTileStyle(
      id: 'google_hybrid',
      label: 'Google Maps Hybride',
      description: 'Imagerie satellite + routes et noms en direct',
      urlTemplate:
          'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=fr&gl=MA',
      badge: 'Google',
    ),
    'google_roadmap': MapTileStyle(
      id: 'google_roadmap',
      label: 'Google Maps Plan Pro',
      description: 'Plan vectoriel officiel Google Maps Maroc',
      urlTemplate:
          'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=fr&gl=MA',
      badge: 'Google',
    ),
    'google_traffic': MapTileStyle(
      id: 'google_traffic',
      label: 'Google Maps Trafic Live',
      description: 'Trafic routier et embouteillages en direct',
      urlTemplate:
          'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}&hl=fr&gl=MA',
      badge: 'Trafic',
    ),
    'google_satellite': MapTileStyle(
      id: 'google_satellite',
      label: 'Google Maps Satellite',
      description: 'Photographie satellite pure Google',
      urlTemplate:
          'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=fr&gl=MA',
      badge: 'Satellite',
    ),
    'google_terrain': MapTileStyle(
      id: 'google_terrain',
      label: 'Google Maps Relief',
      description: 'Topographie et relief physique du Maroc',
      urlTemplate:
          'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=fr&gl=MA',
      badge: 'Relief',
    ),
    'cyber_dark': MapTileStyle(
      id: 'cyber_dark',
      label: 'Cyber Dark 2026',
      description: 'Contraste élevé nuit & télémétrie néon',
      urlTemplate:
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      badge: '2026',
    ),
  };
}

class MapTileStyle {
  final String id;
  final String label;
  final String description;
  final String urlTemplate;
  final String badge;

  const MapTileStyle({
    required this.id,
    required this.label,
    required this.description,
    required this.urlTemplate,
    required this.badge,
  });
}
