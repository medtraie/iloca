import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

/// 4. CONTRATS SCREEN (Gestion des Contrats & Calcul Financier Temps Réel)
class ContractsScreen extends StatefulWidget {
  final AppStateProvider appState;

  const ContractsScreen({super.key, required this.appState});

  @override
  State<ContractsScreen> createState() => _ContractsScreenState();
}

class _ContractsScreenState extends State<ContractsScreen> {
  String _search = '';
  String _statusFilter = 'all'; // 'all' | 'ouvert' | 'ferme'

  void _openContractForm([ContractModel? existing]) {
    final now = DateTime.now();
    final numCtrl = TextEditingController(
      text: existing?.contractNumber ??
          'CNT-${now.year}-${now.millisecondsSinceEpoch.toString().substring(9)}',
    );
    final customerNameCtrl =
        TextEditingController(text: existing?.customerName ?? '');
    final customerPhoneCtrl =
        TextEditingController(text: existing?.customerPhone ?? '');
    final customerCinCtrl =
        TextEditingController(text: existing?.customerCin ?? '');
    final vehicleNameCtrl =
        TextEditingController(text: existing?.vehicle ?? '');
    final startDateCtrl = TextEditingController(
      text: existing?.startDate ?? DateFormat('yyyy-MM-dd').format(now),
    );
    final endDateCtrl = TextEditingController(
      text: existing?.endDate ??
          DateFormat('yyyy-MM-dd').format(now.add(const Duration(days: 3))),
    );
    final rateCtrl = TextEditingController(
      text: (existing?.dailyRate ?? 300).round().toString(),
    );
    final advanceCtrl = TextEditingController(
      text: (existing?.advancePayment ?? 0).round().toString(),
    );

    String selectedVehicleId = existing?.vehicleId ?? '';
    String selectedClientId = existing?.clientId ?? '';
    String paymentMethod = existing?.paymentMethod ?? 'Espèces';
    String status = existing?.status ?? 'ouvert';

    int computeDays() {
      final s = DateTime.tryParse(startDateCtrl.text);
      final e = DateTime.tryParse(endDateCtrl.text);
      if (s == null || e == null) return 1;
      final d = e.difference(s).inDays;
      return d <= 0 ? 1 : d;
    }

    double computeTotal() {
      final r = double.tryParse(rateCtrl.text) ?? 300;
      return computeDays() * r;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final totalAmount = computeTotal();
            final adv = double.tryParse(advanceCtrl.text) ?? 0;
            final remaining = (totalAmount - adv).clamp(0, double.infinity);

            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
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
                        Text(
                          existing == null
                              ? 'NOUVEAU CONTRAT DE LOCATION'
                              : 'MODIFIER LE CONTRAT',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(LucideIcons.x, size: 18),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    // Quick Select Existing Client
                    if (widget.appState.clients.isNotEmpty)
                      DropdownButtonFormField<String>(
                        value: selectedClientId.isEmpty ? null : selectedClientId,
                        decoration: const InputDecoration(
                          labelText: 'Sélection rapide client existant',
                          prefixIcon: Icon(LucideIcons.users, size: 16),
                        ),
                        items: widget.appState.clients
                            .map((c) => DropdownMenuItem(
                                  value: c.id,
                                  child: Text('${c.fullName} (${c.cin})'),
                                ))
                            .toList(),
                        onChanged: (id) {
                          if (id == null) return;
                          final found = widget.appState.clients
                              .firstWhere((c) => c.id == id);
                          setSheetState(() {
                            selectedClientId = found.id;
                            customerNameCtrl.text = found.fullName;
                            customerPhoneCtrl.text = found.phone;
                            customerCinCtrl.text = found.cin;
                          });
                        },
                      ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: customerNameCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Nom du Client *',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: customerCinCtrl,
                            decoration: const InputDecoration(
                              labelText: 'CIN Client',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    // Quick Select Existing Vehicle
                    if (widget.appState.vehicles.isNotEmpty)
                      DropdownButtonFormField<String>(
                        value:
                            selectedVehicleId.isEmpty ? null : selectedVehicleId,
                        decoration: const InputDecoration(
                          labelText: 'Sélectionner un véhicule du parc',
                          prefixIcon: Icon(LucideIcons.car, size: 16),
                        ),
                        items: widget.appState.vehicles
                            .map((v) => DropdownMenuItem(
                                  value: v.id,
                                  child: Text(
                                      '${v.fullName} (${v.registration}) - ${v.dailyRate.round()} DH/j'),
                                ))
                            .toList(),
                        onChanged: (id) {
                          if (id == null) return;
                          final v = widget.appState.vehicles
                              .firstWhere((x) => x.id == id);
                          setSheetState(() {
                            selectedVehicleId = v.id;
                            vehicleNameCtrl.text =
                                '${v.fullName} ${v.registration}'.trim();
                            rateCtrl.text = v.dailyRate.round().toString();
                          });
                        },
                      ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: vehicleNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Véhicule *',
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: startDateCtrl,
                            onChanged: (_) => setSheetState(() {}),
                            decoration: const InputDecoration(
                              labelText: 'Départ (YYYY-MM-DD)',
                              prefixIcon: Icon(LucideIcons.calendar, size: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: endDateCtrl,
                            onChanged: (_) => setSheetState(() {}),
                            decoration: const InputDecoration(
                              labelText: 'Retour (YYYY-MM-DD)',
                              prefixIcon: Icon(LucideIcons.calendar, size: 16),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: rateCtrl,
                            keyboardType: TextInputType.number,
                            onChanged: (_) => setSheetState(() {}),
                            decoration: const InputDecoration(
                              labelText: 'Prix / Jour (DH)',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: advanceCtrl,
                            keyboardType: TextInputType.number,
                            onChanged: (_) => setSheetState(() {}),
                            decoration: const InputDecoration(
                              labelText: 'Avance payée (DH)',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: paymentMethod,
                            decoration: const InputDecoration(
                                labelText: 'Mode de paiement'),
                            items: const [
                              DropdownMenuItem(
                                  value: 'Espèces', child: Text('Espèces')),
                              DropdownMenuItem(
                                  value: 'Chèque', child: Text('Chèque')),
                              DropdownMenuItem(
                                  value: 'Virement', child: Text('Virement')),
                            ],
                            onChanged: (v) {
                              if (v != null) {
                                setSheetState(() => paymentMethod = v);
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: status,
                            decoration: const InputDecoration(
                                labelText: 'Statut Contrat'),
                            items: const [
                              DropdownMenuItem(
                                  value: 'ouvert', child: Text('Ouvert / Actif')),
                              DropdownMenuItem(
                                  value: 'signed', child: Text('Signé')),
                              DropdownMenuItem(
                                  value: 'ferme',
                                  child: Text('Fermé / Clôturé')),
                            ],
                            onChanged: (v) {
                              if (v != null) setSheetState(() => status = v);
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    // Live Financial Summary Banner
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors2026.cyanNeon.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: AppColors2026.cyanNeon.withOpacity(0.35)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Durée: ${computeDays()} jours',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            'Total: ${totalAmount.round()} DH',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 14,
                              color: AppColors2026.cyanBright,
                            ),
                          ),
                          Text(
                            'Reste: ${remaining.round()} DH',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                              color: AppColors2026.amberSolar,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () async {
                        if (customerNameCtrl.text.trim().isEmpty ||
                            vehicleNameCtrl.text.trim().isEmpty) return;
                        final nowIso = DateTime.now().toIso8601String();
                        final model = ContractModel(
                          id: existing?.id ?? '',
                          contractNumber: numCtrl.text.trim(),
                          customerName: customerNameCtrl.text.trim(),
                          customerPhone: customerPhoneCtrl.text.trim(),
                          customerCin: customerCinCtrl.text.trim(),
                          clientId: selectedClientId,
                          vehicle: vehicleNameCtrl.text.trim(),
                          vehicleId: selectedVehicleId,
                          startDate: startDateCtrl.text.trim(),
                          endDate: endDateCtrl.text.trim(),
                          dailyRate: double.tryParse(rateCtrl.text) ?? 300,
                          totalAmount: totalAmount,
                          advancePayment: adv,
                          paymentMethod: paymentMethod,
                          status: status,
                          createdAt: existing?.createdAt ?? nowIso,
                          updatedAt: nowIso,
                        );
                        Navigator.pop(ctx);
                        await widget.appState.saveContract(
                          model,
                          isEdit: existing != null,
                        );
                      },
                      icon: const Icon(LucideIcons.fileCheck2, size: 18),
                      label: Text(
                        existing == null
                            ? 'CRÉER LE CONTRAT & METTRE VÉHICULE EN LOCATION'
                            : 'SYNCHRONISER LE CONTRAT',
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'fr_FR');
    final all = widget.appState.contracts;
    final filtered = all.where((c) {
      if (_statusFilter == 'ouvert' && !c.isActive) return false;
      if (_statusFilter == 'ferme' && c.isActive) return false;
      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        return c.customerName.toLowerCase().contains(q) ||
            c.vehicle.toLowerCase().contains(q) ||
            c.contractNumber.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 92),
        child: FloatingActionButton.extended(
          onPressed: () => _openContractForm(),
          backgroundColor: AppColors2026.violetElectric,
          foregroundColor: Colors.white,
          icon: const Icon(LucideIcons.filePlus, size: 18),
          label: const Text(
            'Nouveau Contrat',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
            child: Column(
              children: [
                TextField(
                  onChanged: (v) => setState(() => _search = v),
                  decoration: const InputDecoration(
                    hintText:
                        'Rechercher contrat par N°, client ou véhicule...',
                    prefixIcon: Icon(LucideIcons.search, size: 18),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _FilterTab(
                      label: 'Tous (${all.length})',
                      selected: _statusFilter == 'all',
                      onTap: () => setState(() => _statusFilter = 'all'),
                    ),
                    const SizedBox(width: 8),
                    _FilterTab(
                      label:
                          'Ouverts (${widget.appState.activeContractsCount})',
                      selected: _statusFilter == 'ouvert',
                      onTap: () => setState(() => _statusFilter = 'ouvert'),
                    ),
                    const SizedBox(width: 8),
                    _FilterTab(
                      label:
                          'Clôturés (${all.length - widget.appState.activeContractsCount})',
                      selected: _statusFilter == 'ferme',
                      onTap: () => setState(() => _statusFilter = 'ferme'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text(
                      'Aucun contrat trouvé.',
                      style: TextStyle(color: AppColors2026.textSecondary),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 6, 16, 130),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) {
                      final c = filtered[i];
                      final active = c.isActive;
                      final accent = active
                          ? AppColors2026.emeraldNeon
                          : AppColors2026.textSecondary;

                      return SpatialGlassCard(
                        margin: const EdgeInsets.only(bottom: 12),
                        borderColor: accent.withOpacity(0.35),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                NeonBadge(
                                  label: c.contractNumber,
                                  color: AppColors2026.cyanNeon,
                                  icon: LucideIcons.fileText,
                                ),
                                NeonBadge(
                                  label: active ? 'OUVERT / ACTIF' : 'CLÔTURÉ',
                                  color: accent,
                                  pulsing: active,
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              c.customerName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 3),
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
                                      fontWeight: FontWeight.w700,
                                      color: AppColors2026.textSecondary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.04),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Du ${c.startDate} au ${c.endDate} (${c.durationDays}j)',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    c.paymentMethod,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors2026.amberSolar,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Divider(height: 20, color: Colors.white12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Total : ${currencyFmt.format(c.totalAmount)} DH',
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w900,
                                        color: AppColors2026.emeraldBright,
                                      ),
                                    ),
                                    if (c.remainingAmount > 0)
                                      Text(
                                        'Reste à payer : ${currencyFmt.format(c.remainingAmount)} DH',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors2026.roseLaser,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                  ],
                                ),
                                Row(
                                  children: [
                                    IconButton(
                                      onPressed: () => _openContractForm(c),
                                      icon: const Icon(LucideIcons.edit3,
                                          size: 17),
                                    ),
                                    IconButton(
                                      onPressed: () =>
                                          widget.appState.deleteContract(c),
                                      icon: const Icon(
                                        LucideIcons.trash2,
                                        size: 17,
                                        color: AppColors2026.roseLaser,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
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

class _FilterTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterTab({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? AppColors2026.violetElectric
              : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: selected ? Colors.white : AppColors2026.textSecondary,
          ),
        ),
      ),
    );
  }
}
