import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

/// 3. VÉHICULES SCREEN (Parc Automobile Spatial 2026)
class VehiclesScreen extends StatefulWidget {
  final AppStateProvider appState;

  const VehiclesScreen({super.key, required this.appState});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  String _search = '';
  String _statusFilter = 'all'; // 'all' | 'disponible' | 'loue' | 'maintenance'

  void _openVehicleForm([VehicleModel? existing]) {
    final brandCtrl = TextEditingController(text: existing?.brand ?? '');
    final modelCtrl = TextEditingController(text: existing?.model ?? '');
    final regCtrl = TextEditingController(text: existing?.registration ?? '');
    final yearCtrl =
        TextEditingController(text: (existing?.year ?? 2025).toString());
    final rateCtrl =
        TextEditingController(text: (existing?.dailyRate ?? 350).round().toString());
    final mileageCtrl =
        TextEditingController(text: (existing?.mileage ?? 0).round().toString());
    final colorCtrl = TextEditingController(text: existing?.color ?? 'Noir');
    String fuel = existing?.fuelType ?? 'Diesel';
    String gearbox = existing?.gearbox ?? 'Automatique';
    String status = existing?.status ?? 'disponible';
    bool hasGps = existing?.hasGps ?? true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
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
                              ? 'AJOUTER UN VÉHICULE AU PARC'
                              : 'MODIFIER LE VÉHICULE',
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
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: brandCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Marque * (ex: Dacia)',
                              prefixIcon: Icon(LucideIcons.car, size: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: modelCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Modèle (ex: Logan)',
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
                            controller: regCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Immatriculation *',
                              prefixIcon: Icon(LucideIcons.hash, size: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: yearCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Année',
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
                            decoration: const InputDecoration(
                              labelText: 'Prix / Jour (DH)',
                              prefixIcon: Icon(LucideIcons.dollarSign, size: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: mileageCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Kilométrage (km)',
                              prefixIcon: Icon(LucideIcons.gauge, size: 16),
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
                            value: fuel,
                            decoration:
                                const InputDecoration(labelText: 'Carburant'),
                            items: const [
                              DropdownMenuItem(
                                  value: 'Diesel', child: Text('Diesel')),
                              DropdownMenuItem(
                                  value: 'Essence', child: Text('Essence')),
                              DropdownMenuItem(
                                  value: 'Hybride', child: Text('Hybride')),
                              DropdownMenuItem(
                                  value: 'Électrique',
                                  child: Text('Électrique')),
                            ],
                            onChanged: (v) {
                              if (v != null) setSheetState(() => fuel = v);
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: gearbox,
                            decoration:
                                const InputDecoration(labelText: 'Boîte'),
                            items: const [
                              DropdownMenuItem(
                                  value: 'Automatique',
                                  child: Text('Automatique')),
                              DropdownMenuItem(
                                  value: 'Manuelle', child: Text('Manuelle')),
                            ],
                            onChanged: (v) {
                              if (v != null) setSheetState(() => gearbox = v);
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: status,
                            decoration:
                                const InputDecoration(labelText: 'État'),
                            items: const [
                              DropdownMenuItem(
                                  value: 'disponible',
                                  child: Text('Disponible')),
                              DropdownMenuItem(
                                  value: 'loue', child: Text('Loué')),
                              DropdownMenuItem(
                                  value: 'maintenance',
                                  child: Text('En Maintenance')),
                            ],
                            onChanged: (v) {
                              if (v != null) setSheetState(() => status = v);
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: colorCtrl,
                            decoration:
                                const InputDecoration(labelText: 'Couleur'),
                          ),
                        ),
                      ],
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Équipé d\'un Traceur GPSWOX',
                        style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                      value: hasGps,
                      activeColor: AppColors2026.cyanNeon,
                      onChanged: (v) => setSheetState(() => hasGps = v),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: () async {
                        if (brandCtrl.text.trim().isEmpty) return;
                        final now = DateTime.now().toIso8601String();
                        final model = VehicleModel(
                          id: existing?.id ?? '',
                          brand: brandCtrl.text.trim(),
                          model: modelCtrl.text.trim(),
                          registration: regCtrl.text.trim(),
                          year: int.tryParse(yearCtrl.text) ?? 2025,
                          fuelType: fuel,
                          gearbox: gearbox,
                          mileage: double.tryParse(mileageCtrl.text) ?? 0,
                          color: colorCtrl.text.trim(),
                          dailyRate: double.tryParse(rateCtrl.text) ?? 300,
                          status: status,
                          hasGps: hasGps,
                          createdAt: existing?.createdAt ?? now,
                          updatedAt: now,
                        );
                        Navigator.pop(ctx);
                        await widget.appState.saveVehicle(
                          model,
                          isEdit: existing != null,
                        );
                      },
                      icon: const Icon(LucideIcons.checkCircle2, size: 18),
                      label: Text(
                        existing == null
                            ? 'AJOUTER & SYNCHRONISER'
                            : 'ENREGISTRER LES MODIFICATIONS',
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

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'disponible':
        return AppColors2026.emeraldNeon;
      case 'loue':
        return AppColors2026.cyanNeon;
      case 'maintenance':
        return AppColors2026.roseLaser;
      default:
        return AppColors2026.amberSolar;
    }
  }

  String _statusLabel(String status) {
    switch (status.toLowerCase()) {
      case 'disponible':
        return 'Disponible';
      case 'loue':
        return 'Loué';
      case 'maintenance':
        return 'Maintenance';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'fr_FR');
    final all = widget.appState.vehicles;
    final filtered = all.where((v) {
      if (_statusFilter != 'all' && v.status.toLowerCase() != _statusFilter) {
        return false;
      }
      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        return v.fullName.toLowerCase().contains(q) ||
            v.registration.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 92),
        child: FloatingActionButton.extended(
          onPressed: () => _openVehicleForm(),
          backgroundColor: AppColors2026.cyanNeon,
          foregroundColor: AppColors2026.abyss,
          icon: const Icon(LucideIcons.plus, size: 18),
          label: const Text(
            'Ajouter Véhicule',
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
                        'Rechercher véhicule par marque, modèle ou matricule...',
                    prefixIcon: Icon(LucideIcons.search, size: 18),
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _StatusChip(
                        label: 'Tout (${all.length})',
                        selected: _statusFilter == 'all',
                        color: AppColors2026.cyanNeon,
                        onTap: () => setState(() => _statusFilter = 'all'),
                      ),
                      const SizedBox(width: 8),
                      _StatusChip(
                        label:
                            'Disponibles (${widget.appState.availableVehiclesCount})',
                        selected: _statusFilter == 'disponible',
                        color: AppColors2026.emeraldNeon,
                        onTap: () =>
                            setState(() => _statusFilter = 'disponible'),
                      ),
                      const SizedBox(width: 8),
                      _StatusChip(
                        label: 'Loués (${widget.appState.rentedVehiclesCount})',
                        selected: _statusFilter == 'loue',
                        color: AppColors2026.violetElectric,
                        onTap: () => setState(() => _statusFilter = 'loue'),
                      ),
                      const SizedBox(width: 8),
                      _StatusChip(
                        label:
                            'Atelier (${widget.appState.maintenanceVehiclesCount})',
                        selected: _statusFilter == 'maintenance',
                        color: AppColors2026.roseLaser,
                        onTap: () =>
                            setState(() => _statusFilter = 'maintenance'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text(
                      'Aucun véhicule dans cette catégorie.',
                      style: TextStyle(color: AppColors2026.textSecondary),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 6, 16, 130),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) {
                      final v = filtered[i];
                      final stColor = _statusColor(v.status);

                      return SpatialGlassCard(
                        margin: const EdgeInsets.only(bottom: 12),
                        borderColor: stColor.withOpacity(0.35),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(11),
                                  decoration: BoxDecoration(
                                    color: stColor.withOpacity(0.16),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                        color: stColor.withOpacity(0.4)),
                                  ),
                                  child: Icon(LucideIcons.car,
                                      color: stColor, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        v.fullName,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      Text(
                                        'Matricule : ${v.registration.isEmpty ? "—" : v.registration} • Modèle ${v.year}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors2026.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                NeonBadge(
                                  label: _statusLabel(v.status),
                                  color: stColor,
                                  pulsing:
                                      v.status.toLowerCase() == 'disponible',
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _SpecPill(
                                  icon: LucideIcons.fuel,
                                  text: v.fuelType,
                                ),
                                _SpecPill(
                                  icon: LucideIcons.settings2,
                                  text: v.gearbox,
                                ),
                                _SpecPill(
                                  icon: LucideIcons.gauge,
                                  text:
                                      '${currencyFmt.format(v.mileage.round())} km',
                                ),
                                if (v.hasGps)
                                  const _SpecPill(
                                    icon: LucideIcons.radio,
                                    text: 'GPS Actif',
                                    color: AppColors2026.emeraldNeon,
                                  ),
                              ],
                            ),
                            const Divider(height: 20, color: Colors.white12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${currencyFmt.format(v.dailyRate.round())} DH / jour',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors2026.cyanBright,
                                  ),
                                ),
                                Row(
                                  children: [
                                    IconButton(
                                      onPressed: () => _openVehicleForm(v),
                                      icon: const Icon(LucideIcons.edit3,
                                          size: 17),
                                      tooltip: 'Modifier',
                                    ),
                                    IconButton(
                                      onPressed: () =>
                                          widget.appState.deleteVehicle(v.id),
                                      icon: const Icon(
                                        LucideIcons.trash2,
                                        size: 17,
                                        color: AppColors2026.roseLaser,
                                      ),
                                      tooltip: 'Supprimer',
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

class _StatusChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _StatusChip({
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? color : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: selected ? color : Colors.white12),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: selected ? AppColors2026.abyss : Colors.white,
          ),
        ),
      ),
    );
  }
}

class _SpecPill extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color? color;

  const _SpecPill({
    required this.icon,
    required this.text,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors2026.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: c),
          const SizedBox(width: 5),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: color ?? Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
