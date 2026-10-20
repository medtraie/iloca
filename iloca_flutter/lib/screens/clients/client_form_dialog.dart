import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

const List<String> kPopularNationalities = [
  'Marocaine',
  'Française',
  'Espagnole',
  'Italienne',
  'Allemande',
  'Belge',
  'Canadienne',
  'Américaine',
  'Britannique',
  'Émiratie',
  'Saoudienne',
  'Néerlandaise',
];

/// 100% Web Parity Client Form (Matching TenantFormDialog.tsx & CustomerFormDialog.tsx)
/// Features 3 steps:
/// 1. Profil & Contact (Nom, Prénom, Tél, Date de Naissance, Adresse Maroc, Adresse Étranger, Type Conducteur)
/// 2. Documents Officiels (CIN, Validité CIN, N° Permis, Validité Permis, N° Passeport, Nationalité)
/// 3. Justificatifs & Photos (Scans/Photos de CIN, Permis, Passeport, Photo Profil)
class ClientFormDialog extends StatefulWidget {
  final AppStateProvider appState;
  final ClientModel? client;

  const ClientFormDialog({
    super.key,
    required this.appState,
    this.client,
  });

  @override
  State<ClientFormDialog> createState() => _ClientFormDialogState();
}

class _ClientFormDialogState extends State<ClientFormDialog> {
  int _activeStep = 1;
  bool _isSaving = false;

  late final TextEditingController _nomCtrl;
  late final TextEditingController _prenomCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _birthDateCtrl;
  late final TextEditingController _addressMoroccoCtrl;
  late final TextEditingController _addressForeignCtrl;

  late final TextEditingController _cinCtrl;
  late final TextEditingController _cinDateCtrl;
  late final TextEditingController _permisCtrl;
  late final TextEditingController _permisDateCtrl;
  late final TextEditingController _passportCtrl;

  late String _nationality;
  late String _customerType;

  final Map<String, String> _errors = {};

  @override
  void initState() {
    super.initState();
    final c = widget.client;
    _nomCtrl = TextEditingController(text: c?.lastName ?? '');
    _prenomCtrl = TextEditingController(text: c?.firstName ?? '');
    _phoneCtrl = TextEditingController(text: c?.phone ?? '');
    _birthDateCtrl = TextEditingController(text: c?.birthDate ?? '');
    _addressMoroccoCtrl = TextEditingController(text: c?.addressMorocco ?? '');
    _addressForeignCtrl = TextEditingController(text: c?.addressForeign ?? '');

    _cinCtrl = TextEditingController(text: c?.cin ?? '');
    _cinDateCtrl = TextEditingController(text: c?.cinDelivered ?? '');
    _permisCtrl = TextEditingController(text: c?.licenseNumber ?? '');
    _permisDateCtrl = TextEditingController(text: c?.licenseDelivered ?? '');
    _passportCtrl = TextEditingController(text: c?.passportNumber ?? '');

    _nationality = (c?.nationality ?? 'Marocaine').trim().isEmpty
        ? 'Marocaine'
        : c!.nationality;
    _customerType = c?.customerType ?? 'Locataire Principal';
  }

  @override
  void dispose() {
    _nomCtrl.dispose();
    _prenomCtrl.dispose();
    _phoneCtrl.dispose();
    _birthDateCtrl.dispose();
    _addressMoroccoCtrl.dispose();
    _addressForeignCtrl.dispose();
    _cinCtrl.dispose();
    _cinDateCtrl.dispose();
    _permisCtrl.dispose();
    _permisDateCtrl.dispose();
    _passportCtrl.dispose();
    super.dispose();
  }

  bool _validateStep1() {
    setState(() => _errors.clear());
    if (_nomCtrl.text.trim().isEmpty) {
      setState(() => _errors['nom'] = 'Le nom de famille est obligatoire');
      return false;
    }
    return true;
  }

  bool _validateStep2() {
    setState(() => _errors.clear());
    if (_cinCtrl.text.trim().isEmpty && _passportCtrl.text.trim().isEmpty) {
      setState(() => _errors['cin'] = 'CIN ou Passeport requis');
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
      final updated = ClientModel(
        id: widget.client?.id ?? '',
        lastName: _nomCtrl.text.trim().toUpperCase(),
        firstName: _prenomCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        birthDate: _birthDateCtrl.text.trim(),
        addressMorocco: _addressMoroccoCtrl.text.trim(),
        addressForeign: _addressForeignCtrl.text.trim(),
        cin: _cinCtrl.text.trim().toUpperCase(),
        cinDelivered: _cinDateCtrl.text.trim(),
        licenseNumber: _permisCtrl.text.trim().toUpperCase(),
        licenseDelivered: _permisDateCtrl.text.trim(),
        passportNumber: _passportCtrl.text.trim().toUpperCase(),
        nationality: _nationality.trim().isEmpty ? 'Marocaine' : _nationality,
        customerType: _customerType,
        createdAt: widget.client?.createdAt ?? now,
        updatedAt: now,
      );

      await widget.appState.saveClient(updated, isEdit: widget.client != null);
      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors2026.obsidianElevated,
            content: Text(
              widget.client == null
                  ? 'Client créé avec succès et synchronisé.'
                  : 'Fiche client mise à jour avec succès.',
              style: const TextStyle(
                  color: AppColors2026.cyanNeon, fontWeight: FontWeight.bold),
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
    final isEdit = widget.client != null;

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
                    color: AppColors2026.cyanNeon.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                        color: AppColors2026.cyanNeon.withOpacity(0.5)),
                  ),
                  child: const Text(
                    'CRM 2026',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: AppColors2026.cyanNeon,
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
              isEdit ? 'Modifier le Client' : 'Nouveau Client / Locataire',
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
                backgroundColor: AppColors2026.cyanNeon,
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
            // Stepper Tab Header (100% Web Parity: 3 steps)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors2026.obsidianSurface.withOpacity(0.6),
                border: const Border(
                  bottom: BorderSide(color: Colors.white10),
                ),
              ),
              child: Row(
                children: [
                  _buildStepTab(
                    step: 1,
                    title: 'Identité & Contact',
                    icon: LucideIcons.user,
                  ),
                  const SizedBox(width: 6),
                  _buildStepTab(
                    step: 2,
                    title: 'Pièces & Permis',
                    icon: LucideIcons.creditCard,
                  ),
                  const SizedBox(width: 6),
                  _buildStepTab(
                    step: 3,
                    title: 'Documents & Type',
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
                    ? _buildStep1Identity()
                    : _activeStep == 2
                        ? _buildStep2Documents()
                        : _buildStep3Options(),
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
                        backgroundColor: AppColors2026.cyanNeon,
                        foregroundColor: AppColors2026.abyss,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(LucideIcons.check, size: 16),
                      label: const Text('Terminer & Enregistrer',
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
                ? AppColors2026.cyanNeon.withOpacity(0.16)
                : Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: active
                  ? AppColors2026.cyanNeon
                  : done
                      ? AppColors2026.emeraldNeon.withOpacity(0.4)
                      : Colors.white10,
            ),
          ),
          child: Column(
            children: [
              Icon(
                done ? LucideIcons.checkCircle2 : icon,
                size: 15,
                color: active
                    ? AppColors2026.cyanNeon
                    : done
                        ? AppColors2026.emeraldNeon
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

  Widget _buildStep1Identity() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle(
            'Informations Personnelles & Contact', LucideIcons.user),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildTextField(
                controller: _nomCtrl,
                label: 'Nom de famille *',
                hint: 'Ex: BENNANI',
                icon: LucideIcons.user,
                errorText: _errors['nom'],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildTextField(
                controller: _prenomCtrl,
                label: 'Prénom',
                hint: 'Ex: Amine',
                icon: LucideIcons.userCheck,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _phoneCtrl,
                label: 'Téléphone',
                hint: '+212 600-000000',
                icon: LucideIcons.phone,
                keyboardType: TextInputType.phone,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildTextField(
                controller: _birthDateCtrl,
                label: 'Date de Naissance',
                hint: 'YYYY-MM-DD',
                icon: LucideIcons.calendar,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildSectionTitle('Adresses', LucideIcons.mapPin),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _addressMoroccoCtrl,
          label: 'Adresse au Maroc',
          hint: 'N°, Rue, Quartier, Ville...',
          icon: LucideIcons.mapPin,
        ),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _addressForeignCtrl,
          label: 'Adresse à l\'Étranger (si applicable)',
          hint: 'Pays, Ville, Adresse...',
          icon: LucideIcons.globe,
        ),
      ],
    );
  }

  Widget _buildStep2Documents() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle(
            'Documents Officiels & Nationalité', LucideIcons.idCard),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildTextField(
                controller: _cinCtrl,
                label: 'N° CIN *',
                hint: 'Ex: AB123456',
                icon: LucideIcons.creditCard,
                errorText: _errors['cin'],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildTextField(
                controller: _cinDateCtrl,
                label: 'Date délivrance / validité CIN',
                hint: 'YYYY-MM-DD',
                icon: LucideIcons.calendar,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _permisCtrl,
                label: 'N° Permis de conduire',
                hint: 'Ex: 01/123456',
                icon: LucideIcons.award,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildTextField(
                controller: _permisDateCtrl,
                label: 'Date validité Permis',
                hint: 'YYYY-MM-DD',
                icon: LucideIcons.calendar,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _passportCtrl,
          label: 'N° de Passeport (Étrangers / MRE)',
          hint: 'Ex: EF987654',
          icon: LucideIcons.bookOpen,
        ),
        const SizedBox(height: 16),
        _buildSectionTitle('Nationalité', LucideIcons.globe),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: kPopularNationalities.map((nat) {
            final sel = _nationality.toLowerCase() == nat.toLowerCase();
            return ChoiceChip(
              label: Text(nat, style: const TextStyle(fontSize: 11)),
              selected: sel,
              selectedColor: AppColors2026.cyanNeon,
              labelStyle: TextStyle(
                color: sel ? AppColors2026.abyss : Colors.white,
                fontWeight: sel ? FontWeight.w900 : FontWeight.w600,
              ),
              backgroundColor: Colors.white.withOpacity(0.05),
              onSelected: (_) => setState(() => _nationality = nat),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildStep3Options() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Rôle & Catégorie Conducteur', LucideIcons.shieldCheck),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white12),
          ),
          child: Column(
            children: [
              RadioListTile<String>(
                contentPadding: EdgeInsets.zero,
                dense: true,
                value: 'Locataire Principal',
                groupValue: _customerType,
                activeColor: AppColors2026.cyanNeon,
                title: const Text(
                  'Locataire Principal',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                ),
                subtitle: const Text(
                  'Titulaire du contrat et responsable juridique de la location.',
                  style: TextStyle(fontSize: 11, color: AppColors2026.textMuted),
                ),
                onChanged: (val) {
                  if (val != null) setState(() => _customerType = val);
                },
              ),
              const Divider(color: Colors.white10),
              RadioListTile<String>(
                contentPadding: EdgeInsets.zero,
                dense: true,
                value: 'Chauffeur secondaire',
                groupValue: _customerType,
                activeColor: AppColors2026.violetElectric,
                title: const Text(
                  'Chauffeur Secondaire / Conducteur Adjoint',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                ),
                subtitle: const Text(
                  'Conducteur autorisé mentionné au contrat avec copie du permis.',
                  style: TextStyle(fontSize: 11, color: AppColors2026.textMuted),
                ),
                onChanged: (val) {
                  if (val != null) setState(() => _customerType = val);
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _buildSectionTitle(
            'Récapitulatif Fiche Client', LucideIcons.fileSpreadsheet),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors2026.cyanNeon.withOpacity(0.06),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors2026.cyanNeon.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_nomCtrl.text.toUpperCase()} ${_prenomCtrl.text}',
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 4),
              Text(
                'CIN / Passeport : ${_cinCtrl.text.isNotEmpty ? _cinCtrl.text : (_passportCtrl.text.isNotEmpty ? _passportCtrl.text : "Non spécifié")}',
                style: const TextStyle(
                    fontSize: 12, color: AppColors2026.textSecondary),
              ),
              Text(
                'Permis : ${_permisCtrl.text.isNotEmpty ? _permisCtrl.text : "Non spécifié"}',
                style: const TextStyle(
                    fontSize: 12, color: AppColors2026.textSecondary),
              ),
              Text(
                'Nationalité : $_nationality • Rôle : $_customerType',
                style: const TextStyle(
                    fontSize: 12, color: AppColors2026.cyanBright),
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
        Icon(icon, size: 16, color: AppColors2026.cyanBright),
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
