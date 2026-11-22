import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import '../../services/gpswox_service.dart';

/// 6. GPS LIVE / MAP SCREEN — Obsidian & Gold 2026 Luxury Telemetry
class FleetMapScreen extends StatefulWidget {
  final AppStateProvider appState;

  const FleetMapScreen({super.key, required this.appState});

  @override
  State<FleetMapScreen> createState() => _FleetMapScreenState();
}

class _FleetMapScreenState extends State<FleetMapScreen> {
  final MapController _mapController = MapController();

  String _mapLayerId = 'google_roadmap';
  String? _selectedDeviceId;
  String? _followedDeviceId; // Activer Suivi & Traceur (EN DIRECT)
  bool _cardHidden = false;

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
  double _playbackSpeed = 1.0;
  Timer? _playbackTimer;
  bool _showPlayerHud = true;

  // Fleet drawer & filters
  bool _showFleetSheet = false;
  String _searchQuery = '';
  String _statusFilter = 'all'; // 'all' | 'online' | 'moving'

  void _onStateChanged() {
    final extId = widget.appState.selectedGpsDeviceId;
    if (extId != null && extId != _selectedDeviceId) {
      _selectedDeviceId = extId;
      _cardHidden = false;
      final match = widget.appState.gpsDevices.where((d) => d.id == extId).firstOrNull;
      if (match != null && match.hasValidPosition) {
        try {
          _mapController.move(LatLng(match.lat, match.lng), 15.5);
        } catch (_) {}
      }
    }
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    widget.appState.addListener(_onStateChanged);
    _selectedDeviceId = widget.appState.selectedGpsDeviceId;
    if (widget.appState.gpsDevices.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        widget.appState.refreshGpsTelemetry();
      });
    }
  }

  @override
  void dispose() {
    widget.appState.removeListener(_onStateChanged);
    _playbackTimer?.cancel();
    super.dispose();
  }

  Future<void> _openGoogleMapsDirections(GpsDeviceModel device) async {
    if (!device.hasValidPosition) return;
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${device.lat},${device.lng}',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  bool get _isLiveTrailActive =>
      _followedDeviceId != null && _followedDeviceId == _selectedDeviceId;

  List<HistoryPointModel> get _activePoints =>
      _isLiveTrailActive ? _liveTrailPoints : _historyPoints;

  /// Synchronize live vehicle polls into `_liveTrailPoints` when `Suivi & Traceur` is active
  void _syncLiveFollowProgress(List<GpsDeviceModel> devices) {
    if (_followedDeviceId == null) return;
    final followed =
        devices.where((d) => d.id == _followedDeviceId).firstOrNull;
    if (followed == null || !followed.hasValidPosition) return;

    final nowMs = DateTime.now().millisecondsSinceEpoch;

    if (_liveTrailPoints.isEmpty) {
      final startPt = HistoryPointModel(
        lat: followed.lat,
        lng: followed.lng,
        speed: followed.speed,
        timestamp: nowMs,
      );
      _liveTrailPoints.add(startPt);
      _lastAppendedKey =
          '${followed.lat.toStringAsFixed(6)}_${followed.lng.toStringAsFixed(6)}';
      _playbackIndex = 0;
      return;
    }

    final lastPt = _liveTrailPoints.last;
    final movedKm = GpswoxService.haversineKm(
      lastPt.lat,
      lastPt.lng,
      followed.lat,
      followed.lng,
    );
    final movedMeters = movedKm * 1000.0;
    final coordKey =
        '${followed.lat.toStringAsFixed(6)}_${followed.lng.toStringAsFixed(6)}_${followed.lastUpdate}';

    if (movedMeters >= 2.0 || coordKey != _lastAppendedKey) {
      _lastAppendedKey = coordKey;
      final wasAtLatest = _playbackIndex >= _liveTrailPoints.length - 2;
      _liveTrailPoints.add(
        HistoryPointModel(
          lat: followed.lat,
          lng: followed.lng,
          speed: followed.speed,
          timestamp: nowMs,
        ),
      );
      if (wasAtLatest && !_isPlaying) {
        _playbackIndex = _liveTrailPoints.length - 1;
      }
      try {
        _mapController.move(
          LatLng(followed.lat, followed.lng),
          _mapController.camera.zoom < 14 ? 15.5 : _mapController.camera.zoom,
        );
      } catch (_) {}
    }
  }

  void _toggleLiveSuivi(GpsDeviceModel device) {
    _playbackTimer?.cancel();
    setState(() {
      _isPlaying = false;
      if (_followedDeviceId == device.id) {
        _followedDeviceId = null;
        _liveTrailPoints.clear();
        _lastAppendedKey = null;
        widget.appState.setFastGpsPolling(false);
      } else {
        _selectedDeviceId = device.id;
        _followedDeviceId = device.id;
        _showPlayerHud = true;
        _liveTrailPoints.clear();
        if (device.hasValidPosition) {
          _liveTrailPoints.add(
            HistoryPointModel(
              lat: device.lat,
              lng: device.lng,
              speed: device.speed,
              timestamp: DateTime.now().millisecondsSinceEpoch,
            ),
          );
          _lastAppendedKey =
              '${device.lat.toStringAsFixed(6)}_${device.lng.toStringAsFixed(6)}_${device.lastUpdate}';
          _playbackIndex = 0;
          try {
            _mapController.move(LatLng(device.lat, device.lng), 16.0);
          } catch (_) {}
        }
        widget.appState.setFastGpsPolling(true);
      }
    });
  }

  Future<void> _loadHistoryForPreset(
    String preset,
    GpsDeviceModel? selectedDevice,
  ) async {
    if (_selectedDeviceId == null) return;
    _playbackTimer?.cancel();
    setState(() {
      _selectedPreset = preset;
      _followedDeviceId = null;
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
      final points = await GpswoxService.getDeviceHistory(
        deviceId: _selectedDeviceId!,
        from: from,
        to: now,
        fallbackDevice: selectedDevice,
      );
      if (!mounted) return;
      setState(() {
        _historyPoints = points;
        _detectedStops = GpswoxService.detectStops(points);
        _playbackIndex = points.isNotEmpty ? points.length - 1 : 0;
        _showPlayerHud = true;
        _loadingHistory = false;
        if (points.isEmpty) {
          _historyError = 'Aucun trajet enregistré sur cette période.';
        } else {
          _fitRouteBounds(points);
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

  void _togglePlayback() {
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
    final intervalMs = (240 / _playbackSpeed).round().clamp(30, 500);
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
    final state = widget.appState;
    final devices = state.gpsDevices;

    // Keep live Suivi & Traceur points updated on every GPS poll!
    _syncLiveFollowProgress(devices);

    final selectedDevice =
        devices.where((d) => d.id == _selectedDeviceId).firstOrNull;
    final activePts = _activePoints;
    final safeIndex =
        activePts.isEmpty ? 0 : _playbackIndex.clamp(0, activePts.length - 1);
    final currentPlayPoint =
        activePts.isNotEmpty ? activePts[safeIndex] : null;
    final routeStats = GpswoxService.computeRouteStats(activePts);

    final tileOption = AppConfig.mapTileStyles[_mapLayerId] ??
        AppConfig.mapTileStyles['google_hybrid']!;

    final filteredDevices = devices.where((d) {
      final matchesSearch = _searchQuery.isEmpty ||
          d.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          d.plate.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          d.imei.toLowerCase().contains(_searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (_statusFilter == 'online') return d.online;
      if (_statusFilter == 'moving') return d.speed > 0 || d.ignition;
      return true;
    }).toList();

    final validDevices = devices.where((d) => d.hasValidPosition).toList();
    final effectiveSelected = selectedDevice ??
        (validDevices.isNotEmpty ? validDevices.first : devices.firstOrNull);
    final initialCenter = effectiveSelected?.hasValidPosition == true
        ? LatLng(effectiveSelected!.lat, effectiveSelected.lng)
        : (validDevices.isNotEmpty
            ? LatLng(validDevices.first.lat, validDevices.first.lng)
            : const LatLng(33.5731, -7.5898));

    final onlineCount = devices.where((d) => d.online).length;

    return Column(
      children: [
        // ── CANVAS TOP HORIZONTAL VEHICLE SELECTOR STRIP ──
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            color: const Color(0xF20B0D12),
            border: Border(
              bottom: BorderSide(color: AppColors2026.gold.withOpacity(0.16)),
            ),
          ),
          child: devices.isEmpty
              ? Row(
                  children: [
                    const AnimatedPulseDot(color: AppColors2026.goldLight, size: 7),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        state.isGpsSyncing
                            ? 'Connexion aux satellites GPSWOX / Supabase...'
                            : 'Aucun traceur GPS actif • Appuyez sur Actualiser',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors2026.textSecondary,
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () => state.refreshGpsTelemetry(),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          gradient: AppColors2026.goldGradient,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Actualiser',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w900,
                            color: AppColors2026.obsidian,
                          ),
                        ),
                      ),
                    ),
                  ],
                )
              : SizedBox(
                  height: 34,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: devices.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (ctx, i) {
                      final car = devices[i];
                      final isAct = effectiveSelected?.id == car.id;
                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedDeviceId = car.id;
                            _cardHidden = false;
                          });
                          state.selectGpsDevice(car.id);
                          if (car.hasValidPosition) {
                            try {
                              _mapController.move(LatLng(car.lat, car.lng), 15.5);
                            } catch (_) {}
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            gradient: isAct ? AppColors2026.goldGradient : null,
                            color: isAct ? null : AppColors2026.surfaceInput,
                            borderRadius: BorderRadius.circular(999),
                            border: isAct
                                ? null
                                : Border.all(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6.5,
                                height: 6.5,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: car.speed > 0
                                      ? (isAct ? AppColors2026.obsidian : AppColors2026.emeraldNeon)
                                      : (isAct ? AppColors2026.obsidian.withOpacity(0.55) : AppColors2026.textMuted),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                car.name,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: isAct ? AppColors2026.obsidian : const Color(0xFFE2E8F0),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
        ),
        Expanded(
          child: Stack(
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
              maxZoom: 20,
              userAgentPackageName: 'com.sft.iloca',
            ),

            // ── GLOWING TRACEUR POLYLINE (Live Suivi or Historical) ──
            if (activePts.length > 1)
              PolylineLayer(
                polylines: [
                  if (state.tracerGlow)
                    Polyline(
                      points:
                          activePts.map((p) => LatLng(p.lat, p.lng)).toList(),
                      strokeWidth: state.tracerWeight * 2.8,
                      color: state.tracerColor.withOpacity(0.28),
                    ),
                  Polyline(
                    points:
                        activePts.map((p) => LatLng(p.lat, p.lng)).toList(),
                    strokeWidth: state.tracerWeight * 0.7,
                    color: state.tracerColor.withOpacity(0.35),
                  ),
                  Polyline(
                    points: activePts
                        .take(safeIndex + 1)
                        .map((p) => LatLng(p.lat, p.lng))
                        .toList(),
                    strokeWidth: state.tracerWeight,
                    color: state.tracerColor,
                  ),
                ],
              ),

            // ── START (Départ), STOPS, & SCRUBBER CURSOR ──
            if (activePts.isNotEmpty)
              MarkerLayer(
                markers: [
                  Marker(
                    point: LatLng(activePts.first.lat, activePts.first.lng),
                    width: 90,
                    height: 36,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors2026.emeraldNeon,
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors2026.emeraldNeon.withOpacity(0.5),
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
                  if (!_isLiveTrailActive)
                    ..._detectedStops.map(
                      (stop) => Marker(
                        point: LatLng(stop.lat, stop.lng),
                        width: 30,
                        height: 30,
                        child: Tooltip(
                          message: 'Arrêt (${stop.durationMin} min)',
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppColors2026.amberSolar,
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
                  if (currentPlayPoint != null && activePts.length > 1)
                    Marker(
                      point: LatLng(currentPlayPoint.lat, currentPlayPoint.lng),
                      width: state.tracerSize,
                      height: state.tracerSize,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: state.tracerColor.withOpacity(0.25),
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: Center(
                          child: Container(
                            width: state.tracerSize * 0.4,
                            height: state.tracerSize * 0.4,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: state.tracerColor,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),

            // ── LIVE VEHICLE CAPSULES ──
            MarkerLayer(
              markers: validDevices
                  .map((device) => _buildVehicleMarker(device))
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
              Flexible(
                child: GestureDetector(
                  onTap: () => setState(() => _showFleetSheet = !_showFleetSheet),
                  child: SpatialGlassCard(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 9,
                    ),
                    borderRadius: 16,
                    borderColor: _showFleetSheet
                        ? AppColors2026.cyanNeon.withOpacity(0.6)
                        : null,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          LucideIcons.car,
                          color: AppColors2026.cyanNeon,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            'Parc (${devices.length})',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors2026.emeraldNeon.withOpacity(0.18),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '$onlineCount ON',
                            style: const TextStyle(
                              color: AppColors2026.emeraldNeon,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (_followedDeviceId != null)
                Flexible(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: SpatialGlassCard(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                      borderRadius: 999,
                      borderColor: AppColors2026.roseLaser.withOpacity(0.6),
                      glowColor: AppColors2026.roseLaser,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const AnimatedPulseDot(
                            color: AppColors2026.roseLaser,
                            size: 8,
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              'SUIVI (${_liveTrailPoints.length})',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 10.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else
                const Spacer(),
              SpatialGlassCard(
                padding: const EdgeInsets.all(10),
                borderRadius: 14,
                onTap: () => state.refreshGpsTelemetry(),
                child: state.isSyncing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors2026.cyanNeon,
                        ),
                      )
                    : const Icon(
                        LucideIcons.refreshCw,
                        size: 18,
                        color: AppColors2026.cyanNeon,
                      ),
              ),
            ],
          ),
        ),

        // ── 3. RIGHT VERTICAL LUXURY CONTROL DOCK (Zoom +/−, Layers, Traceur, Center) ──
        Positioned(
          right: 12,
          top: 66,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.44,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
              _buildDockButton(
                icon: LucideIcons.plus,
                tooltip: 'Zoom avant',
                color: AppColors2026.goldLight,
                onTap: () {
                  try {
                    _mapController.move(
                      _mapController.camera.center,
                      (_mapController.camera.zoom + 1.2).clamp(3, 20),
                    );
                  } catch (_) {}
                },
              ),
              const SizedBox(height: 6),
              _buildDockButton(
                icon: LucideIcons.minus,
                tooltip: 'Zoom arrière',
                color: AppColors2026.goldLight,
                onTap: () {
                  try {
                    _mapController.move(
                      _mapController.camera.center,
                      (_mapController.camera.zoom - 1.2).clamp(3, 20),
                    );
                  } catch (_) {}
                },
              ),
              const SizedBox(height: 6),
              _buildDockButton(
                icon: LucideIcons.layers,
                tooltip: 'Fond de carte Satellite / Google Maps',
                color: AppColors2026.goldLight,
                onTap: () => showModalBottomSheet(
                  context: context,
                  builder: (_) => MapLayerSwitcherSheet(
                    currentLayerId: _mapLayerId,
                    onSelectLayer: (id) => setState(() => _mapLayerId = id),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              _buildDockButton(
                icon: LucideIcons.palette,
                tooltip: 'Personnaliser Traceur',
                color: state.tracerColor,
                onTap: () => showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => TraceurCustomizerSheet(
                    selectedColor: state.tracerColor,
                    weight: state.tracerWeight,
                    markerSize: state.tracerSize,
                    glow: state.tracerGlow,
                    onColorChanged: state.setTracerColor,
                    onWeightChanged: state.setTracerWeight,
                    onSizeChanged: state.setTracerSize,
                    onGlowChanged: state.setTracerGlow,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              _buildDockButton(
                icon: LucideIcons.maximize2,
                tooltip: 'Centrer sur la flotte',
                color: AppColors2026.textSecondary,
                onTap: () {
                  final coords =
                      validDevices.map((d) => LatLng(d.lat, d.lng)).toList();
                  if (coords.length > 1) {
                    _mapController.fitCamera(
                      CameraFit.bounds(
                        bounds: LatLngBounds.fromPoints(coords),
                        padding: const EdgeInsets.all(60),
                      ),
                    );
                  } else if (coords.length == 1) {
                    _mapController.move(coords.first, 15);
                  }
                },
              ),
              if (activePts.isNotEmpty && !_showPlayerHud) ...[
                const SizedBox(height: 6),
                _buildDockButton(
                  icon: LucideIcons.playCircle,
                  tooltip: 'Ouvrir Lecteur de trajet',
                  color: AppColors2026.emeraldNeon,
                  onTap: () => setState(() => _showPlayerHud = true),
                ),
              ],
            ],
          ),
            ),
          ),
        ),

        // ── 4. SELECTED VEHICLE TELEMETRY CARD (OR COLLAPSED PILL) ──
        if (effectiveSelected != null && _cardHidden)
          Positioned(
            right: 12,
            bottom: (activePts.isNotEmpty && _showPlayerHud) ? 200 : 88,
            child: GestureDetector(
              onTap: () => setState(() => _cardHidden = false),
              child: SpatialGlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                borderRadius: 999,
                borderColor: AppColors2026.gold.withOpacity(0.45),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const AnimatedPulseDot(color: AppColors2026.emeraldNeon, size: 7),
                    const SizedBox(width: 8),
                    Text(
                      'Afficher fiche (${effectiveSelected.name.split(' ').first}) ▲',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppColors2026.goldLight,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        if (effectiveSelected != null && !_cardHidden)
          Positioned(
            left: 12,
            right: 12,
            bottom: (activePts.isNotEmpty && _showPlayerHud) ? 200 : 88,
            child: _buildSelectedVehicleCard(effectiveSelected),
          ),

        // ── 5. BOTTOM LECTEUR DE TRAJET HUD (LIVE SUIVI OR HISTORICAL) ──
        if (activePts.isNotEmpty && _showPlayerHud)
          Positioned(
            left: 12,
            right: 12,
            bottom: 86,
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
            top: 64,
            left: 12,
            bottom: 88,
            width: 300,
            child: _buildFleetDrawer(filteredDevices),
          ),
            ],
          ),
        ),
      ],
    );
  }

  Marker _buildVehicleMarker(GpsDeviceModel device) {
    final isSelected = _selectedDeviceId == device.id;
    final isFollowed = _followedDeviceId == device.id;
    final statusColor = device.statusColor;

    return Marker(
      point: LatLng(device.lat, device.lng),
      width: isSelected ? 148 : 120,
      height: isSelected ? 74 : 62,
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedDeviceId = device.id;
            _showFleetSheet = false;
          });
          _mapController.move(LatLng(device.lat, device.lng), 15.5);
        },
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: isFollowed
                    ? AppColors2026.roseLaser
                    : const Color(0xEB0B1222),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: isSelected ? Colors.white : statusColor,
                  width: isSelected ? 1.6 : 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color:
                        (isFollowed ? AppColors2026.roseLaser : statusColor)
                            .withOpacity(0.45),
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
                        color: AppColors2026.emeraldNeon,
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
                    color: statusColor.withOpacity(0.6),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: const Icon(
                LucideIcons.navigation,
                size: 13,
                color: Colors.black,
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

  Widget _buildSelectedVehicleCard(GpsDeviceModel device) {
    final isFollowed = _followedDeviceId == device.id;

    return SpatialGlassCard(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
      borderRadius: 22,
      borderColor: isFollowed
          ? AppColors2026.roseLaser.withOpacity(0.6)
          : AppColors2026.gold.withOpacity(0.38),
      glowColor: isFollowed ? AppColors2026.roseLaser : AppColors2026.gold,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Top drag-style collapse bar matching Canvas GPS card
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Flexible(
                child: Text(
                  'TÉLÉMÉTRIE LIVE',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors2026.goldLight,
                    letterSpacing: 0.9,
                  ),
                ),
              ),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors2026.gold.withOpacity(0.45),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              GestureDetector(
                onTap: () => setState(() => _cardHidden = true),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Masquer ▼',
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors2026.textSecondary,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (isFollowed
                          ? AppColors2026.roseLaser
                          : AppColors2026.gold)
                      .withOpacity(0.16),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: (isFollowed
                            ? AppColors2026.roseLaser
                            : AppColors2026.gold)
                        .withOpacity(0.32),
                  ),
                ),
                child: Icon(
                  isFollowed ? LucideIcons.radio : LucideIcons.car,
                  color: isFollowed
                      ? AppColors2026.roseLaser
                      : AppColors2026.goldLight,
                  size: 19,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${device.plate} • ${device.lat.toStringAsFixed(4)}, ${device.lng.toStringAsFixed(4)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: AppColors2026.goldLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${device.speed.round()} km/h',
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w900,
                      color: device.speed > 0
                          ? AppColors2026.emeraldNeon
                          : AppColors2026.textSecondary,
                    ),
                  ),
                  Text(
                    '${device.distanceToday.toStringAsFixed(1)} km • ${device.statusLabel}',
                    style: const TextStyle(
                      fontSize: 9.5,
                      color: AppColors2026.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                GoldGradientButton(
                  label: 'Itinéraire',
                  icon: LucideIcons.compass,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                  borderRadius: 12,
                  fontSize: 11,
                  onPressed: () => _openGoogleMapsDirections(device),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () => _toggleLiveSuivi(device),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isFollowed
                        ? AppColors2026.roseLaser
                        : AppColors2026.emeraldNeon,
                    foregroundColor: isFollowed ? Colors.white : Colors.black,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 9,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: Icon(
                    isFollowed ? LucideIcons.square : LucideIcons.navigation,
                    size: 14,
                  ),
                  label: Text(
                    isFollowed
                        ? 'Stop (${_liveTrailPoints.length})'
                        : 'Suivi Live',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
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
                          : () => _loadHistoryForPreset(entry.$1, device),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        side: BorderSide(
                          color: (!_isLiveTrailActive &&
                                  _selectedPreset == entry.$1 &&
                                  _historyPoints.isNotEmpty)
                              ? AppColors2026.cyanNeon
                              : Colors.white24,
                        ),
                      ),
                      child: Text(
                        entry.$2,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: (!_isLiveTrailActive &&
                                  _selectedPreset == entry.$1 &&
                                  _historyPoints.isNotEmpty)
                              ? AppColors2026.cyanNeon
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
              child: LinearProgressIndicator(color: AppColors2026.cyanNeon),
            ),
          if (_historyError != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                _historyError!,
                style: const TextStyle(
                  color: AppColors2026.amberSolar,
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
          ? AppColors2026.roseLaser.withOpacity(0.55)
          : state.tracerColor.withOpacity(0.45),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              NeonBadge(
                label: _isLiveTrailActive
                    ? '🔴 EN DIRECT (SUIVI)'
                    : 'LECTEUR DE TRAJET',
                color: _isLiveTrailActive
                    ? AppColors2026.roseLaser
                    : state.tracerColor,
                pulsing: _isLiveTrailActive,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${stats.distanceKm.toStringAsFixed(1)} km • Max ${stats.maxSpeed} km/h • ${points.length} pts',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors2026.textSecondary,
                  ),
                ),
              ),
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
                onPressed: points.length < 2 ? null : _togglePlayback,
                style: IconButton.styleFrom(
                  backgroundColor: state.tracerColor.withOpacity(0.2),
                ),
                icon: Icon(
                  _isPlaying ? LucideIcons.pause : LucideIcons.play,
                  size: 18,
                  color: state.tracerColor,
                ),
              ),
              Expanded(
                child: Slider(
                  value: safeIndex.toDouble(),
                  min: 0,
                  max: (points.length - 1).clamp(1, 999999).toDouble(),
                  activeColor: state.tracerColor,
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
                  label:
                      '${currentPoint.speed.round()} km/h • ${DateFormat('HH:mm').format(currentPoint.dateTime)}',
                  color: AppColors2026.emeraldNeon,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFleetDrawer(List<GpsDeviceModel> devices) {
    return SpatialGlassCard(
      padding: const EdgeInsets.all(14),
      borderRadius: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                LucideIcons.radio,
                color: AppColors2026.cyanNeon,
                size: 18,
              ),
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
                    if (d.hasValidPosition) {
                      _mapController.move(LatLng(d.lat, d.lng), 16);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors2026.cyanNeon.withOpacity(0.14)
                          : Colors.white.withOpacity(0.03),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected
                            ? AppColors2026.cyanNeon
                            : Colors.white10,
                      ),
                    ),
                    child: Row(
                      children: [
                        AnimatedPulseDot(color: d.statusColor),
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
                                '${d.speed.round()} km/h • ${d.statusLabel}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors2026.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'Activer Suivi & Traceur',
                          onPressed: () => _toggleLiveSuivi(d),
                          icon: Icon(
                            LucideIcons.navigation,
                            size: 16,
                            color: isFollowed
                                ? AppColors2026.roseLaser
                                : AppColors2026.emeraldNeon,
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
