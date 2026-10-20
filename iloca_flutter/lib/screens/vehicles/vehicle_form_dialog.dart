import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

const List<String> kPopularCarBrands = [
  'Dacia',
  'Renault',
  'Peugeot',
  'Volkswagen',
  'Hyundai',
  'Toyota',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Kia',
  'Citroën',
  'Fiat',
  'Jeep',
  'Nissan',
];

const List<String> kFuelTypes = [
  'Diesel',
  'Essence',
  'Hybride',
  'Electrique',
];

const List<String> kGearboxes = [
  'Manuelle',
  'Automatique',
];

/// 100% Web Parity Vehicle Form Dialog (Matching VehicleFormDialog.tsx)
/// Features 3 steps:
/// 1. Informations Générales (Marque, Modèle, Matricule, Année, Couleur, Statut, Tracker GPS)
/// 2. Télémétrie & Tarification (Tarif Journalier DH, Carburant, Boîte, Kilométrage actuel, KM départ)
/// 3. Documents & Récapitulatif (Carte grise, Assurance, Contrôle technique & Récap)
class VehicleFormDialog extends StatefulWidget {
  final AppStateProvider appState;
  final VehicleModel? vehicle;

  const VehicleFormDialog({
    super.key,
    required this.appState,
    this.vehicle,
  });

  @override
  State<VehicleFormDialog> createState() => _VehicleFormDialogState();
}

class _VehicleFormDialogState extends State<VehicleFormDialog> {
  int _activeStep = 1;
  bool _isSaving = false;

  late final TextEditingController _brandCtrl;
  late final TextEditingController _modelCtrl;
  late final TextEditingController _registrationCtrl;
  late final TextEditingController _yearCtrl;
  late final TextEditingController _colorCtrl;
  late final TextEditingController _dailyRateCtrl;
  late final TextEditingController _mileageCtrl;
  late final TextEditingController _departureMileageCtrl;

  late String _fuelType;
  late String _gearbox;
  late String _status;
  late bool _hasGps;

  final Map<String, String> _errors = {};

  @override
  void initState() {
    super.initState();
    final v = widget.vehicle;
    _brandCtrl = TextEditingController(text: v?.brand ?? '');
    _modelCtrl = TextEditingController(text: v?.model ?? '');
    _registrationCtrl = TextEditingController(text: v?.registration ?? '');
    _yearCtrl = TextEditingController(
        text: (v?.year ?? DateTime.now().year).toString());
    _colorCtrl = TextEditingController(text: v?.color ?? 'Blanc');
    _dailyRateCtrl = TextEditingController(
        text: (v?.dailyRate ?? 300).round().toString());
    _mileageCtrl = TextEditingController(
        text: (v?.mileage ?? 0).round().toString());
    _departureMileageCtrl = TextEditingController(
        text: (v?.departureMileage ?? 0).round().toString());

    _fuelType = v?.fuelType ?? 'Diesel';
    _gearbox = v?.gearbox ?? 'Automatique';
    _status = v?.status ?? 'disponible';
    _hasGps = v?.hasGps ?? true;
  }

  @override
  void dispose() {
    _brandCtrl.dispose();
    _modelCtrl.dispose();
    _registrationCtrl.dispose();
    _yearCtrl.dispose();
    _colorCtrl.dispose();
    _dailyRateCtrl.dispose();
    _mileageCtrl.dispose();
    _departureMileageCtrl.dispose();
    super.dispose();
  }

  bool _validateStep1() {
    setState(() => _errors.clear());
    if (_brandCtrl.text.trim().isEmpty) {
      setState(() => _errors['brand'] = 'La marque est obligatoire');
      return false;
    }
    if (_modelCtrl.text.trim().isEmpty) {
      setState(() => _errors['model'] = 'Le modèle est obligatoire');
      return false;
    }
    return true;
  }

  bool _validateStep2() {
    setState(() => _errors.clear());
    final rate = double.tryParse(_dailyRateCtrl.text);
    if (rate == null || rate <= 0) {
      setState(() => _errors['dailyRate'] = 'Veuillez saisir un tarif valide');
      return false;
    }
    return true;
  }

  Future<void> _handleSave() async {
    if (!_validateStep1()) {
      setState(() => _activeStep = 1);
      return;
    }
    if (!_validateStep2()) {
      setState(() => _activeStep = 2);
      return;
    }

    setState(() => _isSaving = true);
    try {
      final now = DateTime.now().toIso8601String();
      final updated = VehicleModel(
        id: widget.vehicle?.id ?? '',
        brand: _brandCtrl.text.trim().toUpperCase(),
        model: _modelCtrl.text.trim().toUpperCase(),
        registration: _registrationCtrl.text.trim().toUpperCase(),
        year: int.tryParse(_yearCtrl.text.trim()) ?? DateTime.now().year,
        fuelType: _fuelType,
        gearbox: _gearbox,
        color: _colorCtrl.text.trim().isEmpty ? 'Blanc' : _colorCtrl.text.trim(),
        dailyRate: double.tryParse(_dailyRateCtrl.text.trim()) ?? 300,
        mileage: double.tryParse(_mileageCtrl.text.trim()) ?? 0,
        departureMileage:
            double.tryParse(_departureMileageCtrl.text.trim()) ?? 0,
        status: _status,
        hasGps: _hasGps,
        createdAt: widget.vehicle?.createdAt ?? now,
        updatedAt: now,
      );

      await widget.appState.saveVehicle(updated, isEdit: widget.vehicle != null);
      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors2026.obsidianElevated,
            content: Text(
              widget.vehicle == null
                  ? 'Véhicule ajouté au parc avec succès.'
                  : 'Véhicule mis à jour avec succès.',
              style: const TextStyle(
                  color: AppColors2026.emeraldBright,
                  fontWeight: FontWeight.bold),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors2026.roseLaser,
            content: Text('Erreur lors de l\'enregistrement: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.vehicle != null;
    final currencyFmt = NumberFormat('#,##0', 'fr_FR');

    return Scaffold(
      backgroundColor: AppColors2026.abyss,
      appBar: AppBar(
        backgroundColor: AppColors2026.obsidianSurface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.x, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors2026.emeraldNeon.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                        color: AppColors2026.emeraldNeon.withOpacity(0.5)),
                  ),
                  child: const Text(
                    'PARC AUTO 2026',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: AppColors2026.emeraldNeon,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Étape $_activeStep/3',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors2026.textMuted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              isEdit ? 'Modifier le Véhicule' : 'Ajouter un Véhicule',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              onPressed: _isSaving ? null : _handleSave,
              style: TextButton.styleFrom(
                backgroundColor: AppColors2026.emeraldNeon,
                foregroundColor: AppColors2026.abyss,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: _isSaving
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors2026.abyss),
                    )
                  : const Icon(LucideIcons.check, size: 16),
              label: Text(
                _isSaving ? 'Envoi...' : 'Enregistrer',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Stepper Tabs (100% Web Parity)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors2026.obsidianSurface.withOpacity(0.6),
                border: const Border(bottom: BorderSide(color: Colors.white10)),
              ),
              child: Row(
                children: [
                  _buildStepTab(
                    step: 1,
                    title: 'Marque & Modèle',
                    icon: LucideIcons.car,
                  ),
                  const SizedBox(width: 6),
                  _buildStepTab(
                    step: 2,
                    title: 'Tarif & Moteur',
                    icon: LucideIcons.gauge,
                  ),
                  const SizedBox(width: 6),
                  _buildStepTab(
                    step: 3,
                    title: 'Statut & GPS',
                    icon: LucideIcons.shieldCheck,
                  ),
                ],
              ),
            ),

            // Form Body
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: _activeStep == 1
                    ? _buildStep1CarInfo()
                    : _activeStep == 2
                        ? _buildStep2Telemetry(currencyFmt)
                        : _buildStep3StatusGps(),
              ),
            ),

            // Bottom Navigation Footer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors2026.obsidianSurface,
                border: const Border(top: BorderSide(color: Colors.white10)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (_activeStep > 1)
                    OutlinedButton.icon(
                      onPressed: () => setState(() => _activeStep--),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white24),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(LucideIcons.chevronLeft, size: 16),
                      label: const Text('Précédent'),
                    )
                  else
                    const SizedBox.shrink(),
                  if (_activeStep < 3)
                    ElevatedButton.icon(
                      onPressed: () {
                        if (_activeStep == 1 && !_validateStep1()) return;
                        if (_activeStep == 2 && !_validateStep2()) return;
                        setState(() => _activeStep++);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors2026.violetElectric,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(LucideIcons.chevronRight, size: 16),
                      label: const Text('Suivant',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                    )
                  else
                    ElevatedButton.icon(
                      onPressed: _isSaving ? null : _handleSave,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors2026.emeraldNeon,
                        foregroundColor: AppColors2026.abyss,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(LucideIcons.check, size: 16),
                      label: const Text('Enregistrer le Véhicule',
                          style: TextStyle(fontWeight: FontWeight.w900)),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepTab({
    required int step,
    required String title,
    required IconData icon,
  }) {
    final active = _activeStep == step;
    final done = _activeStep > step;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          if (step > _activeStep) {
            if (_activeStep == 1 && !_validateStep1()) return;
            if (_activeStep == 2 && !_validateStep2()) return;
          }
          setState(() => _activeStep = step);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          decoration: BoxDecoration(
            color: active
                ? AppColors2026.emeraldNeon.withOpacity(0.16)
                : Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: active
                  ? AppColors2026.emeraldNeon
                  : done
                      ? AppColors2026.cyanNeon.withOpacity(0.4)
                      : Colors.white10,
            ),
          ),
          child: Column(
            children: [
              Icon(
                done ? LucideIcons.checkCircle2 : icon,
                size: 15,
                color: active
                    ? AppColors2026.emeraldNeon
                    : done
                        ? AppColors2026.cyanNeon
                        : AppColors2026.textMuted,
              ),
              const SizedBox(height: 3),
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: active ? FontWeight.w900 : FontWeight.w600,
                  color: active ? Colors.white : AppColors2026.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep1CarInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Sélection Rapide de Marque', LucideIcons.sparkles),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: kPopularCarBrands.map((brand) {
            final sel = _brandCtrl.text.toUpperCase() == brand.toUpperCase();
            return ChoiceChip(
              label: Text(brand, style: const TextStyle(fontSize: 11)),
              selected: sel,
              selectedColor: AppColors2026.cyanBright,
              labelStyle: TextStyle(
                color: sel ? AppColors2026.abyss : Colors.white,
                fontWeight: sel ? FontWeight.w900 : FontWeight.w600,
              ),
              backgroundColor: Colors.white.withOpacity(0.05),
              onSelected: (_) => setState(() => _brandCtrl.text = brand),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        _buildSectionTitle('Identification du Véhicule', LucideIcons.car),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildTextField(
                controller: _brandCtrl,
                label: 'Marque *',
                hint: 'Ex: DACIA, RENAULT...',
                icon: LucideIcons.car,
                errorText: _errors['brand'],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildTextField(
                controller: _modelCtrl,
                label: 'Modèle *',
                hint: 'Ex: CLIO 5, DUSTER...',
                icon: LucideIcons.tag,
                errorText: _errors['model'],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              flex: 3,
              child: _buildTextField(
                controller: _registrationCtrl,
                label: 'Immatriculation / Matricule *',
                hint: 'Ex: 12345-A-6',
                icon: LucideIcons.hash,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: _buildTextField(
                controller: _yearCtrl,
                label: 'Année',
                hint: '2025',
                icon: LucideIcons.calendar,
                keyboardType: TextInputType.number,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _colorCtrl,
          label: 'Couleur extérieure',
          hint: 'Ex: Noir Métallisé, Blanc Nacré...',
          icon: LucideIcons.palette,
        ),
      ],
    );
  }

  Widget _buildStep2Telemetry(NumberFormat fmt) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle(
            'Tarification Journalière & Caractéristiques', LucideIcons.coins),
        const SizedBox(height: 12),

        // Highlight Daily Rate Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors2026.cyanNeon.withOpacity(0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors2026.cyanNeon.withOpacity(0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.banknote,
                      size: 16, color: AppColors2026.cyanBright),
                  SizedBox(width: 8),
                  Text(
                    'TARIF JOURNALIER STANDARD (MAD / JOUR)',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: AppColors2026.cyanBright),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _dailyRateCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
                decoration: InputDecoration(
                  hintText: '300',
                  suffixText: 'DH / Jour',
                  suffixStyle: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors2026.cyanBright),
                  errorText: _errors['dailyRate'],
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),
        _buildSectionTitle('Motorisation & Transmission', LucideIcons.fuel),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _fuelType,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Carburant',
                  prefixIcon: Icon(LucideIcons.fuel, size: 16),
                ),
                items: kFuelTypes
                    .map((f) => DropdownMenuItem(
                          value: f,
                          child: Text(f, overflow: TextOverflow.ellipsis),
                        ))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _fuelType = v);
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _gearbox,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Boîte',
                  prefixIcon: Icon(LucideIcons.settings2, size: 16),
                ),
                items: kGearboxes
                    .map((g) => DropdownMenuItem(
                          value: g,
                          child: Text(g, overflow: TextOverflow.ellipsis),
                        ))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _gearbox = v);
                },
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),
        _buildSectionTitle('Compteurs Odométriques', LucideIcons.gauge),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _mileageCtrl,
                label: 'Kilométrage Actuel (KM)',
                hint: '0',
                icon: LucideIcons.gauge,
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildTextField(
                controller: _departureMileageCtrl,
                label: 'KM Initial d\'Achat',
                hint: '0',
                icon: LucideIcons.history,
                keyboardType: TextInputType.number,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStep3StatusGps() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle(
            'Statut Opérationnel du Véhicule', LucideIcons.activity),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _status,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'État du Véhicule',
            prefixIcon: Icon(LucideIcons.checkCircle2, size: 16),
          ),
          items: const [
            DropdownMenuItem(
              value: 'disponible',
              child: Text('🟢 Disponible (Prêt à louer)'),
            ),
            DropdownMenuItem(
              value: 'loue',
              child: Text('🔵 En Location (Actuellement loué)'),
            ),
            DropdownMenuItem(
              value: 'maintenance',
              child: Text('🟡 En Atelier / Maintenance'),
            ),
          ],
          onChanged: (v) {
            if (v != null) setState(() => _status = v);
          },
        ),
        const SizedBox(height: 16),
        _buildSectionTitle('Télématique GPSWOX', LucideIcons.radio),
        const SizedBox(height: 12),

        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _hasGps
                ? AppColors2026.amberSolar.withOpacity(0.08)
                : Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _hasGps
                  ? AppColors2026.amberSolar.withOpacity(0.4)
                  : Colors.white12,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _hasGps
                      ? AppColors2026.amberSolar.withOpacity(0.2)
                      : Colors.white10,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  LucideIcons.radio,
                  size: 20,
                  color: _hasGps
                      ? AppColors2026.amberSolar
                      : AppColors2026.textMuted,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Boîtier Tracker GPS Installé',
                      style:
                          TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                    ),
                    Text(
                      'Active la télémétrie en temps réel et le suivi GPSWOX.',
                      style: TextStyle(
                          fontSize: 11, color: AppColors2026.textSecondary),
                    ),
                  ],
                ),
              ),
              Switch(
                value: _hasGps,
                activeColor: AppColors2026.amberSolar,
                onChanged: (val) => setState(() => _hasGps = val),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),
        _buildSectionTitle('Aperçu Fiche Flotte', LucideIcons.clipboardList),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors2026.emeraldNeon.withOpacity(0.06),
            borderRadius: BorderRadius.circular(16),
            border:
                Border.all(color: AppColors2026.emeraldNeon.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_brandCtrl.text.toUpperCase()} ${_modelCtrl.text.toUpperCase()}',
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 4),
              Text(
                'Immatriculation : ${_registrationCtrl.text.isNotEmpty ? _registrationCtrl.text : "Non matriculé"} • Année ${_yearCtrl.text}',
                style: const TextStyle(
                    fontSize: 12, color: AppColors2026.textSecondary),
              ),
              Text(
                'Tarif : ${_dailyRateCtrl.text} DH/j • ${_fuelType} • ${_gearbox}',
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors2026.emeraldBright),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors2026.emeraldBright),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.4,
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    String? errorText,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            labelText: label,
            hintText: hint,
            prefixIcon: Icon(icon, size: 16),
            errorText: errorText,
            isDense: true,
          ),
        ),
      ],
    );
  }
}
