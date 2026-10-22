import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/utils/whatsapp_helper.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

/// 5. RAPPORTS SCREEN (Analytiques Financières, Rentabilité Parc & CRM 2026)
class ReportsScreen extends StatefulWidget {
  final AppStateProvider appState;

  const ReportsScreen({super.key, required this.appState});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  String _activeTab = 'finance'; // 'finance' | 'fleet' | 'tenants' | 'invoices'
  String _periodFilter = 'all'; // 'all' | 'month' | 'quarter' | 'year'

  DateTime? _getPeriodStartDate() {
    final now = DateTime.now();
    switch (_periodFilter) {
      case 'month':
        return DateTime(now.year, now.month, 1);
      case 'quarter':
        return DateTime(now.year, now.month - 2, 1);
      case 'year':
        return DateTime(now.year, 1, 1);
      default:
        return null;
    }
  }

  List<ContractModel> _getFilteredContracts() {
    final start = _getPeriodStartDate();
    if (start == null) return widget.appState.contracts;
    return widget.appState.contracts.where((c) {
      final dt = DateTime.tryParse(c.startDate) ?? DateTime.tryParse(c.createdAt);
      if (dt == null) return true;
      return !dt.isBefore(start);
    }).toList();
  }

  void _exportReportSummary() {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final contracts = _getFilteredContracts();
    final totalRev = contracts.fold<double>(0, (sum, c) => sum + c.totalAmount);
    final totalAdvance = contracts.fold<double>(0, (sum, c) => sum + c.advancePayment);
    final totalRemaining = contracts.fold<double>(0, (sum, c) => sum + c.remainingAmount);
    final monthRev = widget.appState.monthlyRevenue;
    final costs = widget.appState.monthlyExpensesAndRepairs;
    final net = monthRev - costs;

    final periodLabel = _periodFilter == 'month'
        ? 'Mois en cours'
        : _periodFilter == 'quarter'
            ? '3 Derniers Mois'
            : _periodFilter == 'year'
                ? 'Année 2026'
                : 'Tout l\'Historique';

    final text = '''
📊 *RAPPORT D'ACTIVITÉ BONATOURS*
📅 Date: ${DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now())}
🏷️ Période: $periodLabel
━━━━━━━━━━━━━━━━━━━━
💰 *BILAN FINANCIER*
• Chiffre d'Affaires Période : *${fmt.format(totalRev)} DH*
• Total Encaissé (Avances) : ${fmt.format(totalAdvance)} DH
• Reste à Recouvrer : *${fmt.format(totalRemaining)} DH*
• Revenu Mois en cours : ${fmt.format(monthRev)} DH
• Charges & Ateliers : ${fmt.format(costs)} DH
• Bénéfice Net Mensuel : *${fmt.format(net)} DH*

🚗 *ÉTAT DE LA FLOTTE*
• Total Véhicules : ${widget.appState.vehicles.length}
• Loués Actuellement : ${widget.appState.rentedVehiclesCount} (${(widget.appState.vehicles.isEmpty ? 0 : (widget.appState.rentedVehiclesCount / widget.appState.vehicles.length * 100)).round()}%)
• Disponibles : ${widget.appState.availableVehiclesCount}
• En Atelier / Maintenance : ${widget.appState.maintenanceVehiclesCount}

📋 *EXPLOITATION & CRM*
• Contrats Période : ${contracts.length} (${widget.appState.activeContractsCount} actifs)
• Base Clients : ${widget.appState.clients.length} locataires
• Factures Enregistrées : ${widget.appState.invoices.length}
━━━━━━━━━━━━━━━━━━━━
Généré automatiquement par l'application BonaTours.
''';

    WhatsAppHelper.shareTextMessage(phone: '', message: text);
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final contracts = _getFilteredContracts();
    final vehicles = widget.appState.vehicles;
    final invoices = widget.appState.invoices;

    // Financial KPIs
    final totalRevenue = contracts.fold<double>(0, (sum, c) => sum + c.totalAmount);
    final totalRemaining = contracts.fold<double>(0, (sum, c) => sum + c.remainingAmount);
    final monthlyRev = widget.appState.monthlyRevenue;
    final monthlyCosts = widget.appState.monthlyExpensesAndRepairs;
    final netProfit = monthlyRev - monthlyCosts;

    // Fleet Occupancy Rate
    final totalVehiclesCount = vehicles.length;
    final rentedCount = widget.appState.rentedVehiclesCount;
    final occupancyRate = totalVehiclesCount > 0
        ? ((rentedCount / totalVehiclesCount) * 100).round()
        : 0;

    // Revenue by Vehicle
    final byVehicle = <String, double>{};
    final byVehicleCount = <String, int>{};
    for (final c in contracts) {
      final k = c.vehicle.trim().isEmpty ? 'Véhicule SFT' : c.vehicle.trim();
      byVehicle[k] = (byVehicle[k] ?? 0) + c.totalAmount;
      byVehicleCount[k] = (byVehicleCount[k] ?? 0) + 1;
    }
    final topVehicles = byVehicle.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    // Revenue by Client
    final byClient = <String, double>{};
    final byClientCount = <String, int>{};
    for (final c in contracts) {
      final k = c.customerName.trim().isEmpty ? 'Client' : c.customerName.trim();
      byClient[k] = (byClient[k] ?? 0) + c.totalAmount;
      byClientCount[k] = (byClientCount[k] ?? 0) + 1;
    }
    final topClients = byClient.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return RefreshIndicator(
      color: AppColors2026.cyanNeon,
      onRefresh: widget.appState.refreshAllData,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 130),
        children: [
          // 1. Header with Title & WhatsApp Export Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TABLEAU DE BORD EXÉCUTIF',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors2026.cyanBright,
                        letterSpacing: 0.7,
                      ),
                    ),
                    Text(
                      'Rapports & Rentabilité',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              ElevatedButton.icon(
                onPressed: _exportReportSummary,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors2026.emeraldNeon.withOpacity(0.18),
                  foregroundColor: AppColors2026.emeraldBright,
                  side: BorderSide(color: AppColors2026.emeraldBright.withOpacity(0.55)),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(LucideIcons.share2, size: 14),
                label: const Text(
                  'Exporter',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 2. Period Filter Selector
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _periodPill('all', 'Tout l\'historique'),
                const SizedBox(width: 6),
                _periodPill('month', 'Ce mois'),
                const SizedBox(width: 6),
                _periodPill('quarter', '3 derniers mois'),
                const SizedBox(width: 6),
                _periodPill('year', 'Année 2026'),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 3. Four Key Executive KPI Cards
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.15,
            children: [
              BentoMetricTile(
                title: 'Chiffre d\'Affaires',
                value: '${fmt.format(totalRevenue.round())} DH',
                subtitle: '${contracts.length} contrats enregistrés',
                icon: LucideIcons.coins,
                accentColor: AppColors2026.cyanNeon,
              ),
              BentoMetricTile(
                title: 'Bénéfice Net (Mois)',
                value: '${fmt.format(netProfit.round())} DH',
                subtitle: 'Charges: ${fmt.format(monthlyCosts.round())} DH',
                icon: LucideIcons.trendingUp,
                accentColor: netProfit >= 0
                    ? AppColors2026.emeraldNeon
                    : AppColors2026.roseLaser,
              ),
              BentoMetricTile(
                title: 'Taux d\'Occupation',
                value: '$occupancyRate%',
                subtitle: '$rentedCount loués sur $totalVehiclesCount véhicules',
                icon: LucideIcons.car,
                accentColor: AppColors2026.amberSolar,
              ),
              BentoMetricTile(
                title: 'Reste à Recouvrer',
                value: '${fmt.format(totalRemaining.round())} DH',
                subtitle: '${contracts.where((c) => c.remainingAmount > 0).length} contrats avec solde',
                icon: LucideIcons.receipt,
                accentColor: totalRemaining > 0
                    ? AppColors2026.roseLaser
                    : AppColors2026.emeraldBright,
              ),
            ],
          ),

          const SizedBox(height: 16),

          // 4. Section Tabs Navigation Pills (Finance, Flotte, Locataires, Factures)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _tabPill('finance', 'Finances & Recettes', LucideIcons.dollarSign),
                const SizedBox(width: 6),
                _tabPill('fleet', 'Performance Flotte', LucideIcons.car),
                const SizedBox(width: 6),
                _tabPill('tenants', 'Locataires & CRM', LucideIcons.users),
                const SizedBox(width: 6),
                _tabPill('invoices', 'Factures & TVA', LucideIcons.receipt),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 5. Active Tab Body
          if (_activeTab == 'finance') ...[
            _buildFinanceSection(fmt, contracts, monthlyRev, monthlyCosts, netProfit),
          ] else if (_activeTab == 'fleet') ...[
            _buildFleetSection(fmt, vehicles, topVehicles, byVehicleCount),
          ] else if (_activeTab == 'tenants') ...[
            _buildTenantsSection(fmt, topClients, byClientCount),
          ] else if (_activeTab == 'invoices') ...[
            _buildInvoicesSection(fmt, invoices),
          ],
        ],
      ),
    );
  }

  // =========================================================================
  // SUB-SECTIONS (FINANCES, FLOTTE, LOCATAIRES, FACTURES)
  // =========================================================================

  Widget _buildFinanceSection(
    NumberFormat fmt,
    List<ContractModel> contracts,
    double monthlyRev,
    double monthlyCosts,
    double netProfit,
  ) {
    return Column(
      children: [
        // Payment method distribution
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.wallet, size: 16, color: AppColors2026.cyanBright),
                  SizedBox(width: 8),
                  Text(
                    'RÉPARTITION PAR MODE DE PAIEMENT',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 170,
                child: _buildPaymentBarChart(contracts),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Monthly Financial Health Summary
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.pieChart, size: 16, color: AppColors2026.emeraldNeon),
                  SizedBox(width: 8),
                  Text(
                    'SANTÉ FINANCIÈRE MENSUELLE',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _financialRow('Revenus Mensuels (Entrées)', '${fmt.format(monthlyRev.round())} DH', AppColors2026.emeraldBright),
              const Divider(height: 14, color: Colors.white10),
              _financialRow('Charges & Entretien Atelier (Sorties)', '${fmt.format(monthlyCosts.round())} DH', AppColors2026.roseLaser),
              const Divider(height: 14, color: Colors.white10),
              _financialRow('Résultat d\'Exploitation Net', '${fmt.format(netProfit.round())} DH', netProfit >= 0 ? AppColors2026.emeraldBright : AppColors2026.roseLaser, isBold: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFleetSection(
    NumberFormat fmt,
    List<VehicleModel> vehicles,
    List<MapEntry<String, double>> topVehicles,
    Map<String, int> counts,
  ) {
    final available = widget.appState.availableVehiclesCount;
    final rented = widget.appState.rentedVehiclesCount;
    final maint = widget.appState.maintenanceVehiclesCount;

    return Column(
      children: [
        // Fleet Status Breakdown
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.activity, size: 16, color: AppColors2026.amberSolar),
                  SizedBox(width: 8),
                  Text(
                    'DISPONIBILITÉ DU PARC AUTOMOBILE',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _fleetStatusBox('En Location', rented, AppColors2026.emeraldNeon),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _fleetStatusBox('Disponibles', available, AppColors2026.cyanNeon),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _fleetStatusBox('En Atelier', maint, AppColors2026.amberSolar),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Most Profitable Vehicles Ranking
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(LucideIcons.trophy, size: 16, color: AppColors2026.amberSolar),
                      SizedBox(width: 8),
                      Text(
                        'VÉHICULES LES PLUS RENTABLES',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  Text('Par CA généré', style: TextStyle(fontSize: 10, color: AppColors2026.textMuted)),
                ],
              ),
              const SizedBox(height: 14),
              if (topVehicles.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(
                    child: Text('Aucune donnée de location sur cette période.', style: TextStyle(color: AppColors2026.textSecondary)),
                  ),
                )
              else
                ...topVehicles.take(8).toList().asMap().entries.map((entry) {
                  final rank = entry.key + 1;
                  final item = entry.value;
                  final maxVal = topVehicles.first.value > 0 ? topVehicles.first.value : 1;
                  final pct = (item.value / maxVal).clamp(0.05, 1.0);
                  final cnt = counts[item.key] ?? 1;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 22,
                              height: 22,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: rank <= 3
                                    ? AppColors2026.amberSolar.withOpacity(0.2)
                                    : Colors.white10,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '#$rank',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  color: rank <= 3 ? AppColors2026.amberSolar : Colors.white70,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                item.key,
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                              ),
                            ),
                            Text(
                              '$cnt loc. • ',
                              style: const TextStyle(fontSize: 11, color: AppColors2026.textMuted),
                            ),
                            Text(
                              '${fmt.format(item.value.round())} DH',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors2026.cyanBright),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            value: pct,
                            minHeight: 6,
                            backgroundColor: Colors.white10,
                            color: rank == 1
                                ? AppColors2026.amberSolar
                                : rank == 2
                                    ? AppColors2026.cyanNeon
                                    : AppColors2026.violetElectric,
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
    );
  }

  Widget _buildTenantsSection(
    NumberFormat fmt,
    List<MapEntry<String, double>> topClients,
    Map<String, int> counts,
  ) {
    return SpatialGlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(LucideIcons.award, size: 16, color: AppColors2026.emeraldNeon),
                  SizedBox(width: 8),
                  Text(
                    'CLASSEMENT DES MEILLEURS CLIENTS',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
              Text('Fidélité & CA', style: TextStyle(fontSize: 10, color: AppColors2026.textMuted)),
            ],
          ),
          const SizedBox(height: 14),
          if (topClients.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Text('Aucun client enregistré sur cette période.', style: TextStyle(color: AppColors2026.textSecondary)),
              ),
            )
          else
            ...topClients.take(10).toList().asMap().entries.map((entry) {
              final rank = entry.key + 1;
              final client = entry.value;
              final cnt = counts[client.key] ?? 1;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: rank <= 3
                          ? AppColors2026.emeraldNeon.withOpacity(0.2)
                          : Colors.white10,
                      child: Text(
                        '$rank',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: rank <= 3 ? AppColors2026.emeraldBright : Colors.white70,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            client.key,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                          ),
                          Text(
                            '$cnt contrat${cnt > 1 ? "s" : ""} de location',
                            style: const TextStyle(fontSize: 11, color: AppColors2026.textMuted),
                          ),
                        ],
                      ),
                    ),
                    NeonBadge(
                      label: '${fmt.format(client.value.round())} DH',
                      color: AppColors2026.emeraldNeon,
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildInvoicesSection(NumberFormat fmt, List<InvoiceModel> invoices) {
    final paidInvoices = invoices.where((i) => i.isPaid).toList();
    final pendingInvoices = invoices.where((i) => !i.isPaid).toList();

    final totalPaid = paidInvoices.fold<double>(0, (sum, i) => sum + i.totalTtc);
    final totalPending = pendingInvoices.fold<double>(0, (sum, i) => sum + i.totalTtc);
    final totalTva = invoices.fold<double>(0, (sum, i) => sum + i.tva);

    return Column(
      children: [
        // Invoices Metric Summary
        Row(
          children: [
            Expanded(
              child: SpatialGlassCard(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Encaissé', style: TextStyle(fontSize: 11, color: AppColors2026.textSecondary)),
                    const SizedBox(height: 4),
                    Text('${fmt.format(totalPaid.round())} DH', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors2026.emeraldBright)),
                    Text('${paidInvoices.length} factures réglées', style: const TextStyle(fontSize: 10, color: AppColors2026.textMuted)),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: SpatialGlassCard(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('En Attente / Dû', style: TextStyle(fontSize: 11, color: AppColors2026.textSecondary)),
                    const SizedBox(height: 4),
                    Text('${fmt.format(totalPending.round())} DH', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors2026.roseLaser)),
                    Text('${pendingInvoices.length} factures dues', style: const TextStyle(fontSize: 10, color: AppColors2026.textMuted)),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // TVA & Fiscal Summary
        SpatialGlassCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('TVA Collectée (20%)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                  Text('Base déclarative légale', style: TextStyle(fontSize: 10, color: AppColors2026.textMuted)),
                ],
              ),
              NeonBadge(label: '${fmt.format(totalTva.round())} DH', color: AppColors2026.cyanNeon),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Recent Invoices List
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.listFilter, size: 16, color: AppColors2026.cyanBright),
                  SizedBox(width: 8),
                  Text('DERNIÈRES FACTURES ÉMISES', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                ],
              ),
              const SizedBox(height: 12),
              if (invoices.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: Text('Aucune facture enregistrée.', style: TextStyle(color: AppColors2026.textSecondary))),
                )
              else
                ...invoices.take(8).map((inv) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('#${inv.invoiceNumber} • ${inv.customerName}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                            Text(inv.invoiceDate.split('T').first, style: const TextStyle(fontSize: 11, color: AppColors2026.textMuted)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('${fmt.format(inv.totalTtc.round())} DH', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                            Text(
                              inv.isPaid ? 'RÉGLÉE' : 'EN ATTENTE',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w900,
                                color: inv.isPaid ? AppColors2026.emeraldBright : AppColors2026.roseLaser,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ],
    );
  }

  // =========================================================================
  // HELPER COMPONENTS
  // =========================================================================

  Widget _periodPill(String id, String label) {
    final selected = _periodFilter == id;
    return GestureDetector(
      onTap: () => setState(() => _periodFilter = id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? AppColors2026.cyanNeon.withOpacity(0.2)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors2026.cyanNeon : Colors.white10,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w800,
            color: selected ? AppColors2026.cyanBright : Colors.white70,
          ),
        ),
      ),
    );
  }

  Widget _tabPill(String id, String label, IconData icon) {
    final selected = _activeTab == id;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? AppColors2026.cyanNeon
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(12),
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
              color: selected ? AppColors2026.abyss : Colors.white70,
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

  Widget _financialRow(String label, String value, Color color, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: isBold ? FontWeight.w900 : FontWeight.w700,
            color: isBold ? Colors.white : AppColors2026.textSecondary,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 14 : 13,
            fontWeight: FontWeight.w900,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _fleetStatusBox(String title, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text('$count', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(height: 2),
          Text(title, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Colors.white70)),
        ],
      ),
    );
  }

  Widget _buildPaymentBarChart(List<ContractModel> contracts) {
    double especes = 0;
    double cheque = 0;
    double virement = 0;

    for (final c in contracts) {
      final m = c.paymentMethod.toLowerCase();
      if (m.contains('chèque') || m.contains('cheque')) {
        cheque += c.totalAmount;
      } else if (m.contains('virement')) {
        virement += c.totalAmount;
      } else {
        especes += c.totalAmount;
      }
    }

    final maxVal = [especes, cheque, virement, 1000.0].reduce((a, b) => a > b ? a : b);

    return BarChart(
      BarChartData(
        maxY: maxVal * 1.25,
        borderData: FlBorderData(show: false),
        gridData: const FlGridData(show: false),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
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
                width: 32,
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
                width: 32,
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
                width: 32,
                borderRadius: BorderRadius.circular(8),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
