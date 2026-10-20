import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import 'contract_form_dialog.dart';

/// 4. CONTRATS SCREEN — 100% Web Parity (Contracts.tsx + NewContractDialog + EnhancedContractFormDialog)
/// Includes:
/// - Full Formulaire de Contrat (Create / Edit / View) with Locataire, 2ème Conducteur, Véhicule (Livraison & Reprise, interactive damage diagrams & fuel gauges), Facturation & Signatures
/// - 3 View Modes: Cartes, Tableau, Pipeline (5-column Kanban)
/// - 4 KPI Stat Cards + Financial Telemetry Banner (Volume Engagé, Encaissé, Créances Restantes & % Recouvré)
/// - Dual Filter System: Statut du Contrat (Tous, En circulation, Clôturés, En retard) + Statut Financier (Tous, Payé, En cours, En attente)
/// - Operations Drawer (Flotte en Circulation, Restitutions du Jour, Retards Critiques, Flux Financier)
/// - Official Paper Contract Preview, WhatsApp Share, Direct Call, Quick Close/Reopen & Confirmed Delete
class ContractsScreen extends StatefulWidget {
  final AppStateProvider appState;

  const ContractsScreen({super.key, required this.appState});

  @override
  State<ContractsScreen> createState() => _ContractsScreenState();
}

class _ContractsScreenState extends State<ContractsScreen> {
  String _search = '';
  String _statusFilter = 'tous'; // 'tous' | 'ouvert' | 'ferme' | 'overdue'
  String _financialFilter = 'tous'; // 'tous' | 'payé' | 'en cours' | 'en attente'
  String _viewMode = 'cards'; // 'cards' | 'table' | 'kanban'
  bool _showAnalytics = true;

  void _openContractForm({
    ContractModel? contract,
    ContractFormMode mode = ContractFormMode.create,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (ctx) => ContractFormDialog(
          appState: widget.appState,
          existingContract: contract,
          mode: mode,
        ),
      ),
    );
  }

  void _openOfficialPreview(ContractModel c) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => OfficialContractPaperPreviewSheet(
        contract: c,
        onShare: () => _shareContractWhatsApp(c),
      ),
    );
  }

  Future<void> _shareContractWhatsApp(ContractModel c) async {
    final text = '''
*SFTLOCATION - CONTRAT DE LOCATION*
📄 *N° Contrat :* ${c.contractNumber}
👤 *Locataire :* ${c.customerName} ${c.customerCin.isNotEmpty ? '(CIN: ${c.customerCin})' : ''}
🚗 *Véhicule :* ${c.vehicle}
📅 *Départ :* ${c.startDate}
📅 *Retour :* ${c.effectiveEndDate} (${c.durationDays} jours${c.extensionDays > 0 ? ' dont +${c.extensionDays}j prol.' : ''})
💰 *Total TTC :* ${c.effectiveTotalAmount.round()} DH (${c.dailyRate.round()} DH/j)
✅ *Avance :* ${c.advancePayment.round()} DH (${c.paymentMethod})
🚩 *Reste à payer :* ${c.remainingAmount.round()} DH (${c.financialStatus.toUpperCase()})
📌 *Statut :* ${c.isClosed ? 'CLÔTURÉ' : c.isOverdue ? 'EN RETARD (+${c.overdueDays}j)' : 'EN CIRCULATION'}
'''.trim();

    final cleanPhone = c.customerPhone.replaceAll(RegExp(r'[^0-9+]'), '');
    final phoneParam = cleanPhone.isNotEmpty ? 'phone=$cleanPhone&' : '';
    final uri = Uri.parse(
      'https://wa.me/?${phoneParam}text=${Uri.encodeComponent(text)}',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _callCustomer(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) return;
    final uri = Uri.parse('tel:$clean');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _toggleCloseReopen(ContractModel c) async {
    final nowIso = DateTime.now().toIso8601String();
    final newStatus = c.isClosed ? 'ouvert' : 'ferme';
    final updated = c.copyWith(
      status: newStatus,
      updatedAt: nowIso,
    );
    await widget.appState.saveContract(updated, isEdit: true);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors2026.obsidianElevated,
        content: Text(
          newStatus == 'ferme'
              ? 'Contrat ${c.contractNumber} clôturé et véhicule libéré.'
              : 'Contrat ${c.contractNumber} réouvert (en circulation).',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Future<void> _confirmDeleteContract(ContractModel c) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors2026.obsidianSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: AppColors2026.roseLaser.withOpacity(0.45)),
        ),
        title: const Row(
          children: [
            Icon(LucideIcons.alertTriangle, color: AppColors2026.roseLaser, size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Supprimer le contrat ?',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
        content: Text(
          'Êtes-vous sûr de vouloir supprimer définitivement le contrat ${c.contractNumber} (${c.customerName}) ? Cette action est irréversible et remettra le véhicule en statut Disponible.',
          style: const TextStyle(fontSize: 13, color: AppColors2026.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors2026.roseLaser,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(LucideIcons.trash2, size: 15),
            label: const Text('Supprimer définitivement'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await widget.appState.deleteContract(c);
    }
  }

  void _openOperationsDrawer() {
    final all = widget.appState.contracts;
    final activeList = all.where((c) => c.isActive).toList();
    final overdueList = all.where((c) => c.isOverdue).toList();
    final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final dueTodayList = all
        .where((c) => c.isActive && c.effectiveEndDate.startsWith(todayStr))
        .toList();
    final unpaidList = all.where((c) => c.remainingAmount > 0).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors2026.obsidianSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.78,
        minChildSize: 0.5,
        maxChildSize: 0.94,
        builder: (ctx, scrollCtrl) => ListView(
          controller: scrollCtrl,
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 28),
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.sliders,
                        color: AppColors2026.cyanBright, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'CENTRE D\'OPÉRATIONS CONTRATS',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.pop(ctx),
                  icon: const Icon(LucideIcons.x, size: 18),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildOpsSection(
              title: 'Retards Critiques & Relances (${overdueList.length})',
              accent: AppColors2026.roseLaser,
              icon: LucideIcons.alertOctagon,
              items: overdueList,
              ctx: ctx,
            ),
            const SizedBox(height: 14),
            _buildOpsSection(
              title: 'Restitutions Aujourd\'hui (${dueTodayList.length})',
              accent: AppColors2026.amberSolar,
              icon: LucideIcons.clock,
              items: dueTodayList,
              ctx: ctx,
            ),
            const SizedBox(height: 14),
            _buildOpsSection(
              title: 'Flotte en Circulation Live (${activeList.length})',
              accent: AppColors2026.emeraldNeon,
              icon: LucideIcons.car,
              items: activeList,
              ctx: ctx,
            ),
            const SizedBox(height: 14),
            _buildOpsSection(
              title: 'Créances à Recouvrer (${unpaidList.length})',
              accent: AppColors2026.cyanBright,
              icon: LucideIcons.wallet,
              items: unpaidList,
              ctx: ctx,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOpsSection({
    required String title,
    required Color accent,
    required IconData icon,
    required List<ContractModel> items,
    required BuildContext ctx,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: accent.withOpacity(0.07),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withOpacity(0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: accent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: accent,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 6),
              child: Text(
                'Aucun dossier dans cette catégorie.',
                style: TextStyle(fontSize: 11, color: AppColors2026.textMuted),
              ),
            )
          else
            ...items.take(6).map(
                  (c) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      '${c.contractNumber} • ${c.customerName}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    subtitle: Text(
                      '${c.vehicle} • Retour: ${c.effectiveEndDate} • Reste: ${c.remainingAmount.round()} DH',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors2026.textSecondary,
                      ),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (c.customerPhone.isNotEmpty)
                          IconButton(
                            icon: const Icon(LucideIcons.phone,
                                size: 15, color: AppColors2026.emeraldBright),
                            onPressed: () => _callCustomer(c.customerPhone),
                          ),
                        IconButton(
                          icon: const Icon(LucideIcons.edit3,
                              size: 15, color: AppColors2026.cyanBright),
                          onPressed: () {
                            Navigator.pop(ctx);
                            _openContractForm(
                              contract: c,
                              mode: ContractFormMode.edit,
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'fr_FR');
    final all = widget.appState.contracts;

    // KPI counts matching Web ContractsStats.tsx
    final totalCount = all.length;
    final activeCount = all.where((c) => c.isActive).length;
    final overdueCount = all.where((c) => c.isOverdue).length;
    final closedCount = all.where((c) => c.isClosed).length;

    // Financial telemetry matching Web ContractsStats.tsx
    final totalRevenue =
        all.fold<double>(0, (sum, c) => sum + c.effectiveTotalAmount);
    final totalAdvance =
        all.fold<double>(0, (sum, c) => sum + c.advancePayment);
    final totalRemaining =
        all.fold<double>(0, (sum, c) => sum + c.remainingAmount);
    final collectionRate = totalRevenue > 0
        ? ((totalAdvance / totalRevenue) * 100).round().clamp(0, 100)
        : 100;

    // Dual Filter + Search matching Web Contracts.tsx
    final filtered = all.where((c) {
      if (_statusFilter == 'ouvert' && !c.isActive) return false;
      if (_statusFilter == 'ferme' && !c.isClosed) return false;
      if (_statusFilter == 'overdue' && !c.isOverdue) return false;

      if (_financialFilter != 'tous' && c.financialStatus != _financialFilter) {
        return false;
      }

      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        return c.customerName.toLowerCase().contains(q) ||
            c.vehicle.toLowerCase().contains(q) ||
            c.contractNumber.toLowerCase().contains(q) ||
            c.customerCin.toLowerCase().contains(q) ||
            c.customerPhone.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 90),
        child: FloatingActionButton.extended(
          heroTag: 'new_contract_full_btn',
          onPressed: () =>
              _openContractForm(mode: ContractFormMode.create),
          backgroundColor: AppColors2026.violetElectric,
          foregroundColor: Colors.white,
          elevation: 6,
          icon: const Icon(LucideIcons.filePlus2, size: 18),
          label: const Text(
            'Nouveau Contrat',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
      ),
      body: Column(
        children: [
          // Top Action Bar with Integrated Operations Alert Badge & View Modes
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
            child: Column(
              children: [
                Row(
                  children: [
                    // View Mode Switcher (Cartes / Tableau / Pipeline)
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: Row(
                          children: [
                            _buildViewModeTab(
                              id: 'cards',
                              label: 'Cartes',
                              icon: LucideIcons.layoutGrid,
                            ),
                            _buildViewModeTab(
                              id: 'table',
                              label: 'Tableau',
                              icon: LucideIcons.table,
                            ),
                            _buildViewModeTab(
                              id: 'kanban',
                              label: 'Pipeline',
                              icon: LucideIcons.columns,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Centre d'Opérations & Alertes Button (Cleanly integrated in header)
                    IconButton(
                      tooltip: 'Centre d\'Opérations & Alertes Contrats',
                      onPressed: _openOperationsDrawer,
                      style: IconButton.styleFrom(
                        backgroundColor: overdueCount > 0
                            ? AppColors2026.roseLaser.withOpacity(0.18)
                            : Colors.white.withOpacity(0.05),
                      ),
                      icon: Badge(
                        isLabelVisible: overdueCount > 0,
                        label: Text('$overdueCount'),
                        backgroundColor: AppColors2026.roseLaser,
                        child: Icon(
                          LucideIcons.bell,
                          size: 17,
                          color: overdueCount > 0
                              ? AppColors2026.roseLaser
                              : AppColors2026.textSecondary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),

                    // Analytics toggle button
                    IconButton(
                      tooltip: _showAnalytics
                          ? 'Masquer les statistiques'
                          : 'Afficher les statistiques',
                      onPressed: () =>
                          setState(() => _showAnalytics = !_showAnalytics),
                      style: IconButton.styleFrom(
                        backgroundColor: _showAnalytics
                            ? AppColors2026.cyanNeon.withOpacity(0.16)
                            : Colors.white.withOpacity(0.05),
                      ),
                      icon: Icon(
                        LucideIcons.barChart3,
                        size: 17,
                        color: _showAnalytics
                            ? AppColors2026.cyanBright
                            : AppColors2026.textSecondary,
                      ),
                    ),
                    const SizedBox(width: 4),

                    // Supabase Refresh button
                    IconButton(
                      tooltip: 'Actualiser Supabase',
                      onPressed: () => widget.appState.refreshAllData(),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white.withOpacity(0.05),
                      ),
                      icon: const Icon(
                        LucideIcons.refreshCw,
                        size: 16,
                        color: AppColors2026.textSecondary,
                      ),
                    ),
                  ],
                ),

                // Collapsible KPI Cards + Financial Telemetry Banner
                if (_showAnalytics) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 68,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _KpiMiniCard(
                          label: 'TOTAL CONTRATS',
                          value: '$totalCount',
                          sub: 'Dossiers',
                          color: AppColors2026.cyanBright,
                          icon: LucideIcons.fileText,
                          selected: _statusFilter == 'tous',
                          onTap: () => setState(() => _statusFilter = 'tous'),
                        ),
                        const SizedBox(width: 8),
                        _KpiMiniCard(
                          label: 'EN CIRCULATION',
                          value: '$activeCount',
                          sub: 'Véhicules sortis',
                          color: AppColors2026.emeraldNeon,
                          icon: LucideIcons.clock,
                          selected: _statusFilter == 'ouvert',
                          onTap: () => setState(() => _statusFilter = 'ouvert'),
                        ),
                        const SizedBox(width: 8),
                        _KpiMiniCard(
                          label: 'RETARDS CRITIQUES',
                          value: '$overdueCount',
                          sub: overdueCount > 0 ? 'Relance requise' : 'Aucun retard',
                          color: AppColors2026.roseLaser,
                          icon: LucideIcons.alertTriangle,
                          selected: _statusFilter == 'overdue',
                          onTap: () =>
                              setState(() => _statusFilter = 'overdue'),
                        ),
                        const SizedBox(width: 8),
                        _KpiMiniCard(
                          label: 'CLÔTURÉS',
                          value: '$closedCount',
                          sub: 'Restitués',
                          color: AppColors2026.violetElectric,
                          icon: LucideIcons.checkCircle2,
                          selected: _statusFilter == 'ferme',
                          onTap: () => setState(() => _statusFilter = 'ferme'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Financial Telemetry Bar (Volume Engagé / Encaissé / Créances Restantes / % Recouvré)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.03),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _FinancialMetricCol(
                            label: 'VOLUME ENGAGÉ TTC',
                            value: '${currencyFmt.format(totalRevenue.round())} DH',
                            color: Colors.white,
                          ),
                        ),
                        Container(width: 1, height: 24, color: Colors.white12),
                        Expanded(
                          child: _FinancialMetricCol(
                            label: 'TOTAL ENCAISSÉ',
                            value: '${currencyFmt.format(totalAdvance.round())} DH',
                            color: AppColors2026.emeraldBright,
                          ),
                        ),
                        Container(width: 1, height: 24, color: Colors.white12),
                        Expanded(
                          child: _FinancialMetricCol(
                            label: 'RESTE À RECOUVRER ($collectionRate%)',
                            value:
                                '${currencyFmt.format(totalRemaining.round())} DH',
                            color: totalRemaining > 0
                                ? AppColors2026.amberSolar
                                : AppColors2026.emeraldBright,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 8),
                // Search Bar
                SizedBox(
                  height: 42,
                  child: TextField(
                    onChanged: (v) => setState(() => _search = v),
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 0),
                      hintText:
                          'Rechercher N° contrat, client, CIN, tél ou véhicule...',
                      prefixIcon: const Icon(LucideIcons.search, size: 16),
                      suffixIcon: _search.isNotEmpty
                          ? IconButton(
                              icon: const Icon(LucideIcons.x, size: 14),
                              onPressed: () => setState(() => _search = ''),
                            )
                          : null,
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // Dual Filter Strip: Statut du Contrat + Statut Financier
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterChip2026(
                        label: 'Tous (${all.length})',
                        selected: _statusFilter == 'tous',
                        color: AppColors2026.cyanBright,
                        onTap: () => setState(() => _statusFilter = 'tous'),
                      ),
                      const SizedBox(width: 6),
                      _FilterChip2026(
                        label: 'En circulation ($activeCount)',
                        selected: _statusFilter == 'ouvert',
                        color: AppColors2026.emeraldNeon,
                        onTap: () => setState(() => _statusFilter = 'ouvert'),
                      ),
                      const SizedBox(width: 6),
                      _FilterChip2026(
                        label: 'En retard ($overdueCount)',
                        selected: _statusFilter == 'overdue',
                        color: AppColors2026.roseLaser,
                        onTap: () => setState(() => _statusFilter = 'overdue'),
                      ),
                      const SizedBox(width: 6),
                      _FilterChip2026(
                        label: 'Clôturés ($closedCount)',
                        selected: _statusFilter == 'ferme',
                        color: AppColors2026.violetElectric,
                        onTap: () => setState(() => _statusFilter = 'ferme'),
                      ),
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        width: 1,
                        height: 18,
                        color: Colors.white24,
                      ),
                      _FilterChip2026(
                        label: 'Financier: Tous',
                        selected: _financialFilter == 'tous',
                        color: AppColors2026.textSecondary,
                        onTap: () => setState(() => _financialFilter = 'tous'),
                      ),
                      const SizedBox(width: 6),
                      _FilterChip2026(
                        label: 'Payé',
                        selected: _financialFilter == 'payé',
                        color: AppColors2026.emeraldBright,
                        onTap: () => setState(() => _financialFilter = 'payé'),
                      ),
                      const SizedBox(width: 6),
                      _FilterChip2026(
                        label: 'En cours',
                        selected: _financialFilter == 'en cours',
                        color: AppColors2026.amberSolar,
                        onTap: () =>
                            setState(() => _financialFilter = 'en cours'),
                      ),
                      const SizedBox(width: 6),
                      _FilterChip2026(
                        label: 'En attente',
                        selected: _financialFilter == 'en attente',
                        color: AppColors2026.roseLaser,
                        onTap: () =>
                            setState(() => _financialFilter = 'en attente'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Main Content Area: Cards / Table / Kanban Pipeline
          Expanded(
            child: filtered.isEmpty
                ? _buildEmptyState()
                : _viewMode == 'table'
                    ? _buildTableView(filtered, currencyFmt)
                    : _viewMode == 'kanban'
                        ? _buildKanbanView(filtered, currencyFmt)
                        : _buildCardsView(filtered, currencyFmt),
          ),
        ],
      ),
    );
  }

  Widget _buildViewModeTab({
    required String id,
    required String label,
    required IconData icon,
  }) {
    final active = _viewMode == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _viewMode = id),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: active ? AppColors2026.violetElectric : Colors.transparent,
            borderRadius: BorderRadius.circular(11),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 13,
                color: active ? Colors.white : AppColors2026.textSecondary,
              ),
              const SizedBox(width: 5),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: active ? Colors.white : AppColors2026.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            LucideIcons.fileSearch,
            size: 46,
            color: AppColors2026.textSecondary.withOpacity(0.4),
          ),
          const SizedBox(height: 10),
          const Text(
            'Aucun contrat trouvé pour ces critères.',
            style: TextStyle(
              color: AppColors2026.textSecondary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: () =>
                _openContractForm(mode: ContractFormMode.create),
            icon: const Icon(LucideIcons.filePlus2, size: 16),
            label: const Text('Créer un Nouveau Contrat'),
          ),
        ],
      ),
    );
  }

  // 1. CARDS VIEW (Mobile-First Detailed Cards with all Web Actions)
  Widget _buildCardsView(List<ContractModel> items, NumberFormat currencyFmt) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 145),
      itemCount: items.length,
      itemBuilder: (ctx, i) {
        final c = items[i];
        return _ContractSpatialCard(
          contract: c,
          currencyFmt: currencyFmt,
          onViewDetails: () =>
              _openContractForm(contract: c, mode: ContractFormMode.view),
          onEditForm: () =>
              _openContractForm(contract: c, mode: ContractFormMode.edit),
          onPreviewPaper: () => _openOfficialPreview(c),
          onShareWhatsApp: () => _shareContractWhatsApp(c),
          onCall: () => _callCustomer(c.customerPhone),
          onToggleClose: () => _toggleCloseReopen(c),
          onDelete: () => _confirmDeleteContract(c),
        );
      },
    );
  }

  // 2. TABLE VIEW (100% Parity with ContractsTable.tsx)
  Widget _buildTableView(List<ContractModel> items, NumberFormat currencyFmt) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 145),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors2026.obsidianSurface.withOpacity(0.85),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white12),
          ),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(
              Colors.white.withOpacity(0.04),
            ),
            columnSpacing: 18,
            horizontalMargin: 14,
            columns: const [
              DataColumn(label: Text('N° CONTRAT')),
              DataColumn(label: Text('LOCATAIRE')),
              DataColumn(label: Text('VÉHICULE')),
              DataColumn(label: Text('PÉRIODE & DURÉE')),
              DataColumn(label: Text('MONTANT TTC')),
              DataColumn(label: Text('AVANCE / RESTE')),
              DataColumn(label: Text('FINANCIER')),
              DataColumn(label: Text('STATUT')),
              DataColumn(label: Text('ACTIONS')),
            ],
            rows: items.map((c) {
              final statusColor = c.isOverdue
                  ? AppColors2026.roseLaser
                  : c.isActive
                      ? AppColors2026.emeraldNeon
                      : AppColors2026.textSecondary;
              final finColor = c.financialStatus == 'payé'
                  ? AppColors2026.emeraldBright
                  : c.financialStatus == 'en cours'
                      ? AppColors2026.amberSolar
                      : AppColors2026.roseLaser;

              return DataRow(
                cells: [
                  DataCell(
                    GestureDetector(
                      onTap: () => _openContractForm(
                        contract: c,
                        mode: ContractFormMode.view,
                      ),
                      child: Text(
                        c.contractNumber,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          color: AppColors2026.cyanBright,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                  DataCell(
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          c.customerName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                          ),
                        ),
                        if (c.customerPhone.isNotEmpty || c.customerCin.isNotEmpty)
                          Text(
                            '${c.customerCin.isNotEmpty ? 'CIN: ${c.customerCin} ' : ''}${c.customerPhone}',
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppColors2026.textSecondary,
                            ),
                          ),
                      ],
                    ),
                  ),
                  DataCell(
                    Text(
                      c.vehicle,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  DataCell(
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${c.startDate} → ${c.effectiveEndDate}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          '${c.durationDays} jours${c.extensionDays > 0 ? ' (+${c.extensionDays}j prol.)' : ''}',
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors2026.cyanBright,
                          ),
                        ),
                      ],
                    ),
                  ),
                  DataCell(
                    Text(
                      '${currencyFmt.format(c.effectiveTotalAmount.round())} DH',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  DataCell(
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Av: ${currencyFmt.format(c.advancePayment.round())} DH',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors2026.emeraldBright,
                          ),
                        ),
                        Text(
                          'Reste: ${currencyFmt.format(c.remainingAmount.round())} DH',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: c.remainingAmount > 0
                                ? AppColors2026.roseLaser
                                : AppColors2026.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  DataCell(
                    NeonBadge(
                      label: c.financialStatus.toUpperCase(),
                      color: finColor,
                    ),
                  ),
                  DataCell(
                    NeonBadge(
                      label: c.isOverdue
                          ? 'RETARD +${c.overdueDays}J'
                          : c.isActive
                              ? 'EN CIRCULATION'
                              : 'CLÔTURÉ',
                      color: statusColor,
                      pulsing: c.isActive || c.isOverdue,
                    ),
                  ),
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          tooltip: 'Voir Détails',
                          icon: const Icon(LucideIcons.eye,
                              size: 16, color: AppColors2026.cyanBright),
                          onPressed: () => _openContractForm(
                            contract: c,
                            mode: ContractFormMode.view,
                          ),
                        ),
                        IconButton(
                          tooltip: 'Modifier Formulaire Complet',
                          icon: const Icon(LucideIcons.edit3,
                              size: 16, color: Colors.white),
                          onPressed: () => _openContractForm(
                            contract: c,
                            mode: ContractFormMode.edit,
                          ),
                        ),
                        IconButton(
                          tooltip: 'Aperçu Contrat Officiel',
                          icon: const Icon(LucideIcons.printer,
                              size: 16, color: AppColors2026.amberSolar),
                          onPressed: () => _openOfficialPreview(c),
                        ),
                        IconButton(
                          tooltip: 'Partager WhatsApp',
                          icon: const Icon(LucideIcons.share2,
                              size: 16, color: AppColors2026.emeraldBright),
                          onPressed: () => _shareContractWhatsApp(c),
                        ),
                        IconButton(
                          tooltip: 'Supprimer',
                          icon: const Icon(LucideIcons.trash2,
                              size: 16, color: AppColors2026.roseLaser),
                          onPressed: () => _confirmDeleteContract(c),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  // 3. KANBAN PIPELINE VIEW (100% Parity with ContractsKanban.tsx - 5 Columns)
  Widget _buildKanbanView(List<ContractModel> items, NumberFormat currencyFmt) {
    final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());

    final colActive = items
        .where((c) =>
            c.isActive &&
            !c.isOverdue &&
            !c.effectiveEndDate.startsWith(todayStr))
        .toList();
    final colDueToday = items
        .where((c) => c.isActive && c.effectiveEndDate.startsWith(todayStr))
        .toList();
    final colOverdue = items.where((c) => c.isOverdue).toList();
    final colDrafts = items
        .where((c) =>
            c.status.toLowerCase() == 'draft' ||
            (c.isActive && !c.hasDeliverySignature))
        .toList();
    final colClosed = items.where((c) => c.isClosed).toList();

    final columns = [
      (
        title: 'EN CIRCULATION',
        sub: 'Locations actives normales',
        color: AppColors2026.emeraldNeon,
        icon: LucideIcons.car,
        list: colActive,
      ),
      (
        title: 'RESTITUTION AUJOURD\'HUI',
        sub: 'Retours prévus ce jour',
        color: AppColors2026.amberSolar,
        icon: LucideIcons.clock,
        list: colDueToday,
      ),
      (
        title: 'EN RETARD / RELANCE',
        sub: 'Dépassement de date retour',
        color: AppColors2026.roseLaser,
        icon: LucideIcons.alertTriangle,
        list: colOverdue,
      ),
      (
        title: 'BROUILLONS & SIGNATURE',
        sub: 'Attente signature livraison',
        color: AppColors2026.cyanBright,
        icon: LucideIcons.penTool,
        list: colDrafts,
      ),
      (
        title: 'CLÔTURÉS / ARCHIVÉS',
        sub: 'Véhicules restitués',
        color: AppColors2026.violetElectric,
        icon: LucideIcons.checkCircle2,
        list: colClosed,
      ),
    ];

    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 145),
      itemCount: columns.length,
      separatorBuilder: (_, __) => const SizedBox(width: 12),
      itemBuilder: (ctx, idx) {
        final col = columns[idx];
        return Container(
          width: 295,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors2026.obsidianSurface.withOpacity(0.85),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: col.color.withOpacity(0.32)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(col.icon, size: 15, color: col.color),
                      const SizedBox(width: 7),
                      Text(
                        col.title,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: col.color,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: col.color.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      '${col.list.length}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: col.color,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                col.sub,
                style: const TextStyle(
                  fontSize: 10,
                  color: AppColors2026.textSecondary,
                ),
              ),
              const Divider(height: 16, color: Colors.white12),
              Expanded(
                child: col.list.isEmpty
                    ? Center(
                        child: Text(
                          'Aucun dossier',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors2026.textSecondary.withOpacity(0.5),
                          ),
                        ),
                      )
                    : ListView.builder(
                        itemCount: col.list.length,
                        itemBuilder: (ctx, i) {
                          final c = col.list[i];
                          return GestureDetector(
                            onTap: () => _openContractForm(
                              contract: c,
                              mode: ContractFormMode.edit,
                            ),
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(11),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.04),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: col.color.withOpacity(0.25),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        c.contractNumber,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w900,
                                          color: AppColors2026.cyanBright,
                                        ),
                                      ),
                                      Text(
                                        '${currencyFmt.format(c.effectiveTotalAmount.round())} DH',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w900,
                                          color: AppColors2026.emeraldBright,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 5),
                                  Text(
                                    c.customerName,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    c.vehicle,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors2026.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '${c.startDate} → ${c.effectiveEndDate}',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: AppColors2026.textSecondary,
                                        ),
                                      ),
                                      if (c.remainingAmount > 0)
                                        Text(
                                          'Reste: ${c.remainingAmount.round()} DH',
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            color: AppColors2026.roseLaser,
                                          ),
                                        ),
                                    ],
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
      },
    );
  }
}

class _ContractSpatialCard extends StatelessWidget {
  final ContractModel contract;
  final NumberFormat currencyFmt;
  final VoidCallback onViewDetails;
  final VoidCallback onEditForm;
  final VoidCallback onPreviewPaper;
  final VoidCallback onShareWhatsApp;
  final VoidCallback onCall;
  final VoidCallback onToggleClose;
  final VoidCallback onDelete;

  const _ContractSpatialCard({
    required this.contract,
    required this.currencyFmt,
    required this.onViewDetails,
    required this.onEditForm,
    required this.onPreviewPaper,
    required this.onShareWhatsApp,
    required this.onCall,
    required this.onToggleClose,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final c = contract;
    final statusAccent = c.isOverdue
        ? AppColors2026.roseLaser
        : c.isActive
            ? AppColors2026.emeraldNeon
            : AppColors2026.textSecondary;

    final finAccent = c.financialStatus == 'payé'
        ? AppColors2026.emeraldBright
        : c.financialStatus == 'en cours'
            ? AppColors2026.amberSolar
            : AppColors2026.roseLaser;

    return SpatialGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      borderColor: statusAccent.withOpacity(0.38),
      onTap: onEditForm,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top badges: Contract Number + Financial Badge + Contract Status Badge
          Wrap(
            spacing: 6,
            runSpacing: 6,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              NeonBadge(
                label: c.contractNumber,
                color: AppColors2026.cyanNeon,
                icon: LucideIcons.fileText,
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  NeonBadge(
                    label: c.financialStatus.toUpperCase(),
                    color: finAccent,
                  ),
                  const SizedBox(width: 6),
                  NeonBadge(
                    label: c.isOverdue
                        ? 'RETARD +${c.overdueDays}J'
                        : c.isActive
                            ? 'EN CIRCULATION'
                            : 'CLÔTURÉ',
                    color: statusAccent,
                    pulsing: c.isActive || c.isOverdue,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Customer & Second Driver + Vehicle Info
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      c.customerName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    if (c.customerCin.isNotEmpty || c.customerPhone.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          '${c.customerCin.isNotEmpty ? 'CIN: ${c.customerCin}' : ''}${c.customerCin.isNotEmpty && c.customerPhone.isNotEmpty ? ' • ' : ''}${c.customerPhone}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors2026.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(LucideIcons.car,
                            size: 14, color: AppColors2026.cyanBright),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            c.vehicle,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppColors2026.cyanBright,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Fuel & Damages & Signatures Telemetry Pills
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '⛽ ${c.deliveryFuelLevel}% → ${c.returnFuelLevel}%',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: AppColors2026.amberSolar,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (c.deliveryDamages.isNotEmpty ||
                          c.returnDamages.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(right: 4),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors2026.roseLaser.withOpacity(0.16),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '⚠️ ${c.deliveryDamages.length}/${c.returnDamages.length} impacts',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: AppColors2026.roseLaser,
                            ),
                          ),
                        ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: (c.hasDeliverySignature
                                  ? AppColors2026.emeraldNeon
                                  : Colors.white24)
                              .withOpacity(0.18),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          c.hasReturnSignature
                              ? '✍️ Signé A/R'
                              : c.hasDeliverySignature
                                  ? '✍️ Signé Départ'
                                  : '✍️ Non signé',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: c.hasDeliverySignature
                                ? AppColors2026.emeraldBright
                                : AppColors2026.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 10),
          // Dates & Payment method strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Du ${c.startDate} au ${c.effectiveEndDate} (${c.durationDays}j${c.extensionDays > 0 ? ' dont +${c.extensionDays}j prol.' : ''})',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Text(
                  '${c.dailyRate.round()} DH/j • ${c.paymentMethod}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors2026.amberSolar,
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 16, color: Colors.white12),

          // 1. Structured Financial Telemetry Box (Total TTC | Avance | Reste)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white10),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'TOTAL TTC',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: AppColors2026.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '${currencyFmt.format(c.effectiveTotalAmount.round())} DH',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            color: AppColors2026.emeraldBright,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(width: 1, height: 24, color: Colors.white12),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'AVANCE',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: AppColors2026.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '${currencyFmt.format(c.advancePayment.round())} DH',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(width: 1, height: 24, color: Colors.white12),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'RESTE',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: AppColors2026.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          c.remainingAmount > 0
                              ? '${currencyFmt.format(c.remainingAmount.round())} DH'
                              : '0 DH (Soldé)',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: c.remainingAmount > 0
                                ? AppColors2026.roseLaser
                                : AppColors2026.emeraldBright,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 2. Clean, Organized Action Bar (Zero Overflow)
          Row(
            children: [
              // Primary Action: Modifier
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors2026.violetElectric.withOpacity(0.22),
                      foregroundColor: Colors.white,
                      side: BorderSide(color: AppColors2026.violetElectric.withOpacity(0.55)),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: onEditForm,
                    icon: const Icon(LucideIcons.edit3, size: 14),
                    label: const Text(
                      'Modifier',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Secondary Action: Détails
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors2026.cyanBright,
                      side: BorderSide(color: AppColors2026.cyanBright.withOpacity(0.45)),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: onViewDetails,
                    icon: const Icon(LucideIcons.eye, size: 14),
                    label: const Text(
                      'Détails',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              // Quick WhatsApp Share Button
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors2026.emeraldNeon.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors2026.emeraldNeon.withOpacity(0.35)),
                ),
                child: IconButton(
                  padding: EdgeInsets.zero,
                  tooltip: 'Partager sur WhatsApp',
                  onPressed: onShareWhatsApp,
                  icon: const Icon(LucideIcons.share2, size: 16, color: AppColors2026.emeraldBright),
                ),
              ),
              const SizedBox(width: 6),
              // Quick Official Paper Preview Button
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors2026.amberSolar.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors2026.amberSolar.withOpacity(0.35)),
                ),
                child: IconButton(
                  padding: EdgeInsets.zero,
                  tooltip: 'Aperçu Contrat Officiel',
                  onPressed: onPreviewPaper,
                  icon: const Icon(LucideIcons.printer, size: 16, color: AppColors2026.amberSolar),
                ),
              ),
              const SizedBox(width: 4),
              // More Actions Menu
              Container(
                width: 34,
                height: 36,
                alignment: Alignment.center,
                child: PopupMenuButton<String>(
                  padding: EdgeInsets.zero,
                  icon: const Icon(LucideIcons.moreVertical, size: 17, color: AppColors2026.textSecondary),
                  color: AppColors2026.obsidianElevated,
                  onSelected: (action) {
                    if (action == 'call') onCall();
                    if (action == 'toggle') onToggleClose();
                    if (action == 'delete') onDelete();
                  },
                  itemBuilder: (ctx) => [
                    if (c.customerPhone.isNotEmpty)
                      const PopupMenuItem(
                        value: 'call',
                        child: Row(
                          children: [
                            Icon(LucideIcons.phone, size: 15, color: AppColors2026.emeraldBright),
                            SizedBox(width: 8),
                            Text('Appeler le client'),
                          ],
                        ),
                      ),
                    PopupMenuItem(
                      value: 'toggle',
                      child: Row(
                        children: [
                          Icon(
                            c.isClosed ? LucideIcons.rotateCcw : LucideIcons.checkCircle2,
                            size: 15,
                            color: AppColors2026.cyanBright,
                          ),
                          const SizedBox(width: 8),
                          Text(c.isClosed ? 'Réouvrir le contrat' : 'Clôturer le contrat'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(LucideIcons.trash2, size: 15, color: AppColors2026.roseLaser),
                          SizedBox(width: 8),
                          Text(
                            'Supprimer définitivement',
                            style: TextStyle(color: AppColors2026.roseLaser),
                          ),
                        ],
                      ),
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
}

class _KpiMiniCard extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final Color color;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _KpiMiniCard({
    required this.label,
    required this.value,
    required this.sub,
    required this.color,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 152,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? color.withOpacity(0.18)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? color : Colors.white12,
            width: selected ? 1.4 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: color.withOpacity(0.16),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 15, color: color),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: AppColors2026.textSecondary,
                    ),
                  ),
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: color,
                    ),
                  ),
                  Text(
                    sub,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 9,
                      color: AppColors2026.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FinancialMetricCol extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _FinancialMetricCol({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              color: AppColors2026.textSecondary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip2026 extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _FilterChip2026({
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
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? color.withOpacity(0.22)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? color : Colors.white12,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: selected ? Colors.white : AppColors2026.textSecondary,
          ),
        ),
      ),
    );
  }
}
