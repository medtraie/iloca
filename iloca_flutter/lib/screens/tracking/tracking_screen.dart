import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import '../../services/gpswox_service.dart';

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  final MapController _mapController = MapController();

  int? _selectedDeviceId;
  String _periodPreset = 'today'; // '1h' | 'today' | '24h' | '7d' | 'custom'
  DateTime _customFrom = DateTime.now().subtract(const Duration(hours: 24));
  DateTime _customTo = DateTime.now();

  List<HistoryPointModel> _routePoints = [];
  List<DetectedStopModel> _stops = [];
  bool _isLoadingHistory = false;
  String? _errorMessage;

  // Video Trajectory Player state (with Exit 'X' button & reopen dock button)
  bool _showVideoPlayer = true;
  bool _isPlaying = false;
  int _playerIndex = 0;
  Timer? _playbackTimer;

  // Geofence Security Zone
  bool _geofenceActive = false;
  LatLng? _geofenceCenter;
  double _geofenceRadiusMeters = 500;

  // Collapsible Control Panel
  bool _showControlSheet = true;

  @override
  void dispose() {
    _playbackTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadAndTraceHistory(List<GpsDeviceModel> devices) async {
    final targetId = _selectedDeviceId ?? devices.firstOrNull?.id;
    if (targetId == null) return;

    _playbackTimer?.cancel();
    setState(() {
      _selectedDeviceId = targetId;
      _isLoadingHistory = true;
      _errorMessage = null;
      _isPlaying = false;
    });

    final now = DateTime.now();
    late DateTime from;
    late DateTime to;

    switch (_periodPreset) {
      case '1h':
        from = now.subtract(const Duration(hours: 1));
        to = now;
        break;
      case '24h':
        from = now.subtract(const Duration(hours: 24));
        to = now;
        break;
      case '7d':
        from = now.subtract(const Duration(days: 7));
        to = now;
        break;
      case 'custom':
        from = DateTime(_customFrom.year, _customFrom.month, _customFrom.day, 0, 0, 0);
        to = DateTime(_customTo.year, _customTo.month, _customTo.day, 23, 59, 59);
        break;
      case 'today':
      default:
        from = DateTime(now.year, now.month, now.day, 0, 0, 0);
        to = now;
        break;
    }

    try {
      final result = await GpswoxService.instance.getDeviceHistory(
        deviceId: targetId,
        from: from,
        to: to,
      );
      if (!mounted) return;

      setState(() {
        _routePoints = result.points;
        _stops = GpswoxService.instance.detectStops(result.points);
        _playerIndex = 0;
        _showVideoPlayer = true;
        _isLoadingHistory = false;
        if (result.points.isEmpty) {
          _errorMessage =
              'Aucun point historique trouvé pour cette période sur GPSWOX.';
        } else {
          _fitBounds(result.points);
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoadingHistory = false;
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  void _fitBounds(List<HistoryPointModel> pts) {
    if (pts.isEmpty) return;
    try {
      final coords = pts.map((p) => LatLng(p.lat, p.lng)).toList();
      if (coords.length == 1) {
        _mapController.move(coords.first, 16);
      } else {
        _mapController.fitCamera(
          CameraFit.bounds(
            bounds: LatLngBounds.fromPoints(coords),
            padding: const EdgeInsets.all(64),
          ),
        );
      }
    } catch (_) {}
  }

  void _toggleVideoPlayback(double speedMultiplier) {
    if (_routePoints.length < 2) return;

    if (_isPlaying) {
      _playbackTimer?.cancel();
      setState(() => _isPlaying = false);
      return;
    }

    if (_playerIndex >= _routePoints.length - 1) {
      setState(() => _playerIndex = 0);
    }

    setState(() => _isPlaying = true);
    final delayMs = (220 / speedMultiplier).round().clamp(25, 450);

    _playbackTimer = Timer.periodic(Duration(milliseconds: delayMs), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_playerIndex < _routePoints.length - 1) {
        setState(() => _playerIndex++);
        final pt = _routePoints[_playerIndex];
        try {
          _mapController.move(LatLng(pt.lat, pt.lng), _mapController.camera.zoom);
        } catch (_) {}
      } else {
        timer.cancel();
        setState(() => _isPlaying = false);
      }
    });
  }

  Future<void> _pickCustomDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: DateTimeRange(start: _customFrom, end: _customTo),
    );
    if (picked != null) {
      setState(() {
        _periodPreset = 'custom';
        _customFrom = picked.start;
        _customTo = picked.end;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppStateProvider>();
    final devices = state.gpsDevices;

    if (_selectedDeviceId == null && devices.isNotEmpty) {
      _selectedDeviceId = devices.first.id;
    }

    final selectedDevice =
        devices.where((d) => d.id == _selectedDeviceId).firstOrNull;
    final safeIdx = _routePoints.isEmpty
        ? 0
        : _playerIndex.clamp(0, _routePoints.length - 1);
    final currentPt = _routePoints.isNotEmpty ? _routePoints[safeIdx] : null;
    final stats = GpswoxService.instance.computeRouteStats(_routePoints);

    final tileOption = AppConfig.mapLayers.firstWhere(
      (l) => l.id == state.mapLayerId,
      orElse: () => AppConfig.mapLayers.first,
    );

    final center = selectedDevice?.hasValidCoords == true
        ? LatLng(selectedDevice!.lat!, selectedDevice.lng!)
        : const LatLng(33.5731, -7.5898);

    return Stack(
      children: [
        // ── 1. INTERACTIVE MAP CANVAS ──
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: 12.5,
            minZoom: 3,
            maxZoom: 20,
          ),
          children: [
            TileLayer(
              urlTemplate: tileOption.urlTemplate,
              subdomains: tileOption.subdomains,
              maxZoom: tileOption.maxZoom,
              userAgentPackageName: 'com.sft.iloca',
            ),

            // Geofence Security Circle
            if (_geofenceActive && _geofenceCenter != null)
              CircleLayer(
                circles: [
                  CircleMarker(
                    point: _geofenceCenter!,
                    radius: _geofenceRadiusMeters,
                    useRadiusInMeter: true,
                    color: AppTheme2026.neonEmerald.withValues(alpha: 0.16),
                    borderColor: AppTheme2026.neonEmerald,
                    borderStrokeWidth: 2,
                  ),
                ],
              ),

            // Historical Route Traceur
            if (_routePoints.length > 1)
              PolylineLayer(
                polylines: [
                  if (state.traceurGlow)
                    Polyline(
                      points: _routePoints.map((p) => LatLng(p.lat, p.lng)).toList(),
                      strokeWidth: state.traceurWidth * 2.6,
                      color: state.traceurColor.withValues(alpha: 0.25),
                    ),
                  Polyline(
                    points: _routePoints.map((p) => LatLng(p.lat, p.lng)).toList(),
                    strokeWidth: state.traceurWidth * 0.7,
                    color: state.traceurColor.withValues(alpha: 0.35),
                  ),
                  Polyline(
                    points: _routePoints
                        .take(safeIdx + 1)
                        .map((p) => LatLng(p.lat, p.lng))
                        .toList(),
                    strokeWidth: state.traceurWidth,
                    color: state.traceurColor,
                  ),
                ],
              ),

            // Start, End, Stops & Animated Video Player Vehicle Marker
            if (_routePoints.isNotEmpty)
              MarkerLayer(
                markers: [
                  // Start Flag
                  Marker(
                    point: LatLng(_routePoints.first.lat, _routePoints.first.lng),
                    width: 85,
                    height: 32,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme2026.neonEmerald,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Center(
                        child: Text(
                          'DÉPART',
                          style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.w900,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                  ),
                  // End Flag
                  Marker(
                    point: LatLng(_routePoints.last.lat, _routePoints.last.lng),
                    width: 85,
                    height: 32,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme2026.crimsonAlert,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Center(
                        child: Text(
                          'ARRIVÉE',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Stop Markers
                  ..._stops.map(
                    (s) => Marker(
                      point: LatLng(s.lat, s.lng),
                      width: 28,
                      height: 28,
                      child: Tooltip(
                        message: 'Arrêt ${s.durationMinutes} min',
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppTheme2026.amberGold,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Center(
                            child: Text(
                              'P',
                              style: TextStyle(
                                color: Colors.black,
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Current Scrubber Vehicle Position
                  if (currentPt != null)
                    Marker(
                      point: LatLng(currentPt.lat, currentPt.lng),
                      width: 48,
                      height: 48,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: state.traceurColor,
                          border: Border.all(color: Colors.white, width: 2.5),
                          boxShadow: [
                            BoxShadow(
                              color: state.traceurColor.withValues(alpha: 0.7),
                              blurRadius: 14,
                            ),
                          ],
                        ),
                        child: Transform.rotate(
                          angle: currentPt.course * 3.1415926535 / 180,
                          child: const Icon(
                            LucideIcons.navigation,
                            color: Colors.black,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
          ],
        ),

        // ── 2. TOP STUDIO BAR ──
        Positioned(
          top: 12,
          left: 12,
          right: 12,
          child: Row(
            children: [
              SpatialGlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                borderRadius: 16,
                onTap: () => setState(() => _showControlSheet = !_showControlSheet),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      LucideIcons.route,
                      color: AppTheme2026.electricCyan,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _showControlSheet ? 'Masquer Période' : 'Période & Trajets',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              // Geofence quick toggle
              SpatialGlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                borderRadius: 16,
                borderColor: _geofenceActive
                    ? AppTheme2026.neonEmerald.withValues(alpha: 0.6)
                    : null,
                onTap: () {
                  setState(() {
                    _geofenceActive = !_geofenceActive;
                    if (_geofenceActive && selectedDevice?.hasValidCoords == true) {
                      _geofenceCenter =
                          LatLng(selectedDevice!.lat!, selectedDevice.lng!);
                    }
                  });
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      LucideIcons.shieldCheck,
                      size: 16,
                      color: _geofenceActive
                          ? AppTheme2026.neonEmerald
                          : AppTheme2026.textSecondaryDark,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _geofenceActive ? 'Zone Active' : 'Zone Sécurité',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // ── 3. RIGHT DOCK (Map Layers, Traceur Customizer & Reopen Lecteur Vidéo) ──
        Positioned(
          right: 12,
          top: 72,
          child: Column(
            children: [
              SpatialGlassCard(
                padding: const EdgeInsets.all(11),
                borderRadius: 14,
                onTap: () => showModalBottomSheet(
                  context: context,
                  backgroundColor: Colors.transparent,
                  builder: (_) => const MapLayerSwitcherSheet(),
                ),
                child: const Icon(
                  LucideIcons.layers,
                  size: 19,
                  color: AppTheme2026.electricCyan,
                ),
              ),
              const SizedBox(height: 8),
              SpatialGlassCard(
                padding: const EdgeInsets.all(11),
                borderRadius: 14,
                onTap: () => showModalBottomSheet(
                  context: context,
                  backgroundColor: Colors.transparent,
                  isScrollControlled: true,
                  builder: (_) => const TraceurCustomizerSheet(),
                ),
                child: Icon(
                  LucideIcons.palette,
                  size: 19,
                  color: state.traceurColor,
                ),
              ),
              // Reopen Video Player Button when closed via 'X'
              if (_routePoints.isNotEmpty && !_showVideoPlayer) ...[
                const SizedBox(height: 8),
                Tooltip(
                  message: 'Réouvrir le Lecteur Vidéo',
                  child: SpatialGlassCard(
                    padding: const EdgeInsets.all(11),
                    borderRadius: 14,
                    borderColor: AppTheme2026.neonEmerald.withValues(alpha: 0.6),
                    onTap: () => setState(() => _showVideoPlayer = true),
                    child: const Icon(
                      LucideIcons.playCircle,
                      size: 20,
                      color: AppTheme2026.neonEmerald,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),

        // ── 4. PÉRIODE D'ANALYSE & CHARGER L'HISTORIQUE CARD ──
        if (_showControlSheet)
          Positioned(
            top: 66,
            left: 12,
            right: 68,
            child: SpatialGlassCard(
              padding: const EdgeInsets.all(14),
              borderRadius: 22,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Vehicle selector
                  DropdownButtonFormField<int>(
                    value: _selectedDeviceId,
                    isDense: true,
                    decoration: const InputDecoration(
                      labelText: 'Véhicule à analyser (GPSWOX)',
                      prefixIcon: Icon(LucideIcons.car, size: 16),
                    ),
                    items: devices
                        .map(
                          (d) => DropdownMenuItem<int>(
                            value: d.id,
                            child: Text(
                              '${d.name} (${d.speed.round()} km/h)',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (val) => setState(() => _selectedDeviceId = val),
                  ),
                  const SizedBox(height: 10),

                  // Period presets
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final p in const [
                          ('1h', 'Dernière 1h'),
                          ('today', "Aujourd'hui"),
                          ('24h', '24 Heures'),
                          ('7d', '7 Jours'),
                          ('custom', 'Personnalisé'),
                        ])
                          Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ChoiceChip(
                              label: Text(p.$2, style: const TextStyle(fontSize: 11)),
                              selected: _periodPreset == p.$1,
                              onSelected: (_) {
                                if (p.$1 == 'custom') {
                                  _pickCustomDateRange();
                                } else {
                                  setState(() => _periodPreset = p.$1);
                                }
                              },
                            ),
                          ),
                      ],
                    ),
                  ),

                  if (_periodPreset == 'custom')
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: InkWell(
                        onTap: _pickCustomDateRange,
                        child: Text(
                          'Du ${DateFormat('dd/MM/yyyy').format(_customFrom)} au ${DateFormat('dd/MM/yyyy').format(_customTo)} (23:59:59)',
                          style: const TextStyle(
                            color: AppTheme2026.electricCyan,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),

                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isLoadingHistory
                          ? null
                          : () => _loadAndTraceHistory(devices),
                      icon: _isLoadingHistory
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.black,
                              ),
                            )
                          : const Icon(LucideIcons.sparkles, size: 16),
                      label: Text(
                        _isLoadingHistory
                            ? 'Chargement GPSWOX...'
                            : "Charger & Tracer l'Historique",
                      ),
                    ),
                  ),
                  if (_errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(
                          color: AppTheme2026.amberGold,
                          fontSize: 11,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

        // ── 5. FLOATING LECTEUR VIDÉO (WITH EXIT BUTTON 'X') ──
        if (_routePoints.isNotEmpty && _showVideoPlayer)
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: SpatialGlassCard(
              padding: const EdgeInsets.all(14),
              borderRadius: 24,
              borderColor: state.traceurColor.withValues(alpha: 0.55),
              glowColor: state.traceurColor,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      NeonBadge(
                        label: 'LECTEUR VIDÉO TRAJECTOIRE',
                        color: state.traceurColor,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${stats.distanceKm.toStringAsFixed(2)} km • Max ${stats.maxSpeedKmh.round()} km/h • ${_stops.length} arrêts',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme2026.textSecondaryDark,
                          ),
                        ),
                      ),
                      // EXIT / CLOSE BUTTON ('X') requested for Suivi Lecteur Vidéo
                      Tooltip(
                        message: 'Fermer le lecteur vidéo',
                        child: InkWell(
                          borderRadius: BorderRadius.circular(999),
                          onTap: () {
                            _playbackTimer?.cancel();
                            setState(() {
                              _isPlaying = false;
                              _showVideoPlayer = false;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppTheme2026.crimsonAlert.withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppTheme2026.crimsonAlert.withValues(alpha: 0.5),
                              ),
                            ),
                            child: const Icon(
                              LucideIcons.x,
                              size: 15,
                              color: AppTheme2026.crimsonAlert,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => _toggleVideoPlayback(state.playbackSpeed),
                        style: IconButton.styleFrom(
                          backgroundColor: state.traceurColor,
                          foregroundColor: Colors.black,
                        ),
                        icon: Icon(
                          _isPlaying ? LucideIcons.pause : LucideIcons.play,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 6),
                      IconButton(
                        tooltip: 'Réinitialiser au départ',
                        onPressed: () {
                          _playbackTimer?.cancel();
                          setState(() {
                            _isPlaying = false;
                            _playerIndex = 0;
                          });
                        },
                        icon: const Icon(LucideIcons.rotateCcw, size: 16),
                      ),
                      Expanded(
                        child: Slider(
                          value: safeIdx.toDouble(),
                          min: 0,
                          max: (_routePoints.length - 1).clamp(1, 999999).toDouble(),
                          activeColor: state.traceurColor,
                          onChanged: (v) {
                            final idx = v.round().clamp(0, _routePoints.length - 1);
                            setState(() => _playerIndex = idx);
                            final pt = _routePoints[idx];
                            _mapController.move(
                              LatLng(pt.lat, pt.lng),
                              _mapController.camera.zoom,
                            );
                          },
                        ),
                      ),
                      // Speed Multiplier Cycle Button
                      InkWell(
                        onTap: () {
                          const speeds = [1.0, 2.0, 4.0, 8.0];
                          final next = speeds[
                              (speeds.indexOf(state.playbackSpeed) + 1) %
                                  speeds.length];
                          state.setTraceurSettings(speed: next);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white10,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${state.playbackSpeed.toInt()}x',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (currentPt != null)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Point ${safeIdx + 1}/${_routePoints.length} • ${currentPt.timestamp}',
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppTheme2026.textSecondaryDark,
                          ),
                        ),
                        Text(
                          '${currentPt.speed.round()} km/h',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: state.traceurColor,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
