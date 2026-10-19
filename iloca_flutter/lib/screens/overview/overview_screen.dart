import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../providers/app_state_provider.dart';

/// 1. OVERVIEW SCREEN (Tableau de Bord Spatial 2026)
class OverviewScreen extends StatelessWidget {
  final AppStateProvider appState;

  const OverviewScreen({super.key, required this.appState});

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'fr_FR');
    final totalVehicles = appState.vehicles.length;
    final availableVeh = appState.availableVehiclesCount;
    final rentedVeh = appState.rentedVehiclesCount;
    final maintVeh = appState.maintenanceVehiclesCount;
    final activeContracts = appState.activeContractsCount;
    final monthlyRev = appState.monthlyRevenue;
    final monthlyCost = appState.monthlyExpensesAndRepairs;
    final netProfit = monthlyRev - monthlyCost;
    final gpsOnlineCount =
        appState.gpsDevices.where((d) => d.online).length;
    final gpsMovingCount =
        appState.gpsDevices.where((d) => d.status == 'moving').length;

    return RefreshIndicator(
      color: AppColors2026.cyanNeon,
      onRefresh: appState.refreshAllData,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
        children: [
          // 1. Hero Spatial Banner with Real-Time Cloud Sync Status
          SpatialGlassCard(
            glowColor: AppColors2026.cyanNeon,
            borderColor: AppColors2026.cyanNeon.withOpacity(0.35),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const NeonBadge(
                      label: 'COCKPIT CENTRAL • SYNC LIVE',
                      color: AppColors2026.emeraldNeon,
                      pulsing: true,
                    ),
                    Text(
                      DateFormat('dd MMM yyyy • HH:mm')
                          .format(appState.lastSyncTime),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors2026.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Text(
                  'Performance & Télémétrie SFT',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Synchronisation instantanée bidirectionnelle entre Web, Android et iOS.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors2026.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                // Quick Action Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _QuickActionChip(
                        icon: LucideIcons.filePlus,
                        label: 'Nouveau Contrat',
                        color: AppColors2026.cyanNeon,
                        onTap: () => appState.setActiveTab(3),
                      ),
                      const SizedBox(width: 8),
                      _QuickActionChip(
                        icon: LucideIcons.userPlus,
                        label: 'Ajouter Client',
                        color: AppColors2026.emeraldNeon,
                        onTap: () => appState.setActiveTab(1),
                      ),
                      const SizedBox(width: 8),
                      _QuickActionChip(
                        icon: LucideIcons.car,
                        label: 'Gérer Parc',
                        color: AppColors2026.violetElectric,
                        onTap: () => appState.setActiveTab(2),
                      ),
                      const SizedBox(width: 8),
                      _QuickActionChip(
                        icon: LucideIcons.mapPin,
                        label: 'Carte & Traceur',
                        color: AppColors2026.amberSolar,
                        onTap: () => appState.setActiveTab(5),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 2. 2026 Bento Grid KPIs
          LayoutBuilder(
            builder: (context, constraints) {
              final cols = constraints.maxWidth > 680 ? 4 : 2;
              return GridView.count(
                crossAxisCount: cols,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.25,
                children: [
                  BentoMetricTile(
                    title: 'Revenu Mensuel',
                    value: '${currencyFmt.format(monthlyRev)} DH',
                    subtitle: 'Net: ${currencyFmt.format(netProfit)} DH',
                    icon: LucideIcons.trendingUp,
                    accentColor: AppColors2026.emeraldNeon,
                    badgeText: 'Mois actif',
                    onTap: () => appState.setActiveTab(4),
                  ),
                  BentoMetricTile(
                    title: 'Parc Automobile',
                    value: '$totalVehicles Véhicules',
                    subtitle: '$availableVeh Dispo • $rentedVeh Loués',
                    icon: LucideIcons.car,
                    accentColor: AppColors2026.cyanNeon,
                    badgeText: maintVeh > 0 ? '$maintVeh Atelier' : '100% Prêt',
                    onTap: () => appState.setActiveTab(2),
                  ),
                  BentoMetricTile(
                    title: 'Contrats Actifs',
                    value: '$activeContracts Contrats',
                    subtitle: 'Sur ${appState.contracts.length} au total',
                    icon: LucideIcons.fileText,
                    accentColor: AppColors2026.violetElectric,
                    badgeText: 'En cours',
                    onTap: () => appState.setActiveTab(3),
                  ),
                  BentoMetricTile(
                    title: 'Clients & Radar GPS',
                    value: '${appState.clients.length} Clients',
                    subtitle:
                        '$gpsOnlineCount GPS en ligne ($gpsMovingCount roulants)',
                    icon: LucideIcons.radio,
                    accentColor: AppColors2026.amberSolar,
                    badgeText: 'GPS Live',
                    onTap: () => appState.setActiveTab(5),
                  ),
                ],
              );
            },
          ),

          const SizedBox(height: 16),

          // 3. Interactive Revenue Evolution Chart (2026 Neon Area Chart)
          SpatialGlassCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'TRAJECTOIRE DES REVENUS (6 DERNIERS MOIS)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: AppColors2026.textSecondary,
                            letterSpacing: 0.6,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Flux Financier & Contrats',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    NeonBadge(
                      label: '${currencyFmt.format(monthlyRev)} DH',
                      color: AppColors2026.cyanNeon,
                      icon: LucideIcons.dollarSign,
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  height: 190,
                  child: _buildRevenueChart(),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 4. Live Fleet Radar & GPS Status Strip
          SpatialGlassCard(
            padding: const EdgeInsets.all(18),
            borderColor: AppColors2026.emeraldNeon.withOpacity(0.28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.compass,
                            color: AppColors2026.emeraldNeon, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'RADAR TÉLÉMÉTRIE GPSWOX EN DIRECT',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                    TextButton.icon(
                      onPressed: () => appState.setActiveTab(5),
                      icon: const Icon(LucideIcons.map, size: 14),
                      label: const Text(
                        'Ouvrir Carte',
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (appState.gpsDevices.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'Aucun traceur GPS actif détecté pour le moment.',
                      style: TextStyle(
                          fontSize: 12, color: AppColors2026.textSecondary),
                    ),
                  )
                else
                  ...appState.gpsDevices.take(4).map((d) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.04),
                        borderRadius: BorderRadius.circular(16),
                        border:
                            Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Row(
                        children: [
                          AnimatedPulseDot(color: d.statusColor, size: 9),
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
          ),

          const SizedBox(height: 16),

          // 5. Recent Contracts & Operations
          SpatialGlassCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'DERNIERS CONTRATS SYNCHRONISÉS',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.4,
                      ),
                    ),
                    TextButton(
                      onPressed: () => appState.setActiveTab(3),
                      child: const Text('Voir tout'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (appState.contracts.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'Aucun contrat enregistré.',
                      style: TextStyle(
                          fontSize: 12, color: AppColors2026.textSecondary),
                    ),
                  )
                else
                  ...appState.contracts.take(5).map((c) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.03),
                        borderRadius: BorderRadius.circular(16),
                        border:
                            Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(9),
                            decoration: BoxDecoration(
                              color: (c.isActive
                                      ? AppColors2026.emeraldNeon
                                      : AppColors2026.textMuted)
                                  .withOpacity(0.16),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              LucideIcons.fileCheck,
                              size: 16,
                              color: c.isActive
                                  ? AppColors2026.emeraldNeon
                                  : AppColors2026.textSecondary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${c.customerName} • ${c.vehicle}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  '${c.contractNumber} • Du ${c.startDate} au ${c.endDate}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors2026.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '${currencyFmt.format(c.totalAmount)} DH',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                              color: AppColors2026.cyanBright,
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

  Widget _buildRevenueChart() {
    final now = DateTime.now();
    final spots = <FlSpot>[];
    final labels = <String>[];

    for (int i = 5; i >= 0; i--) {
      final mDate = DateTime(now.year, now.month - i, 1);
      labels.add(DateFormat('MMM').format(mDate));
      double mSum = 0;
      for (final c in appState.contracts) {
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

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: maxY * 1.2,
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
                if (idx < 0 || idx >= labels.length) return const SizedBox();
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
            color: AppColors2026.cyanNeon,
            barWidth: 3.5,
            dotData: FlDotData(
              show: true,
              getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(
                radius: 4,
                color: AppColors2026.cyanBright,
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
                  AppColors2026.cyanNeon.withOpacity(0.35),
                  AppColors2026.emeraldNeon.withOpacity(0.02),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.14),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 7),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
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
