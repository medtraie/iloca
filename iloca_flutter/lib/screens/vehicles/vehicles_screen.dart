import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../core/widgets/vehicle_image_preview.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import 'vehicle_form_dialog.dart';

/// 3. VÉHICULES SCREEN — 100% Web Parity (Vehicles.tsx + VehicleFormDialog.tsx)
/// Features:
/// - Real-time Supabase sync with public.vehicles (Bidirectional Web & Mobile)
/// - Vehicle HD Photo Gallery preview & Studio Photo capture
/// - Quick stats and search filter bar
class VehiclesScreen extends StatefulWidget {
  final AppStateProvider appState;

  const VehiclesScreen({super.key, required this.appState});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  String _search = '';
  String _statusFilter = 'all'; // 'all' | 'disponible' | 'loue' | 'maintenance'

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

  void _openVehicleForm([VehicleModel? existing]) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (ctx) => VehicleFormDialog(
          appState: widget.appState,
          vehicle: existing,
        ),
      ),
    );
  }

  Future<void> _confirmDelete(VehicleModel vehicle) async {
    if (!widget.appState.canDelete) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Suppression non autorisée pour votre compte'),
          backgroundColor: AppColors2026.roseLaser,
        ),
      );
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors2026.obsidianSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: AppColors2026.roseLaser.withOpacity(0.4)),
        ),
        title: const Row(
          children: [
            Icon(LucideIcons.alertTriangle,
                color: AppColors2026.roseLaser, size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Retirer le véhicule ?',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
        content: Text(
          'Êtes-vous sûr de vouloir supprimer définitivement ${vehicle.fullName} (${vehicle.registration}) du parc automobile ? Cette action sera également répercutée sur le Web.',
          style: const TextStyle(fontSize: 13, color: AppColors2026.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors2026.roseLaser,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await widget.appState.deleteVehicle(vehicle.id);
    }
  }

  Color _statusColor(String s) {
    switch (s.toLowerCase()) {
      case 'disponible':
        return AppColors2026.emeraldNeon;
      case 'loue':
        return AppColors2026.violetElectric;
      case 'maintenance':
        return AppColors2026.amberSolar;
      default:
        return AppColors2026.roseLaser;
    }
  }

  String _statusLabel(String s) {
    switch (s.toLowerCase()) {
      case 'disponible':
        return 'Disponible';
      case 'loue':
        return 'En Location';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Hors Service';
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'fr_FR');
    final all = widget.appState.vehicles;

    final filtered = all.where((v) {
      if (_statusFilter != 'all' &&
          v.status.toLowerCase() != _statusFilter.toLowerCase()) {
        return false;
      }
      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        return v.fullName.toLowerCase().contains(q) ||
            v.registration.toLowerCase().contains(q) ||
            v.color.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    final dispCount = all.where((v) => v.status == 'disponible').length;
    final rentedCount = all.where((v) => v.status == 'loue').length;
    final maintCount = all.where((v) => v.status == 'maintenance').length;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          // Executive Header + Search + Gold Filter Chips (Canvas renderVehiculesView)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'PARC AUTOMOBILE',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.8,
                              color: AppColors2026.gold.withOpacity(0.85),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Text(
                                'Véhicules',
                                style: AppTheme2026.luxurySerif(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors2026.emeraldNeon
                                      .withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: AppColors2026.emeraldNeon
                                        .withOpacity(0.35),
                                  ),
                                ),
                                child: Text(
                                  '${all.length} UNITÉS',
                                  style: const TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.7,
                                    color: AppColors2026.emeraldBright,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Circular Refresh
                    InkWell(
                      onTap: () => widget.appState.refreshAllData(),
                      borderRadius: BorderRadius.circular(999),
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppColors2026.obsidianElevated,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white.withOpacity(0.08),
                          ),
                        ),
                        child: Icon(
                          LucideIcons.refreshCw,
                          size: 16,
                          color: widget.appState.isSyncing
                              ? AppColors2026.goldLight
                              : Colors.white70,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GoldGradientButton(
                      onPressed: () => _openVehicleForm(),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      borderRadius: 999,
                      fontSize: 12,
                      icon: LucideIcons.plus,
                      label: 'Ajouter',
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Search Bar (#161922)
                SizedBox(
                  height: 44,
                  child: TextField(
                    onChanged: (v) => setState(() => _search = v),
                    style: const TextStyle(
                      fontSize: 13,
                      color: Colors.white,
                    ),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppColors2026.surfaceInput,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 0,
                      ),
                      hintText:
                          'Rechercher marque, modèle, matricule, couleur...',
                      hintStyle: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors2026.textMuted,
                      ),
                      prefixIcon: const Icon(
                        LucideIcons.search,
                        size: 16,
                        color: AppColors2026.gold,
                      ),
                      suffixIcon: _search.isNotEmpty
                          ? IconButton(
                              icon: const Icon(
                                LucideIcons.x,
                                size: 14,
                                color: AppColors2026.textSecondary,
                              ),
                              onPressed: () => setState(() => _search = ''),
                            )
                          : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: Colors.white.withOpacity(0.08),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: Colors.white.withOpacity(0.08),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(
                          color: AppColors2026.gold,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // Status Filter Chips (Gold active pills)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _StatusChip(
                        label: 'Tous (${all.length})',
                        selected: _statusFilter == 'all',
                        color: AppColors2026.gold,
                        onTap: () => setState(() => _statusFilter = 'all'),
                      ),
                      const SizedBox(width: 8),
                      _StatusChip(
                        label: 'Disponibles ($dispCount)',
                        selected: _statusFilter == 'disponible',
                        color: AppColors2026.emeraldNeon,
                        onTap: () =>
                            setState(() => _statusFilter = 'disponible'),
                      ),
                      const SizedBox(width: 8),
                      _StatusChip(
                        label: 'En Location ($rentedCount)',
                        selected: _statusFilter == 'loue',
                        color: AppColors2026.goldLight,
                        onTap: () => setState(() => _statusFilter = 'loue'),
                      ),
                      const SizedBox(width: 8),
                      _StatusChip(
                        label: 'Atelier ($maintCount)',
                        selected: _statusFilter == 'maintenance',
                        color: AppColors2026.amberSolar,
                        onTap: () =>
                            setState(() => _statusFilter = 'maintenance'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Vehicles List with HD Photos
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.car,
                            size: 44, color: AppColors2026.textMuted),
                        const SizedBox(height: 12),
                        const Text(
                          'Aucun véhicule dans cette catégorie',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors2026.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 120),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) {
                      final v = filtered[i];
                      final stColor = _statusColor(v.status);
                      final hasPhoto = v.photos.isNotEmpty;

                      return SpatialGlassCard(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(0),
                        borderColor: stColor.withOpacity(0.35),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Top Photo Banner (If photo exists, show HD preview; else sleek icon card)
                            if (hasPhoto)
                              Stack(
                                children: [
                                  ClipRRect(
                                    borderRadius: const BorderRadius.vertical(
                                        top: Radius.circular(20)),
                                    child: SizedBox(
                                      height: 150,
                                      width: double.infinity,
                                      child: VehicleImagePreview(
                                        imageData: v.photos.first,
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  ),
                                  // Gradient Overlay
                                  Positioned.fill(
                                    child: Container(
                                      decoration: BoxDecoration(
                                        borderRadius:
                                            const BorderRadius.vertical(
                                                top: Radius.circular(20)),
                                        gradient: LinearGradient(
                                          begin: Alignment.topCenter,
                                          end: Alignment.bottomCenter,
                                          colors: [
                                            Colors.black.withOpacity(0.4),
                                            Colors.transparent,
                                            Colors.black.withOpacity(0.8),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                  // Status Badge
                                  Positioned(
                                    top: 10,
                                    right: 10,
                                    child: NeonBadge(
                                      label: _statusLabel(v.status),
                                      color: stColor,
                                      pulsing: v.status.toLowerCase() ==
                                          'disponible',
                                    ),
                                  ),
                                  // Photo count badge if multi-photos
                                  if (v.photos.length > 1)
                                    Positioned(
                                      top: 10,
                                      left: 10,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 7, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: Colors.black54,
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(LucideIcons.camera,
                                                size: 11,
                                                color: Colors.white),
                                            const SizedBox(width: 4),
                                            Text(
                                              '${v.photos.length} photos',
                                              style: const TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  // Title on bottom of photo
                                  Positioned(
                                    bottom: 10,
                                    left: 14,
                                    right: 14,
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            v.fullName,
                                            style: const TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.w900,
                                              color: Colors.white,
                                              shadows: [
                                                Shadow(
                                                  color: Colors.black,
                                                  blurRadius: 6,
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                        Text(
                                          '${currencyFmt.format(v.dailyRate.round())} DH/j',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w900,
                                            color: AppColors2026.goldLight,
                                            shadows: [
                                              Shadow(
                                                color: Colors.black,
                                                blurRadius: 6,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),

                            // Vehicle Specs & Actions Container
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (!hasPhoto) ...[
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: stColor.withOpacity(0.16),
                                            borderRadius:
                                                BorderRadius.circular(14),
                                            border: Border.all(
                                                color: stColor.withOpacity(0.4)),
                                          ),
                                          child: Icon(LucideIcons.car,
                                              color: stColor, size: 20),
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
                                                'Matricule : ${v.registration.isEmpty ? "—" : v.registration}',
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  color: AppColors2026
                                                      .textSecondary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        NeonBadge(
                                          label: _statusLabel(v.status),
                                          color: stColor,
                                          pulsing: v.status.toLowerCase() ==
                                              'disponible',
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                  ] else
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Text(
                                        'Matricule : ${v.registration.isEmpty ? "Non immatriculé" : v.registration} • Année ${v.year} • ${v.color}',
                                        style: const TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors2026.textSecondary,
                                        ),
                                      ),
                                    ),

                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 6,
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
                                          color: AppColors2026.amberSolar,
                                        ),
                                    ],
                                  ),
                                  const Divider(height: 18, color: Colors.white12),

                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      if (!hasPhoto)
                                        Text(
                                          '${currencyFmt.format(v.dailyRate.round())} DH / jour',
                                          style: const TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w900,
                                            color: AppColors2026.goldLight,
                                          ),
                                        )
                                      else
                                        Text(
                                          'Disponibilité : ${_statusLabel(v.status)}',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w800,
                                            color: stColor,
                                          ),
                                        ),
                                      Row(
                                        children: [
                                          if (v.hasGps ||
                                              widget.appState.gpsDevices
                                                  .isNotEmpty) ...[
                                            InkWell(
                                              onTap: () {
                                                final devices = widget
                                                    .appState.gpsDevices;
                                                final plate = v.registration
                                                    .toLowerCase()
                                                    .replaceAll(' ', '');
                                                GpsDeviceModel? matched;
                                                for (final d in devices) {
                                                  final dName = d.name
                                                      .toLowerCase()
                                                      .replaceAll(' ', '');
                                                  if (plate.isNotEmpty &&
                                                      dName.contains(plate)) {
                                                    matched = d;
                                                    break;
                                                  }
                                                }
                                                if (matched != null) {
                                                  widget.appState
                                                      .selectGpsDevice(
                                                          matched.id);
                                                }
                                                widget.appState.setActiveTab(1);
                                              },
                                              borderRadius:
                                                  BorderRadius.circular(999),
                                              child: Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                  horizontal: 10,
                                                  vertical: 6,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: AppColors2026
                                                      .emeraldNeon
                                                      .withOpacity(0.12),
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                          999),
                                                  border: Border.all(
                                                    color: AppColors2026
                                                        .emeraldNeon
                                                        .withOpacity(0.35),
                                                  ),
                                                ),
                                                child: const Row(
                                                  mainAxisSize:
                                                      MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      LucideIcons.navigation,
                                                      size: 12,
                                                      color: AppColors2026
                                                          .emeraldBright,
                                                    ),
                                                    SizedBox(width: 4),
                                                    Text(
                                                      'GPS',
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        fontWeight:
                                                            FontWeight.w800,
                                                        color: AppColors2026
                                                            .emeraldBright,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 6),
                                          ],
                                          InkWell(
                                            onTap: () => _openVehicleForm(v),
                                            borderRadius:
                                                BorderRadius.circular(999),
                                            child: Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                horizontal: 11,
                                                vertical: 6,
                                              ),
                                              decoration: BoxDecoration(
                                                color: AppColors2026.gold
                                                    .withOpacity(0.14),
                                                borderRadius:
                                                    BorderRadius.circular(999),
                                                border: Border.all(
                                                  color: AppColors2026.gold
                                                      .withOpacity(0.35),
                                                ),
                                              ),
                                              child: const Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(
                                                    LucideIcons.edit3,
                                                    size: 12,
                                                    color:
                                                        AppColors2026.goldLight,
                                                  ),
                                                  SizedBox(width: 5),
                                                  Text(
                                                    'Modifier',
                                                    style: TextStyle(
                                                      fontSize: 11.5,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      color: AppColors2026
                                                          .goldLight,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                          if (widget.appState.canDelete) ...[
                                            const SizedBox(width: 4),
                                            IconButton(
                                              tooltip: 'Supprimer',
                                              onPressed: () =>
                                                  _confirmDelete(v),
                                              icon: const Icon(
                                                LucideIcons.trash2,
                                                size: 16,
                                                color: AppColors2026.roseLaser,
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          gradient: selected ? AppColors2026.goldGradient : null,
          color: selected ? null : AppColors2026.obsidianElevated,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected
                ? AppColors2026.goldLight
                : Colors.white.withOpacity(0.08),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: selected ? Colors.black : AppColors2026.textSecondary,
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

  const _SpecPill({required this.icon, required this.text, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors2026.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white10),
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
              fontWeight: FontWeight.w600,
              color: c,
            ),
          ),
        ],
      ),
    );
  }
}
