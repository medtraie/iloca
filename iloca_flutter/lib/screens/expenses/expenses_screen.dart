import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import 'expense_form_dialog.dart';

class ExpensesScreen extends StatefulWidget {
  final AppStateProvider appState;

  const ExpensesScreen({super.key, required this.appState});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  final _searchCtrl = TextEditingController();
  String _selectedType = 'all';
  String? _selectedVehicleId;
  final NumberFormat _currencyFormat = NumberFormat('#,##0', 'fr_FR');
  final DateFormat _displayFormat = DateFormat('dd/MM/yyyy');

  void _onStateChanged() {
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    widget.appState.addListener(_onStateChanged);
  }

  @override
  void dispose() {
    widget.appState.removeListener(_onStateChanged);
    _searchCtrl.dispose();
    super.dispose();
  }

  void _openExpenseDialog([ExpenseModel? expense]) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => ExpenseFormDialog(
        appState: widget.appState,
        expense: expense,
      ),
    );
  }

  Future<void> _confirmDelete(ExpenseModel expense) async {
    final vehicle = widget.appState.vehicles
        .where((v) => v.id == expense.vehicleId)
        .firstOrNull
        ?.fullName ?? 'Véhicule';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors2026.obsidianSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: AppColors2026.roseLaser.withOpacity(0.4)),
        ),
        title: const Row(
          children: [
            Icon(LucideIcons.alertTriangle, color: AppColors2026.roseLaser, size: 20),
            SizedBox(width: 8),
            Text('Supprimer la dépense', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          ],
        ),
        content: Text(
          'Voulez-vous vraiment supprimer cette dépense de ${expense.totalCost.toStringAsFixed(0)} MAD (${expense.typeLabel} pour $vehicle) ?',
          style: const TextStyle(color: AppColors2026.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Annuler', style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors2026.roseLaser,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Supprimer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await widget.appState.deleteExpense(expense.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Dépense supprimée avec succès.'),
            backgroundColor: AppColors2026.roseLaser,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.appState;
    final allExpenses = state.expenses;
    final query = _searchCtrl.text.trim().toLowerCase();

    // High performance in-memory filter
    final filtered = allExpenses.where((exp) {
      if (_selectedType != 'all' && exp.type.toLowerCase() != _selectedType.toLowerCase()) {
        return false;
      }
      if (_selectedVehicleId != null && _selectedVehicleId!.isNotEmpty && exp.vehicleId != _selectedVehicleId) {
        return false;
      }
      if (query.isNotEmpty) {
        final veh = state.vehicles
            .where((v) => v.id == exp.vehicleId)
            .firstOrNull;
        final vName = (veh?.fullName ?? '').toLowerCase();
        final vReg = (veh?.registration ?? '').toLowerCase();
        final typeLabel = exp.typeLabel.toLowerCase();
        final notes = (exp.notes ?? '').toLowerCase();

        return vName.contains(query) ||
            vReg.contains(query) ||
            typeLabel.contains(query) ||
            notes.contains(query);
      }
      return true;
    }).toList();

    // Summary KPIs
    final totalAmount = filtered.fold(0.0, (acc, e) => acc + e.totalCost);
    final totalMonthly = filtered.fold(0.0, (acc, e) => acc + e.monthlyCost);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: () => state.refreshAllData(),
        color: AppColors2026.amberSolar,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Top Filter & Search Controls
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Search Bar & Vehicle Dropdown in clean row
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchCtrl,
                            decoration: InputDecoration(
                              hintText: 'Rechercher par véhicule, type, note...',
                              prefixIcon: const Icon(LucideIcons.search, size: 18),
                              suffixIcon: _searchCtrl.text.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(LucideIcons.x, size: 16),
                                      onPressed: () {
                                        _searchCtrl.clear();
                                        setState(() {});
                                      },
                                    )
                                  : null,
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Vehicle Filter Dropdown Pill
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 135),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            decoration: BoxDecoration(
                              color: AppColors2026.obsidianSurface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Colors.white.withOpacity(0.08)),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String?>(
                                value: _selectedVehicleId,
                                isExpanded: true,
                                dropdownColor: AppColors2026.obsidianSurface,
                                icon: const Icon(LucideIcons.chevronDown, size: 15, color: AppColors2026.amberSolar),
                                hint: const Row(
                                  children: [
                                    Icon(LucideIcons.car, size: 13, color: AppColors2026.textMuted),
                                    SizedBox(width: 5),
                                    Expanded(
                                      child: Text(
                                        'Tous véhicules',
                                        style: TextStyle(fontSize: 11.5, color: AppColors2026.textSecondary),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                items: [
                                  const DropdownMenuItem<String?>(
                                    value: null,
                                    child: Text('Tous véhicules', style: TextStyle(fontSize: 12)),
                                  ),
                                  ...state.vehicles.map((v) => DropdownMenuItem<String?>(
                                        value: v.id,
                                        child: Text(
                                          v.fullName,
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      )),
                                ],
                                onChanged: (val) => setState(() => _selectedVehicleId = val),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Horizontal Type Filter Pills
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildTypeChip('all', 'Tous', LucideIcons.layers, AppColors2026.cyanNeon, allExpenses.length),
                          const SizedBox(width: 8),
                          _buildTypeChip('vignette', 'Vignette', LucideIcons.stamp, AppColors2026.amberSolar,
                              allExpenses.where((e) => e.type == 'vignette').length),
                          const SizedBox(width: 8),
                          _buildTypeChip('assurance', 'Assurance', LucideIcons.shieldCheck, AppColors2026.cyanNeon,
                              allExpenses.where((e) => e.type == 'assurance').length),
                          const SizedBox(width: 8),
                          _buildTypeChip('visite_technique', 'Visite Tech', LucideIcons.wrench, AppColors2026.violetElectric,
                              allExpenses.where((e) => e.type == 'visite_technique').length),
                          const SizedBox(width: 8),
                          _buildTypeChip('gps', 'Traceur GPS', LucideIcons.radio, AppColors2026.emeraldNeon,
                              allExpenses.where((e) => e.type == 'gps').length),
                          const SizedBox(width: 8),
                          _buildTypeChip('credit', 'Crédit', LucideIcons.creditCard, AppColors2026.blueRoyal,
                              allExpenses.where((e) => e.type == 'credit').length),
                          const SizedBox(width: 8),
                          _buildTypeChip('reparation', 'Entretien', LucideIcons.hammer, AppColors2026.roseLaser,
                              allExpenses.where((e) => e.type == 'reparation').length),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 3 KPI Cards
                    Row(
                      children: [
                        Expanded(
                          child: _buildKpiCard(
                            title: 'TOTAL CHARGES',
                            value: '${_currencyFormat.format(totalAmount)} MAD',
                            subtitle: '${filtered.length} dépense(s)',
                            icon: LucideIcons.banknote,
                            accentColor: AppColors2026.amberSolar,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildKpiCard(
                            title: 'COÛT MENSUEL',
                            value: '${_currencyFormat.format(totalMonthly)} MAD',
                            subtitle: 'Impact moyen / mois',
                            icon: LucideIcons.calendarDays,
                            accentColor: AppColors2026.emeraldNeon,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Expense Cards List
            if (filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 68,
                          height: 68,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors2026.amberSolar.withOpacity(0.12),
                            border: Border.all(color: AppColors2026.amberSolar.withOpacity(0.3)),
                          ),
                          child: const Icon(LucideIcons.wallet, size: 32, color: AppColors2026.amberSolar),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Aucune charge enregistrée',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Enregistrez les assurances, vignettes fiscales, visites techniques et révisions de votre flotte.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12, color: AppColors2026.textSecondary),
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors2026.amberSolar,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 4,
                          ),
                          icon: const Icon(LucideIcons.plus, size: 16),
                          label: const Text(
                            'AJOUTER UNE CHARGE',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                          ),
                          onPressed: () => _openExpenseDialog(),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 88),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final exp = filtered[index];
                      final vehicle = state.vehicles
                          .where((v) => v.id == exp.vehicleId)
                          .firstOrNull;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _buildExpenseCard(exp, vehicle),
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors2026.amberSolar,
        elevation: 6,
        icon: const Icon(LucideIcons.plus, color: Colors.black, size: 19),
        label: const Text(
          'NOUVELLE CHARGE',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.w900,
            fontSize: 12,
            letterSpacing: 0.5,
          ),
        ),
        onPressed: () => _openExpenseDialog(),
      ),
    );
  }

  Widget _buildTypeChip(
    String id,
    String label,
    IconData icon,
    Color color,
    int count,
  ) {
    final selected = _selectedType.toLowerCase() == id.toLowerCase();
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => setState(() => _selectedType = id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.2) : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? color : Colors.white.withOpacity(0.08),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: selected ? color : AppColors2026.textMuted),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                color: selected ? Colors.white : AppColors2026.textSecondary,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: selected ? color : Colors.white.withOpacity(0.08),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: selected ? Colors.black : AppColors2026.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors2026.obsidianSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accentColor.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  color: accentColor,
                ),
              ),
              Icon(icon, size: 15, color: accentColor),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 10,
              color: AppColors2026.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpenseCard(ExpenseModel exp, VehicleModel? vehicle) {
    final typeColor = exp.typeColor;
    final startDate = DateTime.tryParse(exp.startDate);
    final endDate = DateTime.tryParse(exp.endDate);

    // Compute status (Active / Expiré / Renouvellement proche)
    final now = DateTime.now();
    bool isExpired = false;
    bool isNearDue = false;
    int daysLeft = 0;
    if (endDate != null) {
      daysLeft = endDate.difference(now).inDays;
      if (daysLeft < 0) {
        isExpired = true;
      } else if (daysLeft <= 30) {
        isNearDue = true;
      }
    }

    return SpatialGlassCard(
      glowColor: typeColor,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Type Badge + Vehicle + Actions
          Row(
            children: [
              // Type Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: typeColor.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: typeColor.withOpacity(0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(exp.typeIcon, size: 13, color: typeColor),
                    const SizedBox(width: 5),
                    Text(
                      exp.typeLabel,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: typeColor,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              // Expiry Indicator Badge if applicable
              if (isExpired)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors2026.roseLaser.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors2026.roseLaser),
                  ),
                  child: const Text(
                    'EXPIRÉ',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: AppColors2026.roseLaser,
                    ),
                  ),
                )
              else if (isNearDue)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors2026.amberSolar.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors2026.amberSolar),
                  ),
                  child: Text(
                    'J-$daysLeft',
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: AppColors2026.amberSolar,
                    ),
                  ),
                ),
              const SizedBox(width: 4),
              // Clean Action Menu (Modifier / Supprimer)
              PopupMenuButton<String>(
                icon: const Icon(LucideIcons.ellipsisVertical, size: 18, color: AppColors2026.textMuted),
                color: AppColors2026.obsidianSurface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.white.withOpacity(0.1)),
                ),
                onSelected: (val) {
                  if (val == 'edit') {
                    _openExpenseDialog(exp);
                  } else if (val == 'delete') {
                    _confirmDelete(exp);
                  }
                },
                itemBuilder: (ctx) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(LucideIcons.pencil, size: 15, color: AppColors2026.cyanNeon),
                        SizedBox(width: 8),
                        Text('Modifier', style: TextStyle(fontSize: 13)),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(LucideIcons.trash2, size: 15, color: AppColors2026.roseLaser),
                        SizedBox(width: 8),
                        Text('Supprimer', style: TextStyle(fontSize: 13, color: AppColors2026.roseLaser)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Vehicle info
          Row(
            children: [
              const Icon(LucideIcons.car, size: 16, color: AppColors2026.textSecondary),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  vehicle?.fullName ?? 'Flotte Générale BonaTours',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
              if (vehicle != null && vehicle.registration.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    vehicle.registration,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppColors2026.amberSolar,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Amounts & Allocation Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'MONTANT TOTAL',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                        color: AppColors2026.textMuted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_currencyFormat.format(exp.totalCost)} MAD',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'IMPACT MENSUEL',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                        color: AppColors2026.textMuted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_currencyFormat.format(exp.monthlyCost)} MAD / mois',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors2026.emeraldNeon,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Dates & Recurring Meta
          Row(
            children: [
              const Icon(LucideIcons.calendar, size: 13, color: AppColors2026.textMuted),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  '${startDate != null ? _displayFormat.format(startDate) : exp.startDate} → ${endDate != null ? _displayFormat.format(endDate) : exp.endDate} (${exp.periodMonths} mois)',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors2026.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (exp.recurringEnabled) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors2026.violetElectric.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(LucideIcons.repeat, size: 10, color: AppColors2026.violetElectric),
                      const SizedBox(width: 3),
                      Text(
                        exp.recurringFrequency == 'yearly'
                            ? 'Annuel'
                            : exp.recurringFrequency == 'quarterly'
                                ? 'Trimestriel'
                                : 'Mensuel',
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: AppColors2026.violetElectric,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),

          // Notes snippet if present
          if (exp.notes != null && exp.notes!.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.02),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.fileText, size: 12, color: AppColors2026.textMuted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      exp.notes!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: AppColors2026.textMuted, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
