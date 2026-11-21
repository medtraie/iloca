import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../core/widgets/vehicle_image_preview.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import '../clients/client_form_dialog.dart';
import '../contracts/contract_form_dialog.dart';
import '../vehicles/vehicle_form_dialog.dart';

/// 1. OVERVIEW / COCKPIT SCREEN — Luxury Obsidian & Gold 2026 Design
/// 100% Real-time Synchronized with Web & Supabase (`clients`, `vehicles`, `contracts`, `expenses`, `repairs`, `gpsDevices`)
class OverviewScreen extends StatefulWidget {
  final AppStateProvider appState;

  const OverviewScreen({super.key, required this.appState});

  @override
  State<OverviewScreen> createState() => _OverviewScreenState();
}

class _OverviewScreenState extends State<OverviewScreen>
    with TickerProviderStateMixin {
  late final AnimationController _radarCtrl;
  late final AnimationController _marqueeAnim;
  int _marqueeVehicleCount = 0;

  void _onStateChanged() {
    if (mounted) {
      _syncMarqueeDuration(widget.appState.vehicles.length);
      setState(() {});
    }
  }

  void _syncMarqueeDuration(int count) {
    if (count == _marqueeVehicleCount) return;
    _marqueeVehicleCount = count;
    // Match Gemini Canvas @keyframes fleetTickerScroll (~4.0s per card -> 24s for 6 cars, smooth 60fps glide)
    final safeCount = math.max(1, count);
    final totalMs = math.max(5500, safeCount * 3800);
    _marqueeAnim.duration = Duration(milliseconds: totalMs);
    if (count > 0 && !_marqueeAnim.isAnimating) {
      _marqueeAnim.repeat();
    }
  }

  @override
  void initState() {
    super.initState();
    widget.appState.addListener(_onStateChanged);
    _radarCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();

    final initialCount = widget.appState.vehicles.length;
    _marqueeVehicleCount = initialCount;
    _marqueeAnim = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: math.max(5500, math.max(1, initialCount) * 3800)),
    )..repeat();
  }

  @override
  void dispose() {
    widget.appState.removeListener(_onStateChanged);
    _radarCtrl.dispose();
    _marqueeAnim.dispose();
    super.dispose();
  }

  GpsDeviceModel? _matchGpsForVehicle(VehicleModel v, List<GpsDeviceModel> devices) {
    if (devices.isEmpty) return null;
    final vPlate = v.registration.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
    final vName = v.fullName.toLowerCase();
    for (final d in devices) {
      final dPlate = d.plate.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
      final dName = d.name.toLowerCase();
      if (vPlate.isNotEmpty && dPlate.isNotEmpty && (dPlate.contains(vPlate) || vPlate.contains(dPlate))) {
        return d;
      }
      if (v.brand.isNotEmpty && dName.contains(v.brand.toLowerCase()) &&
          (v.model.isEmpty || dName.contains(v.model.toLowerCase()))) {
        return d;
      }
      if (dName == vName) return d;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.appState;
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final now = DateTime.now();

    final vehicles = app.vehicles;
    final contracts = app.contracts;
    final clients = app.clients;
    final gpsDevices = app.gpsDevices;

    final availCount = app.availableVehiclesCount;
    final rentedCount = app.rentedVehiclesCount;

    // Compute Top Client VIP by revenue from contracts
    final clientCaMap = <String, double>{};
    final clientCountMap = <String, int>{};
    for (final c in contracts) {
      final name = c.customerName.trim().isEmpty ? 'Client VIP' : c.customerName.trim();
      clientCaMap[name] = (clientCaMap[name] ?? 0) + c.effectiveTotalAmount;
      clientCountMap[name] = (clientCountMap[name] ?? 0) + 1;
    }
    String topClientName = clients.isNotEmpty ? clients.first.fullName : 'Aucun client';
    double topClientCa = 0;
    int topClientLoc = 0;
    clientCaMap.forEach((name, ca) {
      if (ca > topClientCa) {
        topClientCa = ca;
        topClientName = name;
        topClientLoc = clientCountMap[name] ?? 1;
      }
    });

    // Compute Top Vehicle by generated revenue
    final vehCaMap = <String, double>{};
    for (final c in contracts) {
      final key = c.vehicleId.isNotEmpty ? c.vehicleId : c.vehicle;
      vehCaMap[key] = (vehCaMap[key] ?? 0) + c.effectiveTotalAmount;
    }
    VehicleModel? topVehicle = vehicles.isNotEmpty ? vehicles.first : null;
    double topVehicleNet = 0;
    for (final v in vehicles) {
      final rev = (vehCaMap[v.id] ?? 0) + (vehCaMap[v.fullName] ?? 0);
      if (rev >= topVehicleNet) {
        topVehicleNet = rev;
        topVehicle = v;
      }
    }

    // Tracked GPS device or fallback rented vehicle for Radar Card
    final activeGps = gpsDevices.where((d) => d.speed > 0).firstOrNull ??
        gpsDevices.where((d) => d.online).firstOrNull ??
        gpsDevices.firstOrNull;
    final fallbackRentedVeh = vehicles.where((v) => v.status.toLowerCase() == 'loue').firstOrNull ??
        (vehicles.isNotEmpty ? vehicles.first : null);

    // Build 6-month Financial Series from real Supabase data
    final monthSeries = _build6MonthFinancialSeries(now, app);
    final currentMonthRev = monthSeries.last.rev;
    final currentMonthExp = monthSeries.last.exp;

    // Build real-time operational feed
    final feedItems = _buildOperationalFeed(app);

    return RefreshIndicator(
      color: AppColors2026.gold,
      backgroundColor: AppColors2026.obsidianSurface,
      onRefresh: () async {
        await app.refreshAllData();
        await app.refreshGpsTelemetry();
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 110),
        children: [
          // 1. HERO COCKPIT CARD + LIVE FLEET MARQUEE
          _buildHeroCockpitCard(context, app, vehicles, gpsDevices, fmt),

          const SizedBox(height: 14),

          // 2. DUAL KPI HIGHLIGHT CARDS (CLIENT VIP & TOP FLOTTE)
          Row(
            children: [
              Expanded(
                child: SpatialGlassCard(
                  subtle: true,
                  padding: const EdgeInsets.all(14),
                  borderColor: AppColors2026.gold.withOpacity(0.24),
                  onTap: () => app.setActiveTab(4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors2026.gold.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(7),
                              border: Border.all(color: AppColors2026.gold.withOpacity(0.3)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(LucideIcons.crown, size: 11, color: AppColors2026.goldLight),
                                SizedBox(width: 4),
                                Text(
                                  'CLIENT VIP',
                                  style: TextStyle(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors2026.goldLight,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '$topClientLoc loc.',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: AppColors2026.goldLight,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        topClientName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        'CA : ${fmt.format(topClientCa.round())} MAD',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: AppColors2026.emeraldNeon,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SpatialGlassCard(
                  subtle: true,
                  padding: const EdgeInsets.all(14),
                  borderColor: AppColors2026.amberSolar.withOpacity(0.24),
                  onTap: () => app.setActiveTab(8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors2026.amberSolar.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(7),
                              border: Border.all(color: AppColors2026.amberSolar.withOpacity(0.3)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(LucideIcons.trophy, size: 11, color: Color(0xFFFCD34D)),
                                SizedBox(width: 4),
                                Text(
                                  'TOP FLOTTE',
                                  style: TextStyle(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFFFCD34D),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            topVehicle != null
                                ? '${fmt.format(topVehicle.dailyRate.round())}/j'
                                : '—',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: AppColors2026.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        topVehicle?.fullName ?? 'Parc Automobile',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        'Net : +${fmt.format(topVehicleNet.round())} MAD',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: AppColors2026.emeraldNeon,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // 3. MINI FINANCIAL PERFORMANCE CHART
          SpatialGlassCard(
            subtle: true,
            padding: const EdgeInsets.all(16),
            onTap: () => app.setActiveTab(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.barChart3, size: 17, color: AppColors2026.goldLight),
                        SizedBox(width: 8),
                        Text(
                          'PERFORMANCE FINANCIÈRE',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    const Text(
                      'Bilan complet →',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors2026.goldLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildMiniFinancialChart(monthSeries, currentMonthRev, currentMonthExp, fmt),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 4. RADAR GPS SATELLITE WIDGET
          _buildRadarGpsWidget(
            app: app,
            gpsDevices: gpsDevices,
            activeGps: activeGps,
            fallbackVeh: fallbackRentedVeh,
            rentedCount: rentedCount,
          ),

          const SizedBox(height: 14),

          // 5. JOURNAL OPÉRATIONNEL
          SpatialGlassCard(
            subtle: true,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        AnimatedPulseDot(color: AppColors2026.goldLight, size: 7),
                        SizedBox(width: 8),
                        Text(
                          'JOURNAL OPÉRATIONNEL',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'Temps Réel',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors2026.goldLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (feedItems.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 10),
                    child: Text(
                      'Aucune opération récente enregistrée.',
                      style: TextStyle(fontSize: 11.5, color: AppColors2026.textSecondary),
                    ),
                  )
                else
                  ...feedItems.map((item) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors2026.surfaceSub,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: item.color.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: item.color.withOpacity(0.32)),
                              ),
                              child: Text(
                                item.tag,
                                style: TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w900,
                                  color: item.color,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                item.text,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: Color(0xFFE2E8F0),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              item.time,
                              style: const TextStyle(
                                fontSize: 10,
                                color: AppColors2026.textMuted,
                              ),
                            ),
                          ],
                        ),
                      )),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 6. COLLECTION PRESTIGE PREVIEW
          SpatialGlassCard(
            subtle: true,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.car, size: 17, color: AppColors2026.goldLight),
                        const SizedBox(width: 8),
                        Text(
                          'COLLECTION PRESTIGE ($availCount / ${vehicles.length})',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                    GestureDetector(
                      onTap: () => app.setActiveTab(2),
                      child: const Text(
                        'Voir tout →',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors2026.goldLight,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (vehicles.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'Aucun véhicule dans le parc.',
                      style: TextStyle(fontSize: 12, color: AppColors2026.textSecondary),
                    ),
                  )
                else
                  ...vehicles.take(3).map((car) {
                    final st = car.status.toLowerCase();
                    final isAvail = st == 'disponible';
                    final isMaint = st == 'maintenance';
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors2026.surfaceSub,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.06)),
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              width: 62,
                              height: 46,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0E1016),
                                border: Border.all(color: AppColors2026.gold.withOpacity(0.2)),
                              ),
                              child: VehicleImagePreview(
                                imageData: car.mainPhoto,
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          const SizedBox(width: 11),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  car.fullName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                RichText(
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  text: TextSpan(
                                    children: [
                                      TextSpan(
                                        text: '${car.registration} • ',
                                        style: const TextStyle(
                                          fontSize: 10.5,
                                          color: AppColors2026.textSecondary,
                                        ),
                                      ),
                                      TextSpan(
                                        text: '${fmt.format(car.dailyRate.round())} DH/j',
                                        style: const TextStyle(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors2026.goldLight,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          if (isAvail)
                            GoldGradientButton(
                              label: 'Réserver',
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              borderRadius: 12,
                              fontSize: 11,
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    fullscreenDialog: true,
                                    builder: (_) => ContractFormDialog(
                                      appState: app,
                                      mode: ContractFormMode.create,
                                    ),
                                  ),
                                );
                              },
                            )
                          else if (isMaint)
                            const NeonBadge(
                              label: 'Maintenance',
                              color: AppColors2026.roseLaser,
                              icon: LucideIcons.wrench,
                            )
                          else
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.06),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white.withOpacity(0.1)),
                              ),
                              child: const Text(
                                'En mission',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors2026.textSecondary,
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroCockpitCard(
    BuildContext context,
    AppStateProvider app,
    List<VehicleModel> vehicles,
    List<GpsDeviceModel> gpsDevices,
    NumberFormat fmt,
  ) {
    final hasMarquee = vehicles.isNotEmpty;

    return SpatialGlassCard(
      padding: const EdgeInsets.all(18),
      borderColor: AppColors2026.gold.withOpacity(0.24),
      glowColor: AppColors2026.gold,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: -40,
            top: -40,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors2026.gold.withOpacity(0.09),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors2026.gold.withOpacity(0.14),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: AppColors2026.gold.withOpacity(0.38)),
                    ),
                    child: const Text(
                      '✦ CONCIERGERIE VIP 2026',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors2026.goldLight,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors2026.emeraldNeon.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: AppColors2026.emeraldNeon.withOpacity(0.32)),
                    ),
                    child: Text(
                      app.isSyncing ? '• SYNC...' : '• CLOUD SYNC',
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors2026.emeraldNeon,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                'Tableau de Bord &',
                style: AppTheme2026.luxurySerif(
                  fontSize: 23,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              Text(
                'Cockpit Exécutif',
                style: AppTheme2026.luxurySerif(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: AppColors2026.goldLight,
                ),
              ),
              const SizedBox(height: 5),
              const Text(
                'Gestion de flotte prestige, télémétrie satellite & contrats numériques',
                style: TextStyle(
                  fontSize: 11,
                  color: AppColors2026.textSecondary,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: GoldGradientButton(
                      label: 'Nouveau Contrat',
                      icon: LucideIcons.fileText,
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            fullscreenDialog: true,
                            builder: (_) => ContractFormDialog(
                              appState: app,
                              mode: ContractFormMode.create,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DarkLuxuryButton(
                      label: 'Nouveau Client',
                      icon: LucideIcons.userPlus,
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            fullscreenDialog: true,
                            builder: (_) => ClientFormDialog(appState: app),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Divider(color: AppColors2026.gold.withOpacity(0.16), height: 1),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      AnimatedPulseDot(color: AppColors2026.emeraldNeon, size: 6.5),
                      SizedBox(width: 7),
                      Text(
                        'FLOTTE PRESTIGE EN DIRECT',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          color: AppColors2026.goldLight,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                  GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => VehicleFormDialog(appState: app),
                        ),
                      );
                    },
                    child: const Text(
                      '+ Véhicule',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors2026.goldLight,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (!hasMarquee)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors2026.surfaceSub,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.06)),
                  ),
                  child: const Center(
                    child: Text(
                      'Synchronisation des véhicules du parc...',
                      style: TextStyle(fontSize: 11, color: AppColors2026.textSecondary),
                    ),
                  ),
                )
              else
                LayoutBuilder(
                  builder: (context, constraints) {
                    const cardW = 178.0;
                    const gapW = 10.0;
                    const itemSpan = cardW + gapW;
                    final singleLoopWidth = vehicles.length * itemSpan;
                    final repeatSets = math.max(
                      2,
                      ((constraints.maxWidth / singleLoopWidth).ceil() + 2),
                    );
                    final trackCars = <VehicleModel>[
                      for (int r = 0; r < repeatSets; r++) ...vehicles,
                    ];

                    return GestureDetector(
                      onTapDown: (_) => _marqueeAnim.stop(canceled: false),
                      onTapUp: (_) {
                        if (mounted && !_marqueeAnim.isAnimating) {
                          _marqueeAnim.repeat();
                        }
                      },
                      onTapCancel: () {
                        if (mounted && !_marqueeAnim.isAnimating) {
                          _marqueeAnim.repeat();
                        }
                      },
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: SizedBox(
                          height: 68,
                          width: constraints.maxWidth,
                          child: AnimatedBuilder(
                            animation: _marqueeAnim,
                            builder: (context, child) {
                              final dx = -(_marqueeAnim.value * singleLoopWidth);
                              return Stack(
                                clipBehavior: Clip.hardEdge,
                                children: [
                                  Positioned(
                                    left: dx,
                                    top: 0,
                                    bottom: 0,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        for (final car in trackCars) ...[
                                          Builder(
                                            builder: (ctx) {
                                              final st = car.status.toLowerCase();
                                              final isAvail = st == 'disponible';
                                              final isMaint = st == 'maintenance';
                                              final dotColor = isAvail
                                                  ? AppColors2026.emeraldNeon
                                                  : isMaint
                                                      ? AppColors2026.roseLaser
                                                      : AppColors2026.amberSolar;
                                              final matchedGps = _matchGpsForVehicle(car, gpsDevices);
                                              final gpsLabel = matchedGps != null
                                                  ? '${matchedGps.speed.round()} km/h'
                                                  : (isAvail
                                                      ? 'Showroom'
                                                      : isMaint
                                                          ? 'Atelier'
                                                          : 'En route');

                                              return GestureDetector(
                                                onTap: () {
                                                  if (matchedGps != null) {
                                                    app.selectGpsDevice(matchedGps.id);
                                                  }
                                                  app.setActiveTab(1); // Open GPS Live Map!
                                                },
                                                child: Container(
                                                  width: cardW,
                                                  height: 68,
                                                  margin: const EdgeInsets.only(right: gapW),
                                                  padding: const EdgeInsets.all(8),
                                                  decoration: BoxDecoration(
                                                    color: AppColors2026.surfaceSub.withOpacity(0.95),
                                                    borderRadius: BorderRadius.circular(16),
                                                    border: Border.all(
                                                      color: Colors.white.withOpacity(0.08),
                                                    ),
                                                  ),
                                                  child: Row(
                                                    children: [
                                                      Stack(
                                                        children: [
                                                          ClipRRect(
                                                            borderRadius: BorderRadius.circular(11),
                                                            child: Container(
                                                              width: 48,
                                                              height: 44,
                                                              color: const Color(0xFF0B0D12),
                                                              child: VehicleImagePreview(
                                                                imageData: car.mainPhoto,
                                                                fit: BoxFit.cover,
                                                              ),
                                                            ),
                                                          ),
                                                          Positioned(
                                                            top: 3,
                                                            right: 3,
                                                            child: Container(
                                                              width: 8,
                                                              height: 8,
                                                              decoration: BoxDecoration(
                                                                color: dotColor,
                                                                shape: BoxShape.circle,
                                                                border: Border.all(
                                                                  color: AppColors2026.obsidian,
                                                                  width: 1.3,
                                                                ),
                                                              ),
                                                            ),
                                                          ),
                                                        ],
                                                      ),
                                                      const SizedBox(width: 9),
                                                      Expanded(
                                                        child: Column(
                                                          crossAxisAlignment: CrossAxisAlignment.start,
                                                          mainAxisAlignment: MainAxisAlignment.center,
                                                          children: [
                                                            Text(
                                                              car.fullName,
                                                              maxLines: 1,
                                                              overflow: TextOverflow.ellipsis,
                                                              style: const TextStyle(
                                                                fontSize: 10.5,
                                                                fontWeight: FontWeight.w900,
                                                                color: Colors.white,
                                                              ),
                                                            ),
                                                            Text(
                                                              '${fmt.format(car.dailyRate.round())} DH/j',
                                                              style: const TextStyle(
                                                                fontSize: 9.5,
                                                                fontWeight: FontWeight.w800,
                                                                color: AppColors2026.goldLight,
                                                              ),
                                                            ),
                                                            Text(
                                                              '📍 GPS • $gpsLabel',
                                                              maxLines: 1,
                                                              overflow: TextOverflow.ellipsis,
                                                              style: const TextStyle(
                                                                fontSize: 8.5,
                                                                fontWeight: FontWeight.w600,
                                                                color: AppColors2026.emeraldNeon,
                                                              ),
                                                            ),
                                                          ],
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniFinancialChart(
    List<_MonthPoint> series,
    double currentRev,
    double currentExp,
    NumberFormat fmt,
  ) {
    final maxVal = series.fold<double>(
      1000,
      (m, p) => math.max(m, math.max(p.rev, p.exp)),
    );

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 14, 12, 10),
      decoration: BoxDecoration(
        color: const Color(0xFF12151E),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 82,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: series.map((pt) {
                final revH = math.max(6.0, (pt.rev / maxVal) * 58);
                final expH = math.max(5.0, (pt.exp / maxVal) * 58);
                return Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          width: 9,
                          height: revH,
                          decoration: BoxDecoration(
                            color: AppColors2026.emeraldNeon,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(width: 3),
                        Container(
                          width: 9,
                          height: expH,
                          decoration: BoxDecoration(
                            color: AppColors2026.roseLaser,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      pt.label,
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors2026.textSecondary,
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),
          Divider(color: Colors.white.withOpacity(0.06), height: 1),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '• Revenus : ${fmt.format(currentRev.round())} MAD',
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: AppColors2026.emeraldNeon,
                ),
              ),
              Text(
                '• Dépenses : ${fmt.format(currentExp.round())} MAD',
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: AppColors2026.roseLaser,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRadarGpsWidget({
    required AppStateProvider app,
    required List<GpsDeviceModel> gpsDevices,
    required GpsDeviceModel? activeGps,
    required VehicleModel? fallbackVeh,
    required int rentedCount,
  }) {
    final trackedTitle = activeGps?.name ?? fallbackVeh?.fullName ?? 'Flotte SFTM / BonaTours';
    final trackedSub = activeGps != null
        ? '${activeGps.lat.toStringAsFixed(4)}° N, ${activeGps.lng.toStringAsFixed(4)}° W'
        : (fallbackVeh != null ? 'Matricule ${fallbackVeh.registration}' : 'En attente de signal GPS');
    final speedBadge = activeGps != null
        ? '${activeGps.speed.round()} km/h'
        : (rentedCount > 0 ? 'LIVE' : 'Standby');
    final centerBadge = gpsDevices.isNotEmpty
        ? gpsDevices.where((d) => d.online).length
        : rentedCount;

    return SpatialGlassCard(
      subtle: true,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  AnimatedPulseDot(color: AppColors2026.emeraldNeon, size: 7.5),
                  SizedBox(width: 8),
                  Text(
                    'RADAR GPS SATELLITE',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              GestureDetector(
                onTap: () => app.setActiveTab(1),
                child: const Text(
                  'Plein écran →',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors2026.goldLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () => app.setActiveTab(1),
            child: Container(
              height: 146,
              decoration: BoxDecoration(
                color: const Color(0xFF080A0F),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors2026.gold.withOpacity(0.24)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Stack(
                  children: [
                    CustomPaint(
                      size: const Size(double.infinity, 146),
                      painter: _RadarGridPainter(),
                    ),
                    Center(
                      child: SizedBox(
                        width: 122,
                        height: 122,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            RotationTransition(
                              turns: _radarCtrl,
                              child: Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: SweepGradient(
                                    colors: [
                                      AppColors2026.emeraldNeon.withOpacity(0.32),
                                      AppColors2026.gold.withOpacity(0.14),
                                      Colors.transparent,
                                      Colors.transparent,
                                    ],
                                    stops: const [0.0, 0.14, 0.28, 1.0],
                                  ),
                                ),
                              ),
                            ),
                            Container(
                              width: 122,
                              height: 122,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: AppColors2026.gold.withOpacity(0.25),
                                ),
                              ),
                            ),
                            Container(
                              width: 78,
                              height: 78,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: AppColors2026.emeraldNeon.withOpacity(0.32),
                                ),
                              ),
                            ),
                            Container(
                              width: 30,
                              height: 30,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors2026.emeraldNeon.withOpacity(0.24),
                                border: Border.all(
                                  color: AppColors2026.emeraldNeon,
                                  width: 2,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  '$centerBadge',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors2026.emeraldNeon,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 10,
                      left: 12,
                      child: Text(
                        activeGps != null
                            ? '${activeGps.lat.toStringAsFixed(4)}° N, ${activeGps.lng.toStringAsFixed(4)}° W'
                            : '33.5992° N, 7.6694° W',
                        style: const TextStyle(
                          fontSize: 9.5,
                          fontFamily: 'monospace',
                          color: AppColors2026.textSecondary,
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 10,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors2026.obsidian.withOpacity(0.92),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: AppColors2026.gold.withOpacity(0.35)),
                        ),
                        child: const Text(
                          'SAT-LINK CHIFFRÉ',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: AppColors2026.goldLight,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () {
              if (activeGps != null) app.selectGpsDevice(activeGps.id);
              app.setActiveTab(1);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: AppColors2026.surfaceSub,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          trackedTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          trackedSub,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors2026.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors2026.emeraldNeon.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors2026.emeraldNeon.withOpacity(0.38)),
                    ),
                    child: Text(
                      speedBadge,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: AppColors2026.emeraldNeon,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<_MonthPoint> _build6MonthFinancialSeries(DateTime now, AppStateProvider app) {
    final list = <_MonthPoint>[];
    for (int offset = 5; offset >= 0; offset--) {
      final m = DateTime(now.year, now.month - offset, 1);
      final prefix = '${m.year}-${m.month.toString().padLeft(2, '0')}';
      double rev = 0;
      double exp = 0;
      for (final c in app.contracts) {
        if (c.startDate.startsWith(prefix) || c.createdAt.startsWith(prefix)) {
          rev += c.effectiveTotalAmount;
        }
      }
      for (final e in app.expenses) {
        if (!e.archived) {
          exp += (e.monthlyCost > 0 ? e.monthlyCost : 0);
        }
      }
      for (final r in app.repairs) {
        if (r.dateReparation.startsWith(prefix) || r.createdAt.startsWith(prefix)) {
          exp += r.cout;
        }
      }
      const names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      list.add(_MonthPoint(label: names[m.month - 1], rev: rev, exp: exp));
    }
    return list;
  }

  List<_FeedItem> _buildOperationalFeed(AppStateProvider app) {
    final items = <_FeedItem>[];
    for (final c in app.contracts.take(2)) {
      items.add(_FeedItem(
        tag: c.isClosed ? 'RETOUR' : 'CONTRAT',
        color: c.isClosed ? AppColors2026.emeraldNeon : AppColors2026.goldLight,
        text: '${c.customerName} • ${c.vehicle}',
        time: c.startDate.length >= 10 ? c.startDate.substring(5, 10) : 'Récent',
      ));
    }
    for (final r in app.repairs.take(1)) {
      items.add(_FeedItem(
        tag: 'RÉVISION',
        color: AppColors2026.blueRoyal,
        text: '${r.typeReparation} • ${r.vehicleDisplay}',
        time: r.dateReparation.length >= 10 ? r.dateReparation.substring(5, 10) : 'Atelier',
      ));
    }
    for (final e in app.expenses.take(1)) {
      items.add(_FeedItem(
        tag: 'DÉPENSE',
        color: AppColors2026.roseLaser,
        text: '${e.typeLabel} (${e.totalCost.round()} DH)',
        time: e.startDate.length >= 10 ? e.startDate.substring(5, 10) : 'Charge',
      ));
    }
    return items.take(4).toList();
  }
}

class _MonthPoint {
  final String label;
  final double rev;
  final double exp;
  const _MonthPoint({required this.label, required this.rev, required this.exp});
}

class _FeedItem {
  final String tag;
  final Color color;
  final String text;
  final String time;
  const _FeedItem({required this.tag, required this.color, required this.text, required this.time});
}

class _RadarGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = AppColors2026.gold.withOpacity(0.06)
      ..strokeWidth = 1;

    const step = 32.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final roadPaint = Paint()
      ..color = AppColors2026.gold.withOpacity(0.22)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final p1 = Path()
      ..moveTo(0, size.height * 0.78)
      ..quadraticBezierTo(size.width * 0.45, size.height * 0.52, size.width, size.height * 0.18);
    canvas.drawPath(p1, roadPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
