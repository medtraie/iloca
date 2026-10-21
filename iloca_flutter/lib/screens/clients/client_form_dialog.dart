import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/vehicle_image_preview.dart';
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
/// 1. Profil & Contact (Nom, Prénom, Tél/WhatsApp, Date de Naissance, Adresse, Nationalité, Type)
/// 2. Pièces d'Identité & Permis (CIN, Validité CIN, N° Permis, Validité Permis, N° Passeport)
/// 3. Scans Numériques & Pièces Justificatives (Scan CIN, Scan Permis, Scan Passeport, Photo Profil avec Caméra et Galerie)
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

  String? _cinImageUrl;
  String? _permisImageUrl;
  String? _passportImageUrl;
  String? _avatarUrl;

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

    final rawNat = c?.nationality?.trim();
    _nationality = (rawNat != null && rawNat.isNotEmpty) ? rawNat : 'Marocaine';
    _customerType = c?.customerType ?? 'Locataire Principal';

    _cinImageUrl = c?.cinImageUrl;
    _permisImageUrl = c?.licenseImageUrl;
    _passportImageUrl = c?.passportImageUrl;
    _avatarUrl = c?.avatarUrl;
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
    if (_prenomCtrl.text.trim().isEmpty) {
      setState(() => _errors['prenom'] = 'Le prénom est obligatoire');
      return false;
    }
    if (_phoneCtrl.text.trim().isEmpty) {
      setState(() => _errors['phone'] = 'Le numéro de téléphone est obligatoire');
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
    if (_permisCtrl.text.trim().isEmpty) {
      setState(() => _errors['permis'] = 'Le numéro de permis est obligatoire');
      return false;
    }
    return true;
  }

  Future<void> _pickDocumentImage({
    required String docKey,
    required ImageSource source,
  }) async {
    final base64Image = await VehicleImagePreview.pickAndCompressImage(
      source: source,
      maxWidth: 900,
      quality: 75,
    );
    if (base64Image != null) {
      setState(() {
        if (docKey == 'cin') _cinImageUrl = base64Image;
        if (docKey == 'permis') _permisImageUrl = base64Image;
        if (docKey == 'passeport') _passportImageUrl = base64Image;
        if (docKey == 'avatar') _avatarUrl = base64Image;
      });
    }
  }

  void _showDocPickerSheet(String docKey, String docTitle) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors2026.obsidianSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'AJOUTER : $docTitle',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors2026.cyanNeon.withOpacity(0.16),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(LucideIcons.camera,
                      color: AppColors2026.cyanBright, size: 20),
                ),
                title: const Text('Prendre une photo (Caméra)',
                    style: TextStyle(fontWeight: FontWeight.w800)),
                subtitle: const Text('Numériser le document directement',
                    style: TextStyle(fontSize: 12, color: Colors.white54)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickDocumentImage(docKey: docKey, source: ImageSource.camera);
                },
              ),
              const Divider(color: Colors.white12),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors2026.emeraldNeon.withOpacity(0.16),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(LucideIcons.image,
                      color: AppColors2026.emeraldNeon, size: 20),
                ),
                title: const Text('Choisir depuis la galerie',
                    style: TextStyle(fontWeight: FontWeight.w800)),
                subtitle: const Text('Sélectionner depuis les fichiers du téléphone',
                    style: TextStyle(fontSize: 12, color: Colors.white54)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickDocumentImage(docKey: docKey, source: ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
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
        cinImageUrl: _cinImageUrl,
        licenseImageUrl: _permisImageUrl,
        passportImageUrl: _passportImageUrl,
        avatarUrl: _avatarUrl,
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
                  ? 'Client créé avec succès et synchronisé avec le Web.'
                  : 'Fiche client mise à jour et synchronisée avec le Web.',
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
                    'CRM ONBOARDING 2026',
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
              isEdit ? 'Modifier la Fiche Client' : 'Nouveau Client / Locataire',
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
                    title: 'Profil & Contact',
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
                    title: 'Scans & Photos',
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
                        : _buildStep3Scans(),
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
                      label: const Text('Enregistrer le Client',
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
        _buildSectionTitle('Type de Locataire *', LucideIcons.users),
        const SizedBox(height: 8),

        // Type selection toggle cards (Identical to Web)
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () =>
                    setState(() => _customerType = 'Locataire Principal'),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _customerType == 'Locataire Principal'
                        ? AppColors2026.cyanNeon.withOpacity(0.18)
                        : Colors.white.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _customerType == 'Locataire Principal'
                          ? AppColors2026.cyanNeon
                          : Colors.white12,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        LucideIcons.user,
                        size: 16,
                        color: _customerType == 'Locataire Principal'
                            ? AppColors2026.cyanBright
                            : AppColors2026.textMuted,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Locataire Principal',
                              style: TextStyle(
                                  fontWeight: FontWeight.w900, fontSize: 12),
                            ),
                            Text(
                              'Signataire contrat',
                              style: TextStyle(
                                  fontSize: 10, color: Colors.white54),
                            ),
                          ],
                        ),
                      ),
                      if (_customerType == 'Locataire Principal')
                        const Icon(LucideIcons.check,
                            size: 14, color: AppColors2026.cyanNeon),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: GestureDetector(
                onTap: () =>
                    setState(() => _customerType = 'Chauffeur secondaire'),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _customerType == 'Chauffeur secondaire'
                        ? AppColors2026.violetElectric.withOpacity(0.18)
                        : Colors.white.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _customerType == 'Chauffeur secondaire'
                          ? AppColors2026.violetElectric
                          : Colors.white12,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        LucideIcons.userCheck,
                        size: 16,
                        color: _customerType == 'Chauffeur secondaire'
                            ? AppColors2026.violetElectric
                            : AppColors2026.textMuted,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Chauffeur Adjoint',
                              style: TextStyle(
                                  fontWeight: FontWeight.w900, fontSize: 12),
                            ),
                            Text(
                              'Conducteur 2',
                              style: TextStyle(
                                  fontSize: 10, color: Colors.white54),
                            ),
                          ],
                        ),
                      ),
                      if (_customerType == 'Chauffeur secondaire')
                        const Icon(LucideIcons.check,
                            size: 14, color: AppColors2026.violetElectric),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),
        _buildSectionTitle(
            'Informations Personnelles & Coordonnées', LucideIcons.user),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildTextField(
                controller: _nomCtrl,
                label: 'Nom de famille *',
                hint: 'Ex: BENALI',
                icon: LucideIcons.user,
                errorText: _errors['nom'],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildTextField(
                controller: _prenomCtrl,
                label: 'Prénom *',
                hint: 'Ex: Mohamed',
                icon: LucideIcons.userCheck,
                errorText: _errors['prenom'],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildTextField(
                controller: _phoneCtrl,
                label: 'Numéro de Téléphone / WhatsApp *',
                hint: '06 12 34 56 78',
                icon: LucideIcons.phone,
                keyboardType: TextInputType.phone,
                errorText: _errors['phone'],
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
        _buildSectionTitle('Nationalité du Locataire', LucideIcons.globe),
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

        const SizedBox(height: 16),
        _buildSectionTitle(
            'Adresses de Résidence', LucideIcons.mapPin),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _addressMoroccoCtrl,
          label: 'Adresse au Maroc',
          hint: 'Ex: 12 Rue Hassan II, Casablanca',
          icon: LucideIcons.mapPin,
        ),
        const SizedBox(height: 10),
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
            'Pièces d\'Identité & Permis de Conduire', LucideIcons.creditCard),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildTextField(
                controller: _cinCtrl,
                label: 'Numéro CIN *',
                hint: 'Ex: AB123456',
                icon: LucideIcons.creditCard,
                errorText: _errors['cin'],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildTextField(
                controller: _cinDateCtrl,
                label: 'Validité / Délivrance CIN',
                hint: 'YYYY-MM-DD',
                icon: LucideIcons.calendar,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildTextField(
                controller: _permisCtrl,
                label: 'Numéro de Permis de Conduire *',
                hint: 'Ex: 12/345678',
                icon: LucideIcons.award,
                errorText: _errors['permis'],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildTextField(
                controller: _permisDateCtrl,
                label: 'Date délivrance Permis',
                hint: 'YYYY-MM-DD',
                icon: LucideIcons.calendar,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _passportCtrl,
          label: 'Numéro de Passeport (Clients étrangers / MRE)',
          hint: 'Ex: FA1234567',
          icon: LucideIcons.bookOpen,
        ),
      ],
    );
  }

  Widget _buildStep3Scans() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle(
            'Scans Numériques & Pièces Justificatives', LucideIcons.shieldCheck),
        const SizedBox(height: 6),
        const Text(
          'Capturez avec la caméra du téléphone ou importez depuis la galerie. Ces documents sont synchronisés avec la fiche web du client.',
          style: TextStyle(fontSize: 11, color: AppColors2026.textMuted),
        ),
        const SizedBox(height: 16),

        // Grid of 4 Document Cards: CIN, Permis, Passeport, Photo Profil
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.9,
          children: [
            _buildDocCard(
              title: 'SCAN CIN',
              imageUrl: _cinImageUrl,
              onPick: () => _showDocPickerSheet('cin', 'Carte Nationale (CIN)'),
              onRemove: () => setState(() => _cinImageUrl = null),
            ),
            _buildDocCard(
              title: 'SCAN PERMIS',
              imageUrl: _permisImageUrl,
              onPick: () => _showDocPickerSheet('permis', 'Permis de Conduire'),
              onRemove: () => setState(() => _permisImageUrl = null),
            ),
            _buildDocCard(
              title: 'SCAN PASSEPORT',
              imageUrl: _passportImageUrl,
              onPick: () => _showDocPickerSheet('passeport', 'Passeport'),
              onRemove: () => setState(() => _passportImageUrl = null),
            ),
            _buildDocCard(
              title: 'PHOTO PROFIL',
              imageUrl: _avatarUrl,
              onPick: () => _showDocPickerSheet('avatar', 'Photo du Client'),
              onRemove: () => setState(() => _avatarUrl = null),
            ),
          ],
        ),

        const SizedBox(height: 20),
        _buildSectionTitle('Aperçu Fiche Client', LucideIcons.clipboardList),
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

  Widget _buildDocCard({
    required String title,
    required String? imageUrl,
    required VoidCallback onPick,
    required VoidCallback onRemove,
  }) {
    final hasImage = imageUrl != null && imageUrl.isNotEmpty;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasImage
              ? AppColors2026.cyanNeon.withOpacity(0.5)
              : Colors.white12,
        ),
      ),
      padding: const EdgeInsets.all(10),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: Colors.white70,
                ),
              ),
              if (hasImage)
                GestureDetector(
                  onTap: onRemove,
                  child: const Icon(LucideIcons.trash2,
                      size: 14, color: AppColors2026.roseLaser),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Expanded(
            child: GestureDetector(
              onTap: onPick,
              child: hasImage
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: VehicleImagePreview(
                        imageData: imageUrl,
                        fit: BoxFit.cover,
                        width: double.infinity,
                      ),
                    )
                  : Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.03),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: Colors.white10,
                          style: BorderStyle.solid,
                        ),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.camera,
                              size: 24, color: AppColors2026.cyanBright),
                          SizedBox(height: 6),
                          Text(
                            'Numériser',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
          ),
        ],
      ),
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
