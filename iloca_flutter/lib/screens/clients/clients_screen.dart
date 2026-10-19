import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

/// 2. CLIENTS SCREEN (Gestion Locataires & Chauffeurs 2026)
class ClientsScreen extends StatefulWidget {
  final AppStateProvider appState;

  const ClientsScreen({super.key, required this.appState});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  String _search = '';
  String _typeFilter = 'all'; // 'all' | 'Locataire Principal' | 'Chauffeur secondaire'

  void _openClientForm([ClientModel? existing]) {
    final lastNameCtrl = TextEditingController(text: existing?.lastName ?? '');
    final firstNameCtrl = TextEditingController(text: existing?.firstName ?? '');
    final phoneCtrl = TextEditingController(text: existing?.phone ?? '');
    final cinCtrl = TextEditingController(text: existing?.cin ?? '');
    final cinDateCtrl = TextEditingController(text: existing?.cinDelivered ?? '');
    final licenseCtrl = TextEditingController(text: existing?.licenseNumber ?? '');
    final licenseDateCtrl =
        TextEditingController(text: existing?.licenseDelivered ?? '');
    final passportCtrl =
        TextEditingController(text: existing?.passportNumber ?? '');
    final addressCtrl =
        TextEditingController(text: existing?.addressMorocco ?? '');
    final nationalityCtrl =
        TextEditingController(text: existing?.nationality ?? 'Marocaine');
    String customerType = existing?.customerType ?? 'Locataire Principal';

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
                              ? 'NOUVEAU CLIENT / LOCATAIRE'
                              : 'MODIFIER LE CLIENT',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.4,
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
                            controller: lastNameCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Nom *',
                              prefixIcon: Icon(LucideIcons.user, size: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: firstNameCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Prénom',
                              prefixIcon: Icon(LucideIcons.userCheck, size: 16),
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
                            controller: phoneCtrl,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              labelText: 'Téléphone',
                              prefixIcon: Icon(LucideIcons.phone, size: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: nationalityCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Nationalité',
                              prefixIcon: Icon(LucideIcons.globe, size: 16),
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
                            controller: cinCtrl,
                            decoration: const InputDecoration(
                              labelText: 'N° CIN',
                              prefixIcon: Icon(LucideIcons.creditCard, size: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: cinDateCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Date validité CIN',
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
                            controller: licenseCtrl,
                            decoration: const InputDecoration(
                              labelText: 'N° Permis',
                              prefixIcon: Icon(LucideIcons.award, size: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: passportCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Passeport',
                              prefixIcon: Icon(LucideIcons.bookOpen, size: 16),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: addressCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Adresse complète',
                        prefixIcon: Icon(LucideIcons.mapPin, size: 16),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: customerType,
                      decoration: const InputDecoration(
                        labelText: 'Catégorie du conducteur',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'Locataire Principal',
                          child: Text('Locataire Principal'),
                        ),
                        DropdownMenuItem(
                          value: 'Chauffeur secondaire',
                          child: Text('Chauffeur secondaire'),
                        ),
                      ],
                      onChanged: (v) {
                        if (v != null) setSheetState(() => customerType = v);
                      },
                    ),
                    const SizedBox(height: 18),
                    ElevatedButton.icon(
                      onPressed: () async {
                        if (lastNameCtrl.text.trim().isEmpty) return;
                        final now = DateTime.now().toIso8601String();
                        final model = ClientModel(
                          id: existing?.id ?? '',
                          lastName: lastNameCtrl.text.trim(),
                          firstName: firstNameCtrl.text.trim(),
                          phone: phoneCtrl.text.trim(),
                          cin: cinCtrl.text.trim(),
                          cinDelivered: cinDateCtrl.text.trim(),
                          licenseNumber: licenseCtrl.text.trim(),
                          licenseDelivered: licenseDateCtrl.text.trim(),
                          passportNumber: passportCtrl.text.trim(),
                          addressMorocco: addressCtrl.text.trim(),
                          nationality: nationalityCtrl.text.trim(),
                          customerType: customerType,
                          createdAt: existing?.createdAt ?? now,
                          updatedAt: now,
                        );
                        Navigator.pop(ctx);
                        await widget.appState.saveClient(
                          model,
                          isEdit: existing != null,
                        );
                      },
                      icon: const Icon(LucideIcons.checkCircle2, size: 18),
                      label: Text(
                        existing == null
                            ? 'ENREGISTRER & SYNCHRONISER'
                            : 'METTRE À JOUR EN TEMPS RÉEL',
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
    final allClients = widget.appState.clients;
    final filtered = allClients.where((c) {
      if (_typeFilter != 'all' && c.customerType != _typeFilter) return false;
      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        return c.fullName.toLowerCase().contains(q) ||
            c.cin.toLowerCase().contains(q) ||
            c.phone.toLowerCase().contains(q) ||
            c.licenseNumber.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 92),
        child: FloatingActionButton.extended(
          onPressed: () => _openClientForm(),
          backgroundColor: AppColors2026.emeraldNeon,
          foregroundColor: AppColors2026.abyss,
          icon: const Icon(LucideIcons.userPlus, size: 18),
          label: const Text(
            'Nouveau Client',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
      ),
      body: Column(
        children: [
          // Top Search & Filter Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
            child: Column(
              children: [
                TextField(
                  onChanged: (v) => setState(() => _search = v),
                  decoration: InputDecoration(
                    hintText:
                        'Rechercher client par nom, CIN, permis, téléphone...',
                    prefixIcon: const Icon(LucideIcons.search, size: 18),
                    suffixIcon: _search.isNotEmpty
                        ? IconButton(
                            onPressed: () => setState(() => _search = ''),
                            icon: const Icon(LucideIcons.x, size: 16),
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterPill(
                        label: 'Tous (${allClients.length})',
                        selected: _typeFilter == 'all',
                        onTap: () => setState(() => _typeFilter = 'all'),
                      ),
                      const SizedBox(width: 8),
                      _FilterPill(
                        label: 'Locataires Principaux',
                        selected: _typeFilter == 'Locataire Principal',
                        onTap: () => setState(
                            () => _typeFilter = 'Locataire Principal'),
                      ),
                      const SizedBox(width: 8),
                      _FilterPill(
                        label: 'Chauffeurs Secondaires',
                        selected: _typeFilter == 'Chauffeur secondaire',
                        onTap: () => setState(
                            () => _typeFilter = 'Chauffeur secondaire'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Clients List
          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text(
                      'Aucun client trouvé.',
                      style: TextStyle(color: AppColors2026.textSecondary),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 6, 16, 130),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) {
                      final client = filtered[i];
                      final clientContracts = widget.appState.contracts
                          .where((cnt) =>
                              cnt.customerCin == client.cin &&
                                  client.cin.isNotEmpty ||
                              cnt.customerName.toLowerCase() ==
                                  client.fullName.toLowerCase())
                          .toList();
                      final hasActiveRental =
                          clientContracts.any((cnt) => cnt.isActive);

                      return SpatialGlassCard(
                        margin: const EdgeInsets.only(bottom: 12),
                        borderColor: hasActiveRental
                            ? AppColors2026.emeraldNeon.withOpacity(0.4)
                            : Colors.white.withOpacity(0.1),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor:
                                      AppColors2026.cyanNeon.withOpacity(0.2),
                                  child: Text(
                                    client.fullName
                                        .substring(0, 1)
                                        .toUpperCase(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      color: AppColors2026.cyanBright,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        client.fullName,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      Text(
                                        '${client.customerType} • ${client.nationality}',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors2026.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (hasActiveRental)
                                  const NeonBadge(
                                    label: 'En location',
                                    color: AppColors2026.emeraldNeon,
                                    pulsing: true,
                                  )
                                else
                                  NeonBadge(
                                    label: '${clientContracts.length} contrats',
                                    color: AppColors2026.cyanNeon,
                                  ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 12,
                              runSpacing: 6,
                              children: [
                                if (client.cin.isNotEmpty)
                                  _InfoTag(
                                    icon: LucideIcons.creditCard,
                                    text: 'CIN: ${client.cin}',
                                  ),
                                if (client.licenseNumber.isNotEmpty)
                                  _InfoTag(
                                    icon: LucideIcons.award,
                                    text: 'Permis: ${client.licenseNumber}',
                                  ),
                                if (client.phone.isNotEmpty)
                                  _InfoTag(
                                    icon: LucideIcons.phone,
                                    text: client.phone,
                                  ),
                                if (client.displayAddress.isNotEmpty)
                                  _InfoTag(
                                    icon: LucideIcons.mapPin,
                                    text: client.displayAddress,
                                  ),
                              ],
                            ),
                            const Divider(height: 20, color: Colors.white12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton.icon(
                                  onPressed: () => _openClientForm(client),
                                  icon: const Icon(LucideIcons.edit3, size: 15),
                                  label: const Text('Modifier'),
                                ),
                                const SizedBox(width: 8),
                                TextButton.icon(
                                  onPressed: () =>
                                      widget.appState.deleteClient(client.id),
                                  style: TextButton.styleFrom(
                                    foregroundColor: AppColors2026.roseLaser,
                                  ),
                                  icon:
                                      const Icon(LucideIcons.trash2, size: 15),
                                  label: const Text('Supprimer'),
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

class _FilterPill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterPill({
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
              ? AppColors2026.cyanNeon
              : Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? AppColors2026.cyanNeon : Colors.white12,
          ),
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

class _InfoTag extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InfoTag({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors2026.cyanBright),
        const SizedBox(width: 5),
        Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors2026.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
