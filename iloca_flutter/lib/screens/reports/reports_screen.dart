import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../providers/app_state_provider.dart';

/// 5. RAPPORTS SCREEN (Analytiques, Rentabilité Flotte & Export 2026)
class ReportsScreen extends StatefulWidget {
  final AppStateProvider appState;

  const ReportsScreen({super.key, required this.appState});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  String _subTab = 'finance'; // 'finance' | 'fleet' | 'tenants'

  void _exportSummary() {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final totalRev = widget.appState.contracts
        .fold<double>(0, (sum, c) => sum + c.totalAmount);
    final monthRev = widget.appState.monthlyRevenue;
    final costs = widget.appState.monthlyExpensesAndRepairs;

    final report = '''
============================================
RAPPORT ANALYTIQUE SFT LOCATION - ÉDITION 2026
Date : ${DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now())}
============================================
• Chiffre d'affaires cumulé : ${fmt.format(totalRev)} DH
• Revenu du mois en cours : ${fmt.format(monthRev)} DH
• Charges & Réparations (Mois) : ${fmt.format(costs)} DH
• Bénéfice Net Mensuel : ${fmt.format(monthRev - costs)} DH
• Véhicules au parc : ${widget.appState.vehicles.length} (${widget.appState.availableVehiclesCount} disponibles, ${widget.appState.rentedVehiclesCount} loués)
• Contrats enregistrés : ${widget.appState.contracts.length} (${widget.appState.activeContractsCount} actifs)
• Clients enregistrés : ${widget.appState.clients.length}
============================================
''';
    Share.share(report, subject: 'Rapport Financier & Flotte iLoca SFT 2026');
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final contracts = widget.appState.contracts;
    final totalRevenue =
        contracts.fold<double>(0, (sum, c) => sum + c.totalAmount);
    final monthlyRev = widget.appState.monthlyRevenue;
    final monthlyCosts = widget.appState.monthlyExpensesAndRepairs;
    final netResult = monthlyRev - monthlyCosts;

    // Revenue by Vehicle
    final byVehicle = <String, double>{};
    for (final c in contracts) {
      final k = c.vehicle.isEmpty ? 'Véhicule' : c.vehicle;
      byVehicle[k] = (byVehicle[k] ?? 0) + c.totalAmount;
    }
    final topVehicles = byVehicle.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    // Revenue by Client
    final byClient = <String, double>{};
    for (final c in contracts) {
      final k = c.customerName.isEmpty ? 'Client' : c.customerName;
      byClient[k] = (byClient[k] ?? 0) + c.totalAmount;
    }
    final topClients = byClient.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 130),
      children: [
        // Top Header & Export Button
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'INTELLIGENCE FINANCIÈRE & RAPPORTS',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors2026.cyanBright,
                      letterSpacing: 0.7,
                    ),
                  ),
                  Text(
                    'Bilan & Rentabilité',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              onPressed: _exportSummary,
              icon: const Icon(LucideIcons.share2, size: 15),
              label: const Text('Exporter'),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // KPI Summary Grid
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.05,
          children: [
            BentoMetricTile(
              title: 'CA Global Cumulé',
              value: '${fmt.format(totalRevenue)} DH',
              subtitle: '${contracts.length} contrats',
              icon: LucideIcons.trophy,
              accentColor: AppColors2026.cyanNeon,
            ),
            BentoMetricTile(
              title: 'Résultat Net (Mois)',
              value: '${fmt.format(netResult)} DH',
              subtitle: 'Charges: ${fmt.format(monthlyCosts)} DH',
              icon: LucideIcons.trendingUp,
              accentColor: netResult >= 0
                  ? AppColors2026.emeraldNeon
                  : AppColors2026.roseLaser,
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Sub-navigation Pills
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _ReportTabButton(
                label: 'Finance',
                icon: LucideIcons.dollarSign,
                selected: _subTab == 'finance',
                onTap: () => setState(() => _subTab = 'finance'),
              ),
              const SizedBox(width: 8),
              _ReportTabButton(
                label: 'Par Véhicule',
                icon: LucideIcons.car,
                selected: _subTab == 'fleet',
                onTap: () => setState(() => _subTab = 'fleet'),
              ),
              const SizedBox(width: 8),
              _ReportTabButton(
                label: 'Top Locataires',
                icon: LucideIcons.users,
                selected: _subTab == 'tenants',
                onTap: () => setState(() => _subTab = 'tenants'),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        if (_subTab == 'finance')
          SpatialGlassCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'RÉPARTITION PAR MODE DE PAIEMENT',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 180,
                  child: _buildPaymentBarChart(),
                ),
              ],
            ),
          )
        else if (_subTab == 'fleet')
          SpatialGlassCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CLASSEMENT DE RENTABILITÉ PAR VÉHICULE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 12),
                if (topVehicles.isEmpty)
                  const Text(
                    'Aucune donnée disponible.',
                    style: TextStyle(color: AppColors2026.textSecondary),
                  )
                else
                  ...topVehicles.take(8).map((entry) {
                    final maxVal = topVehicles.first.value > 0
                        ? topVehicles.first.value
                        : 1;
                    final pct = (entry.value / maxVal).clamp(0.05, 1.0);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  entry.key,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              Text(
                                '${fmt.format(entry.value)} DH',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  color: AppColors2026.cyanBright,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(99),
                            child: LinearProgressIndicator(
                              value: pct,
                              minHeight: 7,
                              backgroundColor: Colors.white10,
                              color: AppColors2026.cyanNeon,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          )
        else
          SpatialGlassCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'MEILLEURS CLIENTS / LOCATAIRES FIDÈLES',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 12),
                if (topClients.isEmpty)
                  const Text(
                    'Aucun client facturé.',
                    style: TextStyle(color: AppColors2026.textSecondary),
                  )
                else
                  ...topClients.take(8).map((entry) {
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor:
                            AppColors2026.emeraldNeon.withOpacity(0.2),
                        child: const Icon(LucideIcons.award,
                            color: AppColors2026.emeraldNeon, size: 18),
                      ),
                      title: Text(
                        entry.key,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                      trailing: NeonBadge(
                        label: '${fmt.format(entry.value)} DH',
                        color: AppColors2026.emeraldNeon,
                      ),
                    );
                  }),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildPaymentBarChart() {
    double especes = 0;
    double cheque = 0;
    double virement = 0;

    for (final c in widget.appState.contracts) {
      final m = c.paymentMethod.toLowerCase();
      if (m.contains('chèque') || m.contains('cheque')) {
        cheque += c.totalAmount;
      } else if (m.contains('virement')) {
        virement += c.totalAmount;
      } else {
        especes += c.totalAmount;
      }
    }

    final maxVal = [especes, cheque, virement, 1000.0]
        .reduce((a, b) => a > b ? a : b);

    return BarChart(
      BarChartData(
        maxY: maxVal * 1.2,
        borderData: FlBorderData(show: false),
        gridData: const FlGridData(show: false),
        titlesData: FlTitlesData(
          leftTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (val, _) {
                final labels = ['Espèces', 'Chèque', 'Virement'];
                final i = val.toInt();
                if (i < 0 || i >= labels.length) return const SizedBox();
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    labels[i],
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppColors2026.textSecondary,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        barGroups: [
          BarChartGroupData(
            x: 0,
            barRods: [
              BarChartRodData(
                toY: especes,
                color: AppColors2026.emeraldNeon,
                width: 28,
                borderRadius: BorderRadius.circular(8),
              ),
            ],
          ),
          BarChartGroupData(
            x: 1,
            barRods: [
              BarChartRodData(
                toY: cheque,
                color: AppColors2026.amberSolar,
                width: 28,
                borderRadius: BorderRadius.circular(8),
              ),
            ],
          ),
          BarChartGroupData(
            x: 2,
            barRods: [
              BarChartRodData(
                toY: virement,
                color: AppColors2026.cyanNeon,
                width: 28,
                borderRadius: BorderRadius.circular(8),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ReportTabButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _ReportTabButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? AppColors2026.cyanNeon
              : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors2026.cyanNeon : Colors.white10,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: selected ? AppColors2026.abyss : Colors.white,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: selected ? AppColors2026.abyss : Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
