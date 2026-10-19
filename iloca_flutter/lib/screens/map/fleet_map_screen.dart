import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import '../../services/gpswox_service.dart';

class FleetMapScreen extends StatefulWidget {
  const FleetMapScreen({super.key});

  @override
  State<FleetMapScreen> createState() => _FleetMapScreenState();
}

class _FleetMapScreenState extends State<FleetMapScreen> {
  final MapController _mapController = MapController();

  int? _selectedDeviceId;
  int? _followedDeviceId; // Activer Suivi & Traceur (EN DIRECT)

  // Live Suivi Trail points starting at the moment Suivi is activated
  final List<HistoryPointModel> _liveTrailPoints = [];
  String? _lastAppendedKey;

  // Historical route points (when loading history manually on Carte)
  List<HistoryPointModel> _historyPoints = [];
  List<DetectedStopModel> _detectedStops = [];
  bool _loadingHistory = false;
  String? _historyError;
  String _selectedPreset = 'today';

  // Trajectory Player (works for both Live Suivi and History)
  bool _isPlaying = false;
  int _playbackIndex = 0;
  Timer? _playbackTimer;
  bool _showPlayerHud = true;

  // Fleet drawer & filters
  bool _showFleetSheet = false;
  String _searchQuery = '';
  String _statusFilter = 'all'; // 'all' | 'online' | 'moving'

  @override
  void dispose() {
    _playbackTimer?.cancel();
    super.dispose();
  }

  /// Active trajectory points:
  /// When `Activer Suivi & Traceur` is active on the selected vehicle,
  /// returns `_liveTrailPoints` (starting from the activation point) and updates continuously!
  bool get _isLiveTrailActive =>
      _followedDeviceId != null && _followedDeviceId == _selectedDeviceId;

  List<HistoryPointModel> get _activePoints =>
      _isLiveTrailActive ? _liveTrailPoints : _historyPoints;

  /// Synchronize live vehicle polls into `_liveTrailPoints` when `Suivi & Traceur` is active
  void _syncLiveFollowProgress(List<GpsDeviceModel> devices) {
    if (_followedDeviceId == null) return;
    final followed = devices.where((d) => d.id == _followedDeviceId).firstOrNull;
    if (followed == null || !followed.hasValidCoords) return;

    final nowIso = followed.lastUpdate.isNotEmpty
        ? followed.lastUpdate
        : DateTime.now().toIso8601String();

    if (_liveTrailPoints.isEmpty) {
      final startPt = HistoryPointModel(
        lat: followed.lat!,
        lng: followed.lng!,
        speed: followed.speed,
        course: followed.course,
        timestamp: nowIso,
      );
      _liveTrailPoints.add(startPt);
      _lastAppendedKey = '${followed.lat!.toStringAsFixed(6)}_${followed.lng!.toStringAsFixed(6)}';
      _playbackIndex = 0;
      return;
    }

    final lastPt = _liveTrailPoints.last;
    final movedMeters = GpswoxService.instance.haversineMeters(
      lastPt.lat,
      lastPt.lng,
      followed.lat!,
      followed.lng!,
    );
    final coordKey =
        '${followed.lat!.toStringAsFixed(6)}_${followed.lng!.toStringAsFixed(6)}_${followed.lastUpdate}';

    if (movedMeters >= 2.0 || (coordKey != _lastAppendedKey && lastPt.timestamp != nowIso)) {
      _lastAppendedKey = coordKey;
      final wasAtLatest = _playbackIndex >= _liveTrailPoints.length - 2;
      _liveTrailPoints.add(
        HistoryPointModel(
          lat: followed.lat!,
          lng: followed.lng!,
          speed: followed.speed,
          course: followed.course,
          timestamp: nowIso,
        ),
      );
      if (wasAtLatest && !_isPlaying) {
        _playbackIndex = _liveTrailPoints.length - 1;
      }
      // Keep camera centered on followed vehicle
      try {
        _mapController.move(
          LatLng(followed.lat!, followed.lng!),
          _mapController.camera.zoom < 14 ? 15.5 : _mapController.camera.zoom,
        );
      } catch (_) {}
    }
  }

  void _toggleLiveSuivi(GpsDeviceModel device, AppStateProvider state) {
    _playbackTimer?.cancel();
    setState(() {
      _isPlaying = false;
      if (_followedDeviceId == device.id) {
        // Deactivate Suivi
        _followedDeviceId = null;
        _liveTrailPoints.clear();
        _lastAppendedKey = null;
        state.setFastTrackingMode(false);
      } else {
        // Activate Suivi & Traceur starting from current position
        _selectedDeviceId = device.id;
        _followedDeviceId = device.id;
        _showPlayerHud = true;
        _liveTrailPoints.clear();
        if (device.hasValidCoords) {
          _liveTrailPoints.add(
            HistoryPointModel(
              lat: device.lat!,
              lng: device.lng!,
              speed: device.speed,
              course: device.course,
              timestamp: device.lastUpdate.isNotEmpty
                  ? device.lastUpdate
                  : DateTime.now().toIso8601String(),
            ),
          );
          _lastAppendedKey =
              '${device.lat!.toStringAsFixed(6)}_${device.lng!.toStringAsFixed(6)}_${device.lastUpdate}';
          _playbackIndex = 0;
          try {
            _mapController.move(LatLng(device.lat!, device.lng!), 16.0);
          } catch (_) {}
        }
        state.setFastTrackingMode(true);
      }
    });
  }

  Future<void> _loadHistoryForPreset(String preset) async {
    if (_selectedDeviceId == null) return;
    _playbackTimer?.cancel();
    setState(() {
      _selectedPreset = preset;
      _followedDeviceId = null; // Switch from live follow to historical route
      _loadingHistory = true;
      _historyError = null;
      _isPlaying = false;
    });

    final now = DateTime.now();
    late DateTime from;
    switch (preset) {
      case '1h':
        from = now.subtract(const Duration(hours: 1));
        break;
      case '24h':
        from = now.subtract(const Duration(hours: 24));
        break;
      case '7d':
        from = now.subtract(const Duration(days: 7));
        break;
      case 'today':
      default:
        from = DateTime(now.year, now.month, now.day, 0, 0, 0);
        break;
    }

    try {
      final result = await GpswoxService.instance.getDeviceHistory(
        deviceId: _selectedDeviceId!,
        from: from,
        to: now,
      );
      if (!mounted) return;
      setState(() {
        _historyPoints = result.points;
        _detectedStops = GpswoxService.instance.detectStops(result.points);
        _playbackIndex = result.points.isNotEmpty ? result.points.length - 1 : 0;
        _showPlayerHud = true;
        _loadingHistory = false;
        if (result.points.isEmpty) {
          _historyError = 'Aucun trajet enregistré sur cette période.';
        } else {
          _fitRouteBounds(result.points);
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingHistory = false;
        _historyError = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  void _fitRouteBounds(List<HistoryPointModel> pts) {
    if (pts.isEmpty) return;
    try {
      final latLngs = pts.map((p) => LatLng(p.lat, p.lng)).toList();
      if (latLngs.length == 1) {
        _mapController.move(latLngs.first, 16);
      } else {
        final bounds = LatLngBounds.fromPoints(latLngs);
        _mapController.fitCamera(
          CameraFit.bounds(
            bounds: bounds,
            padding: const EdgeInsets.all(56),
          ),
        );
      }
    } catch (_) {}
  }

  void _togglePlayback(double speedMultiplier) {
    final pts = _activePoints;
    if (pts.length < 2) return;

    if (_isPlaying) {
      _playbackTimer?.cancel();
      setState(() => _isPlaying = false);
      return;
    }

    if (_playbackIndex >= pts.length - 1) {
      setState(() => _playbackIndex = 0);
    }

    setState(() => _isPlaying = true);
    final intervalMs = (240 / speedMultiplier).round().clamp(30, 500);
    _playbackTimer = Timer.periodic(Duration(milliseconds: intervalMs), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final currentPts = _activePoints;
      if (_playbackIndex < currentPts.length - 1) {
        setState(() {
          _playbackIndex++;
        });
      } else {
        timer.cancel();
        setState(() => _isPlaying = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppStateProvider>();
    final devices = state.gpsDevices;

    // Keep live Suivi & Traceur points updated on every GPS poll!
    _syncLiveFollowProgress(devices);

    final selectedDevice = devices.where((d) => d.id == _selectedDeviceId).firstOrNull;
    final activePts = _activePoints;
    final safeIndex = activePts.isEmpty
        ? 0
        : _playbackIndex.clamp(0, activePts.length - 1);
    final currentPlayPoint = activePts.isNotEmpty ? activePts[safeIndex] : null;
    final routeStats = GpswoxService.instance.computeRouteStats(activePts);

    final tileOption = AppConfig.mapLayers.firstWhere(
      (l) => l.id == state.mapLayerId,
      orElse: () => AppConfig.mapLayers.first,
    );

    final filteredDevices = devices.where((d) {
      final matchesSearch = _searchQuery.isEmpty ||
          d.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          d.imei.toLowerCase().contains(_searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (_statusFilter == 'online') return d.online == 'online';
      if (_statusFilter == 'moving') return d.speed > 0 || d.ignition == true;
      return true;
    }).toList();

    final initialCenter = selectedDevice?.hasValidCoords == true
        ? LatLng(selectedDevice!.lat!, selectedDevice.lng!)
        : (devices.where((d) => d.hasValidCoords).isNotEmpty
            ? LatLng(
                devices.firstWhere((d) => d.hasValidCoords).lat!,
                devices.firstWhere((d) => d.hasValidCoords).lng!,
              )
            : const LatLng(33.5731, -7.5898)); // Casablanca default

    return Stack(
      children: [
        // ── 1. FULLSCREEN INTERACTIVE GOOGLE / SPATIAL MAP ──
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: initialCenter,
            initialZoom: 12.5,
            minZoom: 3,
            maxZoom: 20,
            onTap: (_, __) {
              if (_showFleetSheet) {
                setState(() => _showFleetSheet = false);
              }
            },
          ),
          children: [
            TileLayer(
              urlTemplate: tileOption.urlTemplate,
              subdomains: tileOption.subdomains,
              maxZoom: tileOption.maxZoom,
              userAgentPackageName: 'com.sft.iloca',
            ),

            // ── GLOWING TRACEUR POLYLINE (Live Suivi or Historical) ──
            if (activePts.length > 1)
              PolylineLayer(
                polylines: [
                  if (state.traceurGlow)
                    Polyline(
                      points: activePts.map((p) => LatLng(p.lat, p.lng)).toList(),
                      strokeWidth: state.traceurWidth * 2.8,
                      color: state.traceurColor.withValues(alpha: 0.28),
                    ),
                  Polyline(
                    points: activePts.map((p) => LatLng(p.lat, p.lng)).toList(),
                    strokeWidth: state.traceurWidth * 0.7,
                    color: state.traceurColor.withValues(alpha: 0.35),
                  ),
                  // Progressed segment up to current player scrubber index
                  Polyline(
                    points: activePts
                        .take(safeIndex + 1)
                        .map((p) => LatLng(p.lat, p.lng))
                        .toList(),
                    strokeWidth: state.traceurWidth,
                    color: state.traceurColor,
                  ),
                ],
              ),

            // ── START (Départ), END (Arrivée / Position Actuelle), & STOPS MARKERS ──
            if (activePts.isNotEmpty)
              MarkerLayer(
                markers: [
                  // Départ Marker (Start of Live Suivi or Start of History)
                  Marker(
                    point: LatLng(activePts.first.lat, activePts.first.lng),
                    width: 90,
                    height: 36,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme2026.neonEmerald,
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme2026.neonEmerald.withValues(alpha: 0.5),
                            blurRadius: 10,
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.flag, size: 12, color: Colors.black),
                          SizedBox(width: 4),
                          Text(
                            'DÉPART',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Stops Markers (Historical mode)
                  if (!_isLiveTrailActive)
                    ..._detectedStops.map(
                      (stop) => Marker(
                        point: LatLng(stop.lat, stop.lng),
                        width: 30,
                        height: 30,
                        child: Tooltip(
                          message: 'Arrêt (${stop.durationMinutes} min)',
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
                                  fontWeight: FontWeight.w900,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),

                  // Scrubber / Playback Cursor Marker
                  if (currentPlayPoint != null && activePts.length > 1)
                    Marker(
                      point: LatLng(currentPlayPoint.lat, currentPlayPoint.lng),
                      width: 44,
                      height: 44,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: state.traceurColor.withValues(alpha: 0.25),
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: Center(
                          child: Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: state.traceurColor,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),

            // ── LIVE VEHICLE CAPSULES (2026 Spatial Markers) ──
            MarkerLayer(
              markers: devices
                  .where((d) => d.hasValidCoords)
                  .map((device) => _buildVehicleMarker(device, state))
                  .toList(),
            ),
          ],
        ),

        // ── 2. TOP FLOATING TELEMETRY BAR ──
        Positioned(
          top: 12,
          left: 12,
          right: 12,
          child: Row(
            children: [
              // Parc Button
              GestureDetector(
                onTap: () => setState(() => _showFleetSheet = !_showFleetSheet),
                child: SpatialGlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  borderRadius: 16,
                  borderColor: _showFleetSheet
                      ? AppTheme2026.electricCyan.withValues(alpha: 0.6)
                      : null,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        LucideIcons.car,
                        color: AppTheme2026.electricCyan,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Parc (${devices.length})',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme2026.neonEmerald.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '${state.onlineGpsCount} ON',
                          style: const TextStyle(
                            color: AppTheme2026.neonEmerald,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const Spacer(),

              // Live Follow Status Pill when active
              if (_followedDeviceId != null)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: SpatialGlassCard(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                    borderRadius: 999,
                    borderColor: AppTheme2026.crimsonAlert.withValues(alpha: 0.6),
                    glowColor: AppTheme2026.crimsonAlert,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const AnimatedPulseDot(color: AppTheme2026.crimsonAlert, size: 8),
                        const SizedBox(width: 8),
                        Text(
                          'SUIVI & TRACEUR (${_liveTrailPoints.length} pts)',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Refresh GPS Button
              SpatialGlassCard(
                padding: const EdgeInsets.all(10),
                borderRadius: 14,
                onTap: () => state.refreshGpsNow(),
                child: state.isSyncingGps
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTheme2026.electricCyan,
                        ),
                      )
                    : const Icon(
                        LucideIcons.refreshCw,
                        size: 18,
                        color: AppTheme2026.electricCyan,
                      ),
              ),
            ],
          ),
        ),

        // ── 3. RIGHT VERTICAL SPATIAL CONTROL DOCK ──
        Positioned(
          right: 12,
          top: 74,
          child: Column(
            children: [
              _buildDockButton(
                icon: LucideIcons.layers,
                tooltip: 'Fond de carte Google Maps',
                color: AppTheme2026.electricCyan,
                onTap: () => showModalBottomSheet(
                  context: context,
                  backgroundColor: Colors.transparent,
                  builder: (_) => const MapLayerSwitcherSheet(),
                ),
              ),
              const SizedBox(height: 8),
              _buildDockButton(
                icon: LucideIcons.palette,
                tooltip: 'Personnaliser Traceur',
                color: state.traceurColor,
                onTap: () => showModalBottomSheet(
                  context: context,
                  backgroundColor: Colors.transparent,
                  isScrollControlled: true,
                  builder: (_) => const TraceurCustomizerSheet(),
                ),
              ),
              const SizedBox(height: 8),
              _buildDockButton(
                icon: LucideIcons.maximize2,
                tooltip: 'Centrer sur la flotte',
                color: AppTheme2026.textSecondaryDark,
                onTap: () {
                  final valid = devices
                      .where((d) => d.hasValidCoords)
                      .map((d) => LatLng(d.lat!, d.lng!))
                      .toList();
                  if (valid.length > 1) {
                    _mapController.fitCamera(
                      CameraFit.bounds(
                        bounds: LatLngBounds.fromPoints(valid),
                        padding: const EdgeInsets.all(60),
                      ),
                    );
                  } else if (valid.length == 1) {
                    _mapController.move(valid.first, 15);
                  }
                },
              ),
              if (activePts.isNotEmpty && !_showPlayerHud) ...[
                const SizedBox(height: 8),
                _buildDockButton(
                  icon: LucideIcons.playCircle,
                  tooltip: 'Ouvrir Lecteur de trajet',
                  color: AppTheme2026.neonEmerald,
                  onTap: () => setState(() => _showPlayerHud = true),
                ),
              ],
            ],
          ),
        ),

        // ── 4. SELECTED VEHICLE INSPECTOR + ACTIVER SUIVI & TRACEUR ──
        if (selectedDevice != null)
          Positioned(
            left: 12,
            right: 12,
            bottom: (activePts.isNotEmpty && _showPlayerHud) ? 188 : 16,
            child: _buildSelectedVehicleCard(selectedDevice, state),
          ),

        // ── 5. BOTTOM LECTEUR DE TRAJET HUD (LIVE SUIVI OR HISTORICAL) ──
        if (activePts.isNotEmpty && _showPlayerHud)
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: _buildTrajectoryPlayerHud(
              state: state,
              points: activePts,
              safeIndex: safeIndex,
              currentPoint: currentPlayPoint,
              stats: routeStats,
            ),
          ),

        // ── 6. FLEET DRAWER OVERLAY (`Parc`) ──
        if (_showFleetSheet)
          Positioned(
            top: 68,
            left: 12,
            bottom: 16,
            width: 310,
            child: _buildFleetDrawer(filteredDevices, state),
          ),
      ],
    );
  }

  Marker _buildVehicleMarker(GpsDeviceModel device, AppStateProvider state) {
    final isSelected = _selectedDeviceId == device.id;
    final isFollowed = _followedDeviceId == device.id;
    final isMoving = device.speed > 1;
    final isOnline = device.online == 'online';

    final statusColor = isMoving
        ? AppTheme2026.neonEmerald
        : (isOnline ? AppTheme2026.electricCyan : AppTheme2026.textMutedDark);

    return Marker(
      point: LatLng(device.lat!, device.lng!),
      width: isSelected ? 140 : 115,
      height: isSelected ? 66 : 54,
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedDeviceId = device.id;
            _showFleetSheet = false;
          });
          _mapController.move(LatLng(device.lat!, device.lng!), 15.5);
        },
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: isFollowed
                    ? AppTheme2026.crimsonAlert
                    : const Color(0xEB0B1222),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: isSelected ? Colors.white : statusColor,
                  width: isSelected ? 1.6 : 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: (isFollowed ? AppTheme2026.crimsonAlert : statusColor)
                        .withValues(alpha: 0.45),
                    blurRadius: isSelected ? 12 : 6,
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isFollowed ? Colors.white : statusColor,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      device.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  if (device.speed > 0) ...[
                    const SizedBox(width: 4),
                    Text(
                      '${device.speed.round()}km/h',
                      style: const TextStyle(
                        color: AppTheme2026.neonEmerald,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 3),
            Container(
              width: isSelected ? 30 : 24,
              height: isSelected ? 30 : 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: statusColor,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: statusColor.withValues(alpha: 0.6),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Transform.rotate(
                angle: device.course * 3.1415926535 / 180,
                child: const Icon(
                  LucideIcons.navigation,
                  size: 13,
                  color: Colors.black,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDockButton({
    required IconData icon,
    required String tooltip,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: SpatialGlassCard(
        padding: const EdgeInsets.all(11),
        borderRadius: 14,
        onTap: onTap,
        child: Icon(icon, size: 19, color: color),
      ),
    );
  }

  Widget _buildSelectedVehicleCard(GpsDeviceModel device, AppStateProvider state) {
    final isFollowed = _followedDeviceId == device.id;

    return SpatialGlassCard(
      padding: const EdgeInsets.all(14),
      borderRadius: 22,
      borderColor: isFollowed
          ? AppTheme2026.crimsonAlert.withValues(alpha: 0.6)
          : AppTheme2026.electricCyan.withValues(alpha: 0.4),
      glowColor: isFollowed ? AppTheme2026.crimsonAlert : AppTheme2026.electricCyan,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (isFollowed
                          ? AppTheme2026.crimsonAlert
                          : AppTheme2026.electricCyan)
                      .withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  isFollowed ? LucideIcons.radio : LucideIcons.car,
                  color: isFollowed
                      ? AppTheme2026.crimsonAlert
                      : AppTheme2026.electricCyan,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            device.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        NeonBadge(
                          label: '${device.speed.round()} km/h',
                          color: device.speed > 0
                              ? AppTheme2026.neonEmerald
                              : AppTheme2026.electricCyan,
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      device.address?.isNotEmpty == true
                          ? device.address!
                          : '${device.lat?.toStringAsFixed(5)}, ${device.lng?.toStringAsFixed(5)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme2026.textSecondaryDark,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {
                  setState(() {
                    if (_followedDeviceId == device.id) {
                      _followedDeviceId = null;
                      state.setFastTrackingMode(false);
                    }
                    _selectedDeviceId = null;
                  });
                },
                icon: const Icon(LucideIcons.x, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Action Row: Activer Suivi & Traceur + Quick History Presets
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // ACTIVER SUIVI & TRACEUR BUTTON
                ElevatedButton.icon(
                  onPressed: () => _toggleLiveSuivi(device, state),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isFollowed
                        ? AppTheme2026.crimsonAlert
                        : AppTheme2026.neonEmerald,
                    foregroundColor: isFollowed ? Colors.white : Colors.black,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                  icon: Icon(
                    isFollowed ? LucideIcons.square : LucideIcons.navigation,
                    size: 15,
                  ),
                  label: Text(
                    isFollowed
                        ? 'Arrêter Suivi (${_liveTrailPoints.length} pts)'
                        : 'Activer Suivi & Traceur',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                  ),
                ),
                const SizedBox(width: 8),

                // Quick History Period Buttons
                for (final entry in const [
                  ('today', "Aujourd'hui"),
                  ('1h', '1h'),
                  ('24h', '24h'),
                  ('7d', '7j'),
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: OutlinedButton(
                      onPressed: _loadingHistory
                          ? null
                          : () => _loadHistoryForPreset(entry.$1),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        side: BorderSide(
                          color: (!_isLiveTrailActive && _selectedPreset == entry.$1 && _historyPoints.isNotEmpty)
                              ? AppTheme2026.electricCyan
                              : Colors.white24,
                        ),
                      ),
                      child: Text(
                        entry.$2,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: (!_isLiveTrailActive && _selectedPreset == entry.$1 && _historyPoints.isNotEmpty)
                              ? AppTheme2026.electricCyan
                              : Colors.white70,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          if (_loadingHistory)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: LinearProgressIndicator(color: AppTheme2026.electricCyan),
            ),
          if (_historyError != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                _historyError!,
                style: const TextStyle(
                  color: AppTheme2026.amberGold,
                  fontSize: 11,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTrajectoryPlayerHud({
    required AppStateProvider state,
    required List<HistoryPointModel> points,
    required int safeIndex,
    required HistoryPointModel? currentPoint,
    required RouteStatsModel stats,
  }) {
    return SpatialGlassCard(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      borderRadius: 22,
      borderColor: _isLiveTrailActive
          ? AppTheme2026.crimsonAlert.withValues(alpha: 0.55)
          : state.traceurColor.withValues(alpha: 0.45),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              NeonBadge(
                label: _isLiveTrailActive ? '🔴 EN DIRECT (SUIVI)' : 'LECTEUR DE TRAJET',
                color: _isLiveTrailActive
                    ? AppTheme2026.crimsonAlert
                    : state.traceurColor,
                pulsing: _isLiveTrailActive,
              ),
              const SizedBox(width: 8),
              Text(
                '${stats.distanceKm.toStringAsFixed(2)} km • Max ${stats.maxSpeedKmh.round()} km/h • ${points.length} pts',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppTheme2026.textSecondaryDark,
                ),
              ),
              const Spacer(),
              IconButton(
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () => setState(() => _showPlayerHud = false),
                icon: const Icon(LucideIcons.x, size: 16),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              IconButton(
                onPressed: points.length < 2
                    ? null
                    : () => _togglePlayback(state.playbackSpeed),
                style: IconButton.styleFrom(
                  backgroundColor: state.traceurColor.withValues(alpha: 0.2),
                ),
                icon: Icon(
                  _isPlaying ? LucideIcons.pause : LucideIcons.play,
                  size: 18,
                  color: state.traceurColor,
                ),
              ),
              Expanded(
                child: Slider(
                  value: safeIndex.toDouble(),
                  min: 0,
                  max: (points.length - 1).clamp(1, 999999).toDouble(),
                  activeColor: state.traceurColor,
                  onChanged: points.length < 2
                      ? null
                      : (v) {
                          final idx = v.round().clamp(0, points.length - 1);
                          setState(() => _playbackIndex = idx);
                          final pt = points[idx];
                          _mapController.move(
                            LatLng(pt.lat, pt.lng),
                            _mapController.camera.zoom,
                          );
                        },
                ),
              ),
              if (currentPoint != null)
                NeonBadge(
                  label: '${currentPoint.speed.round()} km/h',
                  color: AppTheme2026.neonEmerald,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFleetDrawer(List<GpsDeviceModel> devices, AppStateProvider state) {
    return SpatialGlassCard(
      padding: const EdgeInsets.all(14),
      borderRadius: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.radar, color: AppTheme2026.electricCyan, size: 18),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Flotte GPS en Direct',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: () => setState(() => _showFleetSheet = false),
                icon: const Icon(LucideIcons.x, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            onChanged: (v) => setState(() => _searchQuery = v),
            decoration: const InputDecoration(
              hintText: 'Rechercher véhicule ou IMEI...',
              prefixIcon: Icon(LucideIcons.search, size: 16),
              isDense: true,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (final f in const [
                ('all', 'Tous'),
                ('online', 'En ligne'),
                ('moving', 'En route'),
              ])
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(f.$2, style: const TextStyle(fontSize: 11)),
                    selected: _statusFilter == f.$1,
                    onSelected: (_) => setState(() => _statusFilter = f.$1),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.separated(
              itemCount: devices.length,
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (context, idx) {
                final d = devices[idx];
                final isSelected = _selectedDeviceId == d.id;
                final isFollowed = _followedDeviceId == d.id;
                return InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () {
                    setState(() {
                      _selectedDeviceId = d.id;
                      _showFleetSheet = false;
                    });
                    if (d.hasValidCoords) {
                      _mapController.move(LatLng(d.lat!, d.lng!), 16);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme2026.electricCyan.withValues(alpha: 0.14)
                          : Colors.white.withValues(alpha: 0.03),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected
                            ? AppTheme2026.electricCyan
                            : Colors.white10,
                      ),
                    ),
                    child: Row(
                      children: [
                        AnimatedPulseDot(
                          color: d.speed > 0
                              ? AppTheme2026.neonEmerald
                              : (d.online == 'online'
                                  ? AppTheme2026.electricCyan
                                  : Colors.grey),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                d.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                '${d.speed.round()} km/h • ${d.online.toUpperCase()}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppTheme2026.textSecondaryDark,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'Activer Suivi & Traceur',
                          onPressed: () => _toggleLiveSuivi(d, state),
                          icon: Icon(
                            LucideIcons.navigation,
                            size: 16,
                            color: isFollowed
                                ? AppTheme2026.crimsonAlert
                                : AppTheme2026.neonEmerald,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
