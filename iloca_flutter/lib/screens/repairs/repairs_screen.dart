import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:uuid/uuid.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

/// RÉVISIONS & RÉPARATIONS SCREEN — 100% Web Parity (`public.repairs`)
/// Matches the Luxury Obsidian & Gold 2026 Executive Design
class RepairsScreen extends StatefulWidget {
  final AppStateProvider appState;

  const RepairsScreen({super.key, required this.appState});

  @override
  State<RepairsScreen> createState() => _RepairsScreenState();
}

class _RepairsScreenState extends State<RepairsScreen> {
  String _filter = 'all'; // 'all' | 'en_maintenance' | 'immobilise_long' | 'pret_pour_retour'

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
    super.dispose();
  }

  void _openAddRepairModal([RepairModel? existing]) {
    final vehicles = widget.appState.vehicles;
    if (vehicles.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ajoutez d\'abord un véhicule au parc.'),
          backgroundColor: AppColors2026.roseLaser,
        ),
      );
      return;
    }

    String selectedVehicleId = existing?.vehicleId ?? vehicles.first.id;
    String selectedType = existing?.typeReparation ?? 'Mécanique';
    String selectedStatus = existing?.operationalStatus ?? 'en_maintenance';
    String selectedMethod = existing?.paymentMethod ?? 'Espèces';
    final coutCtrl = TextEditingController(
        text: existing != null && existing.cout > 0 ? existing.cout.toStringAsFixed(0) : '');
    final payeCtrl = TextEditingController(
        text: existing != null && existing.paye > 0 ? existing.paye.toStringAsFixed(0) : '');
    final noteCtrl = TextEditingController(text: existing?.note ?? '');
    bool saving = false;

    final types = [
      'Mécanique',
      'Électrique',
      'Carrosserie',
      'Garage',
      'Vidange & Filtres',
      'Pneumatiques',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors2026.modalSheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.fromLTRB(
              18,
              14,
              18,
              MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors2026.gold.withOpacity(0.4),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: AppColors2026.gold.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(11),
                          border: Border.all(color: AppColors2026.gold.withOpacity(0.35)),
                        ),
                        child: const Icon(LucideIcons.wrench,
                            size: 17, color: AppColors2026.goldLight),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '✦ MAINTENANCE & PARC 2026',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: AppColors2026.goldLight,
                                letterSpacing: 1.1,
                              ),
                            ),
                            Text(
                              existing == null
                                  ? 'Ajouter une Révision / Réparation'
                                  : 'Modifier Réparation',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(LucideIcons.x, size: 18),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'VÉHICULE CONCERNÉ *',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors2026.goldLight,
                      letterSpacing: 0.7,
                    ),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: vehicles.any((v) => v.id == selectedVehicleId)
                        ? selectedVehicleId
                        : vehicles.first.id,
                    dropdownColor: AppColors2026.obsidianElevated,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(LucideIcons.car, size: 17, color: AppColors2026.goldLight),
                    ),
                    items: vehicles
                        .map((v) => DropdownMenuItem(
                              value: v.id,
                              child: Text(
                                '${v.fullName} (${v.registration})',
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                              ),
                            ))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setModalState(() => selectedVehicleId = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'TYPE D\'INTERVENTION *',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors2026.goldLight,
                      letterSpacing: 0.7,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: types.map((t) {
                      final active = t == selectedType;
                      return GestureDetector(
                        onTap: () => setModalState(() => selectedType = t),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: active
                                ? AppColors2026.gold.withOpacity(0.16)
                                : AppColors2026.surfaceInput,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: active
                                  ? AppColors2026.gold
                                  : Colors.white.withOpacity(0.08),
                            ),
                          ),
                          child: Text(
                            t,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: active ? AppColors2026.goldLight : Colors.white70,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: coutCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Coût Total (DH) *',
                            prefixIcon: Icon(LucideIcons.coins,
                                size: 17, color: AppColors2026.goldLight),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: payeCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Montant Payé (DH)',
                            prefixIcon: Icon(LucideIcons.wallet,
                                size: 17, color: AppColors2026.emeraldNeon),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: selectedStatus,
                          dropdownColor: AppColors2026.obsidianElevated,
                          decoration: const InputDecoration(labelText: 'État Atelier'),
                          items: const [
                            DropdownMenuItem(value: 'en_maintenance', child: Text('En maintenance')),
                            DropdownMenuItem(value: 'immobilise_long', child: Text('Immobilisé')),
                            DropdownMenuItem(value: 'pret_pour_retour', child: Text('Prêt retour')),
                          ],
                          onChanged: (v) {
                            if (v != null) setModalState(() => selectedStatus = v);
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: selectedMethod,
                          dropdownColor: AppColors2026.obsidianElevated,
                          decoration: const InputDecoration(labelText: 'Règlement'),
                          items: const [
                            DropdownMenuItem(value: 'Espèces', child: Text('Espèces')),
                            DropdownMenuItem(value: 'Chèque', child: Text('Chèque')),
                            DropdownMenuItem(value: 'Virement', child: Text('Virement')),
                            DropdownMenuItem(value: 'Carte', child: Text('Carte')),
                          ],
                          onChanged: (v) {
                            if (v != null) setModalState(() => selectedMethod = v);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: noteCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Description / Garage (Optionnel)',
                      prefixIcon: Icon(LucideIcons.fileText,
                          size: 17, color: AppColors2026.goldLight),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: DarkLuxuryButton(
                          label: 'Annuler',
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        flex: 3,
                        child: GoldGradientButton(
                          label: saving ? 'Sauvegarde...' : 'Enregistrer',
                          icon: LucideIcons.check,
                          loading: saving,
                          onPressed: () async {
                            final cout = double.tryParse(coutCtrl.text.trim()) ?? 0;
                            final paye = double.tryParse(payeCtrl.text.trim()) ?? 0;
                            if (cout <= 0) return;
                            setModalState(() => saving = true);
                            final veh = vehicles.firstWhere((v) => v.id == selectedVehicleId);
                            final now = DateTime.now().toIso8601String();
                            final model = RepairModel(
                              id: existing?.id ?? const Uuid().v4(),
                              vehicleId: veh.id,
                              vehicleInfo: {
                                'marque': veh.brand,
                                'modele': veh.model,
                                'immatriculation': veh.registration,
                              },
                              typeReparation: selectedType,
                              cout: cout,
                              paye: paye,
                              dette: (cout - paye).clamp(0, double.infinity),
                              dateReparation: existing?.dateReparation ?? now.substring(0, 10),
                              paymentMethod: selectedMethod,
                              operationalStatus: selectedStatus,
                              note: noteCtrl.text.trim(),
                              createdAt: existing?.createdAt ?? now,
                              updatedAt: now,
                            );
                            await widget.appState.saveRepair(model, isEdit: existing != null);
                            if (ctx.mounted) Navigator.pop(ctx);
                          },
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
    );
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final all = widget.appState.repairs;
    final filtered = all.where((r) {
      if (_filter == 'all') return true;
      return r.operationalStatus == _filter;
    }).toList();

    final totalCost = all.fold<double>(0, (s, r) => s + r.cout);
    final totalDebt = all.fold<double>(0, (s, r) => s + r.dette);
    final activeMaint = all.where((r) => !r.isReadyForReturn).length;

    return RefreshIndicator(
      color: AppColors2026.gold,
      onRefresh: widget.appState.refreshAllData,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 110),
        children: [
          SpatialGlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Révisions & Réparations',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Maintenance, pannes & suivi atelier en direct',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors2026.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    GoldGradientButton(
                      label: '+ Révision',
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      borderRadius: 14,
                      fontSize: 12,
                      onPressed: () => _openAddRepairModal(),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(11),
                        decoration: BoxDecoration(
                          color: AppColors2026.surfaceInput,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.06)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Coût Total Atelier',
                              style: TextStyle(fontSize: 10, color: AppColors2026.textSecondary),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${fmt.format(totalCost.round())} DH',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                color: AppColors2026.goldLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(11),
                        decoration: BoxDecoration(
                          color: AppColors2026.surfaceInput,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: totalDebt > 0
                                ? AppColors2026.roseLaser.withOpacity(0.3)
                                : AppColors2026.emeraldNeon.withOpacity(0.3),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Dettes / En cours',
                              style: TextStyle(fontSize: 10, color: AppColors2026.textSecondary),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${fmt.format(totalDebt.round())} DH ($activeMaint)',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: totalDebt > 0
                                    ? AppColors2026.roseLaser
                                    : AppColors2026.emeraldNeon,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('all', 'Toutes (${all.length})'),
                      const SizedBox(width: 6),
                      _buildFilterChip('en_maintenance', 'En maintenance'),
                      const SizedBox(width: 6),
                      _buildFilterChip('immobilise_long', 'Immobilisées'),
                      const SizedBox(width: 6),
                      _buildFilterChip('pret_pour_retour', 'Prêtes'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (filtered.isEmpty)
            SpatialGlassCard(
              subtle: true,
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(LucideIcons.shieldCheck,
                      size: 36, color: AppColors2026.emeraldNeon.withOpacity(0.8)),
                  const SizedBox(height: 10),
                  const Text(
                    'Aucune intervention dans cette catégorie',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Toutes les révisions et réparations ajoutées sur le Web ou Android apparaissent ici.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: AppColors2026.textSecondary),
                  ),
                ],
              ),
            )
          else
            ...filtered.map((rep) {
              final ready = rep.isReadyForReturn;
              final statusColor = ready
                  ? AppColors2026.emeraldNeon
                  : rep.operationalStatus == 'immobilise_long'
                      ? AppColors2026.roseLaser
                      : AppColors2026.amberSolar;
              final statusText = ready
                  ? 'Prêt retour'
                  : rep.operationalStatus == 'immobilise_long'
                      ? 'Immobilisé'
                      : 'En maintenance';
              return SpatialGlassCard(
                margin: const EdgeInsets.only(bottom: 10),
                subtle: true,
                borderColor: statusColor.withOpacity(0.32),
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                rep.typeReparation,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${rep.vehicleDisplay} • ${rep.dateReparation}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors2026.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        NeonBadge(label: statusText, color: statusColor),
                      ],
                    ),
                    if (rep.note.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        rep.note,
                        style: const TextStyle(fontSize: 11.5, color: Colors.white70),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: AppColors2026.surfaceInput,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Coût : ${fmt.format(rep.cout.round())} DH',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: AppColors2026.goldLight,
                            ),
                          ),
                          Text(
                            'Payé : ${fmt.format(rep.paye.round())} DH',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors2026.emeraldNeon,
                            ),
                          ),
                          if (rep.dette > 0)
                            Text(
                              'Reste : ${fmt.format(rep.dette.round())} DH',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppColors2026.roseLaser,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        if (!ready)
                          Expanded(
                            child: DarkLuxuryButton(
                              label: 'Marquer Prêt',
                              icon: LucideIcons.checkCircle2,
                              accentColor: AppColors2026.emeraldNeon,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                              fontSize: 11,
                              onPressed: () => widget.appState.saveRepair(
                                rep.copyWith(operationalStatus: 'pret_pour_retour'),
                                isEdit: true,
                              ),
                            ),
                          )
                        else
                          Expanded(
                            child: DarkLuxuryButton(
                              label: 'Modifier',
                              icon: LucideIcons.pencil,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                              fontSize: 11,
                              onPressed: () => _openAddRepairModal(rep),
                            ),
                          ),
                        if (widget.appState.canDelete) ...[
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () => widget.appState.deleteRepair(rep.id),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppColors2026.surfaceInput,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white.withOpacity(0.1)),
                              ),
                              child: const Icon(LucideIcons.trash2,
                                  size: 16, color: AppColors2026.roseLaser),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String id, String label) {
    final active = _filter == id;
    return GestureDetector(
      onTap: () => setState(() => _filter = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          gradient: active ? AppColors2026.goldGradient : null,
          color: active ? null : AppColors2026.surfaceInput,
          borderRadius: BorderRadius.circular(999),
          border: active ? null : Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: active ? AppColors2026.obsidian : Colors.white70,
          ),
        ),
      ),
    );
  }
}
