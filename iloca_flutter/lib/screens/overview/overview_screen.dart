import 'dart:math' as math;
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../core/widgets/vehicle_image_preview.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

/// 1. OVERVIEW SCREEN (Cockpit Spatial & Tableau de Bord 2026)
/// 100% Web Parity with Index.tsx, DashboardStats.tsx, TodayOperationsHub.tsx & FleetRadarCard.tsx
class OverviewScreen extends StatefulWidget {
  final AppStateProvider appState;

  const OverviewScreen({super.key, required this.appState});

  @override
  State<OverviewScreen> createState() => _OverviewScreenState();
}

class _OverviewScreenState extends State<OverviewScreen> {
  // Navigation tabs matching Web: 'overview' | 'operations' | 'fleet' | 'financial'
  String _activeTab = 'overview';
  String _opsFilter = 'returns'; // 'returns' | 'overdue' | 'departures'

  Future<void> _openWhatsApp(String phone, String message) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) return;
    final uri = Uri.parse(
        'https://wa.me/${clean.startsWith("+") ? clean.substring(1) : clean}?text=${Uri.encodeComponent(message)}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _callPhone(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) return;
    final uri = Uri.parse('tel:$clean');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.appState;
    final currencyFmt = NumberFormat('#,##0', 'fr_FR');
    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);

    // Fleet Metrics
    final totalVehicles = app.vehicles.length;
    final availableVeh = app.availableVehiclesCount;
    final rentedVeh = app.rentedVehiclesCount;
    final maintVeh = app.maintenanceVehiclesCount;
    final occupancyRate = totalVehicles > 0
        ? ((rentedVeh / totalVehicles) * 100).round().clamp(0, 100)
        : 0;

    // Financial Telemetry
    final monthlyRev = app.monthlyRevenue;
    final monthlyCost = app.monthlyExpensesAndRepairs;
    final netProfit = monthlyRev - monthlyCost;
    final profitMargin = monthlyRev > 0
        ? ((netProfit / monthlyRev) * 100).round()
        : 0;

    // Operations Hub Telemetry
    final activeContracts = app.contracts.where((c) => c.isActive).toList();
    final todayReturns = activeContracts
        .where((c) => c.effectiveEndDate.startsWith(todayStr))
        .toList();
    final overdueContracts =
        app.contracts.where((c) => c.isOverdue).toList();
    final todayDepartures = app.contracts
        .where((c) => c.startDate.startsWith(todayStr))
        .toList();

    // GPS Telemetry
    final gpsOnlineCount = app.gpsDevices.where((d) => d.online).length;
    final gpsMovingCount =
        app.gpsDevices.where((d) => d.status == 'moving').length;

    return RefreshIndicator(
      color: AppColors2026.cyanNeon,
      onRefresh: () async {
        await app.refreshAllData();
        await app.refreshGpsTelemetry();
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 120),
        children: [
          // 1. Hero Spatial Header with Cockpit Status & Quick Actions
          _buildHeroHeader(app),

          const SizedBox(height: 14),

          // 2. Tab Navigation Switcher (Overview, Opérations du jour, Flotte, Finance)
          _buildViewTabSwitcher(),

          const SizedBox(height: 16),

          // 3. Tab Contents
          if (_activeTab == 'overview') ...[
            _buildBentoKpiGrid(
              totalVehicles: totalVehicles,
              availableVeh: availableVeh,
              rentedVeh: rentedVeh,
              occupancyRate: occupancyRate,
              monthlyRev: monthlyRev,
              netProfit: netProfit,
              profitMargin: profitMargin,
              activeContractsCount: activeContracts.length,
              overdueCount: overdueContracts.length,
              customersCount: app.clients.length,
              currencyFmt: currencyFmt,
            ),
            const SizedBox(height: 16),
            _buildTodayOperationsHub(
              todayReturns: todayReturns,
              overdueContracts: overdueContracts,
              todayDepartures: todayDepartures,
              currencyFmt: currencyFmt,
            ),
            const SizedBox(height: 16),
            _buildFleetRadarCard(
              totalVehicles: totalVehicles,
              availableVeh: availableVeh,
              rentedVeh: rentedVeh,
              maintVeh: maintVeh,
              occupancyRate: occupancyRate,
            ),
            const SizedBox(height: 16),
            _buildRevenueEvolutionCard(currencyFmt),
            const SizedBox(height: 16),
            _buildGpsRadarLiveCard(app),
          ] else if (_activeTab == 'operations') ...[
            _buildTodayOperationsHub(
              todayReturns: todayReturns,
              overdueContracts: overdueContracts,
              todayDepartures: todayDepartures,
              currencyFmt: currencyFmt,
            ),
            const SizedBox(height: 16),
            _buildRecentContractsList(app, currencyFmt),
          ] else if (_activeTab == 'fleet') ...[
            _buildFleetRadarCard(
              totalVehicles: totalVehicles,
              availableVeh: availableVeh,
              rentedVeh: rentedVeh,
              maintVeh: maintVeh,
              occupancyRate: occupancyRate,
            ),
            const SizedBox(height: 16),
            _buildGpsRadarLiveCard(app),
          ] else if (_activeTab == 'financial') ...[
            _buildRevenueEvolutionCard(currencyFmt),
            const SizedBox(height: 16),
            _buildFinancialBreakdownCard(
              monthlyRev: monthlyRev,
              monthlyCost: monthlyCost,
              netProfit: netProfit,
              currencyFmt: currencyFmt,
            ),
          ],
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 1. HERO HEADER
  // ---------------------------------------------------------------------------
  Widget _buildHeroHeader(AppStateProvider app) {
    return SpatialGlassCard(
      glowColor: AppColors2026.cyanNeon,
      borderColor: AppColors2026.cyanNeon.withOpacity(0.35),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    const NeonBadge(
                      label: 'COCKPIT 2026',
                      color: AppColors2026.emeraldNeon,
                      pulsing: true,
                    ),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        app.isSyncing ? 'SYNC...' : 'CLOUD SYNC',
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: AppColors2026.cyanBright,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                DateFormat('dd MMM • HH:mm').format(app.lastSyncTime),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors2026.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Tableau de Bord & Télémétrie SFT',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Supervision en direct de la flotte, alertes de restitution et finances.',
            style: TextStyle(
              fontSize: 11.5,
              color: AppColors2026.textSecondary,
            ),
          ),
          const SizedBox(height: 14),

          // 4 Quick Action Buttons
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _QuickActionBtn(
                  icon: LucideIcons.filePlus2,
                  label: 'Nouveau Contrat',
                  color: AppColors2026.violetElectric,
                  onTap: () => app.setActiveTab(3),
                ),
                const SizedBox(width: 8),
                _QuickActionBtn(
                  icon: LucideIcons.userPlus,
                  label: 'Nouveau Client',
                  color: AppColors2026.cyanNeon,
                  onTap: () => app.setActiveTab(1),
                ),
                const SizedBox(width: 8),
                _QuickActionBtn(
                  icon: LucideIcons.car,
                  label: 'Ajouter Véhicule',
                  color: AppColors2026.emeraldNeon,
                  onTap: () => app.setActiveTab(2),
                ),
                const SizedBox(width: 8),
                _QuickActionBtn(
                  icon: LucideIcons.mapPin,
                  label: 'Carte & GPS',
                  color: AppColors2026.amberSolar,
                  onTap: () => app.setActiveTab(5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 2. TAB SWITCHER
  // ---------------------------------------------------------------------------
  Widget _buildViewTabSwitcher() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          _buildTabPill(id: 'overview', label: 'Général', icon: LucideIcons.layoutGrid),
          _buildTabPill(id: 'operations', label: 'Opérations', icon: LucideIcons.calendarClock),
          _buildTabPill(id: 'fleet', label: 'Flotte', icon: LucideIcons.car),
          _buildTabPill(id: 'financial', label: 'Finances', icon: LucideIcons.trendingUp),
        ],
      ),
    );
  }

  Widget _buildTabPill({
    required String id,
    required String label,
    required IconData icon,
  }) {
    final active = _activeTab == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = id),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active ? AppColors2026.cyanNeon : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 13,
                color: active ? AppColors2026.abyss : AppColors2026.textMuted,
              ),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: active ? FontWeight.w900 : FontWeight.w600,
                    color: active ? AppColors2026.abyss : AppColors2026.textMuted,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 3. BENTO KPI GRID (Matching DashboardStats.tsx)
  // ---------------------------------------------------------------------------
  Widget _buildBentoKpiGrid({
    required int totalVehicles,
    required int availableVeh,
    required int rentedVeh,
    required int occupancyRate,
    required double monthlyRev,
    required double netProfit,
    required int profitMargin,
    required int activeContractsCount,
    required int overdueCount,
    required int customersCount,
    required NumberFormat currencyFmt,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth > 640 ? 4 : 2;
        return GridView.count(
          crossAxisCount: cols,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: constraints.maxWidth > 640 ? 1.4 : 1.10,
          children: [
            // Revenue Card
            _BentoTile2026(
              title: "Recette Mensuelle",
              value: "${currencyFmt.format(monthlyRev.round())} DH",
              subtitle: "Marge : ${netProfit >= 0 ? '+' : ''}${currencyFmt.format(netProfit.round())} DH ($profitMargin%)",
              icon: LucideIcons.banknote,
              color: AppColors2026.emeraldNeon,
              badge: netProfit >= 0 ? "Rentable" : "Déficit",
              badgeColor: netProfit >= 0 ? AppColors2026.emeraldNeon : AppColors2026.roseLaser,
              onTap: () => widget.appState.setActiveTab(4),
            ),
            // Flotte & Taux d'occupation
            _BentoTile2026(
              title: "Occupation Flotte",
              value: "$occupancyRate%",
              subtitle: "$rentedVeh loués sur $totalVehicles",
              icon: LucideIcons.car,
              color: AppColors2026.cyanBright,
              badge: "$availableVeh libres",
              badgeColor: AppColors2026.cyanBright,
              onTap: () => widget.appState.setActiveTab(2),
            ),
            // Contrats en cours
            _BentoTile2026(
              title: "Contrats en Cours",
              value: "$activeContractsCount",
              subtitle: overdueCount > 0 ? "$overdueCount en retard !" : "Flotte opérationnelle",
              icon: LucideIcons.fileText,
              color: overdueCount > 0 ? AppColors2026.roseLaser : AppColors2026.violetElectric,
              badge: overdueCount > 0 ? "Retards" : "Actifs",
              badgeColor: overdueCount > 0 ? AppColors2026.roseLaser : AppColors2026.violetElectric,
              onTap: () => widget.appState.setActiveTab(3),
            ),
            // CRM Clients
            _BentoTile2026(
              title: "Portefeuille Clients",
              value: "$customersCount",
              subtitle: "Locataires & conducteurs",
              icon: LucideIcons.users,
              color: AppColors2026.amberSolar,
              badge: "CRM 2026",
              badgeColor: AppColors2026.amberSolar,
              onTap: () => widget.appState.setActiveTab(1),
            ),
          ],
        );
      },
    );
  }

  // ---------------------------------------------------------------------------
  // 4. TODAY OPERATIONS HUB (Matching TodayOperationsHub.tsx)
  // ---------------------------------------------------------------------------
  Widget _buildTodayOperationsHub({
    required List<ContractModel> todayReturns,
    required List<ContractModel> overdueContracts,
    required List<ContractModel> todayDepartures,
    required NumberFormat currencyFmt,
  }) {
    List<ContractModel> displayList;
    String emptyMsg;
    Color accentColor;

    if (_opsFilter == 'overdue') {
      displayList = overdueContracts;
      emptyMsg = 'Aucun retard critique détecté.';
      accentColor = AppColors2026.roseLaser;
    } else if (_opsFilter == 'departures') {
      displayList = todayDepartures;
      emptyMsg = 'Aucun départ prévu aujourd\'hui.';
      accentColor = AppColors2026.cyanNeon;
    } else {
      displayList = todayReturns;
      emptyMsg = 'Aucune restitution prévue aujourd\'hui.';
      accentColor = AppColors2026.amberSolar;
    }

    return SpatialGlassCard(
      padding: const EdgeInsets.all(16),
      borderColor: accentColor.withOpacity(0.35),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: accentColor.withOpacity(0.16),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(LucideIcons.calendarClock,
                          size: 15, color: accentColor),
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'OPÉRATIONS DU JOUR',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => widget.appState.setActiveTab(3),
                child: const Text('Voir Contrats',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Mini Filters: Retours (x), Retards (x), Départs (x)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _OpsFilterChip(
                  label: "Restitutions (${todayReturns.length})",
                  selected: _opsFilter == 'returns',
                  color: AppColors2026.amberSolar,
                  onTap: () => setState(() => _opsFilter = 'returns'),
                ),
                const SizedBox(width: 6),
                _OpsFilterChip(
                  label: "Retards (${overdueContracts.length})",
                  selected: _opsFilter == 'overdue',
                  color: AppColors2026.roseLaser,
                  onTap: () => setState(() => _opsFilter = 'overdue'),
                ),
                const SizedBox(width: 6),
                _OpsFilterChip(
                  label: "Départs (${todayDepartures.length})",
                  selected: _opsFilter == 'departures',
                  color: AppColors2026.cyanBright,
                  onTap: () => setState(() => _opsFilter = 'departures'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (displayList.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 18),
              child: Center(
                child: Text(
                  emptyMsg,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors2026.textMuted),
                ),
              ),
            )
          else
            ...displayList.take(4).map((c) {
              final isOverdueItem = _opsFilter == 'overdue';
              final whatsappMsg = isOverdueItem
                  ? "Bonjour ${c.customerName}, la restitution du véhicule ${c.vehicle} est en retard. Merci de nous contacter d'urgence pour régulariser votre contrat SFT Location."
                  : "Bonjour ${c.customerName}, nous vous rappelons que la restitution de votre véhicule ${c.vehicle} est prévue aujourd'hui. Merci de préparer le véhicule pour le check-in.";

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: accentColor.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isOverdueItem
                            ? LucideIcons.alertTriangle
                            : LucideIcons.clock,
                        size: 15,
                        color: accentColor,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${c.customerName} • ${c.vehicle}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            'Contrat ${c.contractNumber} • Fin : ${c.effectiveEndDate}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors2026.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (c.customerPhone.isNotEmpty) ...[
                      IconButton(
                        tooltip: 'Message WhatsApp',
                        padding: const EdgeInsets.all(6),
                        constraints: const BoxConstraints(),
                        onPressed: () =>
                            _openWhatsApp(c.customerPhone, whatsappMsg),
                        icon: const Icon(LucideIcons.messageCircle,
                            size: 16, color: AppColors2026.emeraldNeon),
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        tooltip: 'Appeler',
                        padding: const EdgeInsets.all(6),
                        constraints: const BoxConstraints(),
                        onPressed: () => _callPhone(c.customerPhone),
                        icon: const Icon(LucideIcons.phone,
                            size: 16, color: AppColors2026.cyanBright),
                      ),
                    ],
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 5. FLEET RADAR DONUT & OCCUPANCY (Matching FleetRadarCard.tsx)
  // ---------------------------------------------------------------------------
  Widget _buildFleetRadarCard({
    required int totalVehicles,
    required int availableVeh,
    required int rentedVeh,
    required int maintVeh,
    required int occupancyRate,
  }) {
    return SpatialGlassCard(
      padding: const EdgeInsets.all(16),
      borderColor: AppColors2026.cyanBright.withOpacity(0.3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: AppColors2026.cyanBright.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(LucideIcons.gauge,
                          size: 15, color: AppColors2026.cyanBright),
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'DISPONIBILITÉ & PARC AUTO',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => widget.appState.setActiveTab(2),
                child: const Text('Parc Auto',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 16),

          Row(
            children: [
              // Circular Donut Gauge
              SizedBox(
                width: 100,
                height: 100,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    PieChart(
                      PieChartData(
                        sectionsSpace: 4,
                        centerSpaceRadius: 36,
                        startDegreeOffset: -90,
                        sections: [
                          PieChartSectionData(
                            color: AppColors2026.cyanBright,
                            value: math.max(rentedVeh.toDouble(), 0.01),
                            title: '',
                            radius: 12,
                          ),
                          PieChartSectionData(
                            color: AppColors2026.emeraldNeon,
                            value: math.max(availableVeh.toDouble(), 0.01),
                            title: '',
                            radius: 12,
                          ),
                          PieChartSectionData(
                            color: AppColors2026.amberSolar,
                            value: math.max(maintVeh.toDouble(), 0.01),
                            title: '',
                            radius: 12,
                          ),
                        ],
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$occupancyRate%',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const Text(
                          'Loué',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: AppColors2026.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 18),

              // Breakdown specs
              Expanded(
                child: Column(
                  children: [
                    _FleetBreakdownRow(
                      label: "Véhicules Loués",
                      count: rentedVeh,
                      color: AppColors2026.cyanBright,
                    ),
                    const SizedBox(height: 8),
                    _FleetBreakdownRow(
                      label: "Véhicules Disponibles",
                      count: availableVeh,
                      color: AppColors2026.emeraldNeon,
                    ),
                    const SizedBox(height: 8),
                    _FleetBreakdownRow(
                      label: "En Maintenance / Révision",
                      count: maintVeh,
                      color: AppColors2026.amberSolar,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 6. REVENUE EVOLUTION AREA CHART (Last 6 months)
  // ---------------------------------------------------------------------------
  Widget _buildRevenueEvolutionCard(NumberFormat currencyFmt) {
    final now = DateTime.now();
    final spots = <FlSpot>[];
    final labels = <String>[];

    for (int i = 5; i >= 0; i--) {
      final mDate = DateTime(now.year, now.month - i, 1);
      labels.add(DateFormat('MMM').format(mDate));
      double mSum = 0;
      for (final c in widget.appState.contracts) {
        final dt =
            DateTime.tryParse(c.createdAt) ?? DateTime.tryParse(c.startDate);
        if (dt != null && dt.year == mDate.year && dt.month == mDate.month) {
          mSum += c.totalAmount;
        }
      }
      spots.add(FlSpot((5 - i).toDouble(), mSum));
    }

    final maxY = spots
        .map((s) => s.y)
        .fold<double>(1000, (prev, el) => el > prev ? el : prev);

    return SpatialGlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ÉVOLUTION DU C.A.',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: AppColors2026.textSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Trajectoire Mensuelle',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              NeonBadge(
                label: '${currencyFmt.format(widget.appState.monthlyRevenue.round())} DH',
                color: AppColors2026.emeraldNeon,
              ),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                minY: 0,
                maxY: maxY * 1.25,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: Colors.white.withOpacity(0.06),
                    strokeWidth: 1,
                  ),
                ),
                titlesData: FlTitlesData(
                  rightTitles:
                      const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles:
                      const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  leftTitles:
                      const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (val, _) {
                        final idx = val.toInt();
                        if (idx < 0 || idx >= labels.length) {
                          return const SizedBox();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            labels[idx],
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: AppColors2026.textSecondary,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    curveSmoothness: 0.35,
                    color: AppColors2026.emeraldNeon,
                    barWidth: 3.5,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(
                        radius: 4,
                        color: AppColors2026.emeraldBright,
                        strokeWidth: 2,
                        strokeColor: Colors.white,
                      ),
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppColors2026.emeraldNeon.withOpacity(0.35),
                          AppColors2026.cyanNeon.withOpacity(0.02),
                        ],
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

  // ---------------------------------------------------------------------------
  // 7. GPS RADAR LIVE CARD
  // ---------------------------------------------------------------------------
  Widget _buildGpsRadarLiveCard(AppStateProvider app) {
    return SpatialGlassCard(
      padding: const EdgeInsets.all(16),
      borderColor: AppColors2026.amberSolar.withOpacity(0.3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Row(
                  children: [
                    Icon(LucideIcons.radio,
                        color: AppColors2026.amberSolar, size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'TÉLÉMÉTRIE GPS LIVE',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => app.setActiveTab(5),
                child: const Text('Ouvrir Carte',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (app.gpsDevices.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: Text(
                  'Aucun traceur GPS connecté pour le moment.',
                  style: TextStyle(
                      fontSize: 12, color: AppColors2026.textMuted),
                ),
              ),
            )
          else
            ...app.gpsDevices.take(3).map((d) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  children: [
                    AnimatedPulseDot(color: d.statusColor, size: 8),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            d.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                          Text(
                            '${d.plate} • ${d.statusLabel}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors2026.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    NeonBadge(
                      label: '${d.speed.round()} km/h',
                      color: d.statusColor,
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 8. FINANCIAL BREAKDOWN CARD
  // ---------------------------------------------------------------------------
  Widget _buildFinancialBreakdownCard({
    required double monthlyRev,
    required double monthlyCost,
    required double netProfit,
    required NumberFormat currencyFmt,
  }) {
    return SpatialGlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'STRUCTURE FINANCIÈRE MENSUELLE',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 14),
          _FinSummaryRow(
            label: "Total Chiffre d'Affaires",
            amount: "${currencyFmt.format(monthlyRev.round())} DH",
            color: AppColors2026.cyanBright,
          ),
          const Divider(height: 18, color: Colors.white10),
          _FinSummaryRow(
            label: "Charges, Entretien & Réparations",
            amount: "- ${currencyFmt.format(monthlyCost.round())} DH",
            color: AppColors2026.roseLaser,
          ),
          const Divider(height: 18, color: Colors.white10),
          _FinSummaryRow(
            label: "Bénéfice Net d'Exploitation",
            amount: "${currencyFmt.format(netProfit.round())} DH",
            color: netProfit >= 0
                ? AppColors2026.emeraldNeon
                : AppColors2026.roseLaser,
            isBold: true,
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 9. RECENT CONTRACTS LIST
  // ---------------------------------------------------------------------------
  Widget _buildRecentContractsList(AppStateProvider app, NumberFormat currencyFmt) {
    return SpatialGlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'DERNIERS DOSSIERS CONTRATS',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              TextButton(
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => app.setActiveTab(3),
                child: const Text('Voir tout',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (app.contracts.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: Text('Aucun contrat disponible.',
                    style: TextStyle(color: AppColors2026.textMuted)),
              ),
            )
          else
            ...app.contracts.take(5).map((c) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: (c.isActive
                                ? AppColors2026.emeraldNeon
                                : AppColors2026.textMuted)
                            .withOpacity(0.16),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        LucideIcons.fileCheck,
                        size: 15,
                        color: c.isActive
                            ? AppColors2026.emeraldNeon
                            : AppColors2026.textSecondary,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${c.customerName} • ${c.vehicle}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            '${c.contractNumber} • Du ${c.startDate} au ${c.endDate}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 11, color: AppColors2026.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        '${currencyFmt.format(c.totalAmount.round())} DH',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: AppColors2026.cyanBright,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// HELPER SUBWIDGETS
// -----------------------------------------------------------------------------

class _QuickActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.14),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BentoTile2026 extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;
  final String badge;
  final Color badgeColor;
  final VoidCallback onTap;

  const _BentoTile2026({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.badge,
    required this.badgeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.16),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, size: 16, color: color),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: badgeColor.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    badge,
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: badgeColor,
                    ),
                  ),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.3,
                    ),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors2026.textSecondary,
                  ),
                ),
                if (subtitle.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w600,
                      color: color.withOpacity(0.9),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _OpsFilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _OpsFilterChip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.2) : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? color : Colors.white12,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w900 : FontWeight.w600,
            color: selected ? color : AppColors2026.textMuted,
          ),
        ),
      ),
    );
  }
}

class _FleetBreakdownRow extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _FleetBreakdownRow({
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors2026.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        Text(
          '$count',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _FinSummaryRow extends StatelessWidget {
  final String label;
  final String amount;
  final Color color;
  final bool isBold;

  const _FinSummaryRow({
    required this.label,
    required this.amount,
    required this.color,
    this.isBold = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: isBold ? 13 : 12,
              fontWeight: isBold ? FontWeight.w900 : FontWeight.w600,
              color: isBold ? Colors.white : AppColors2026.textSecondary,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          amount,
          style: TextStyle(
            fontSize: isBold ? 15 : 13,
            fontWeight: FontWeight.w900,
            color: color,
          ),
        ),
      ],
    );
  }
}
