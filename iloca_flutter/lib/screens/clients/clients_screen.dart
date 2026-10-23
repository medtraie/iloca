import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import 'client_form_dialog.dart';

/// 2. CLIENTS SCREEN — 100% Web Parity (Customers.tsx + CustomerFormDialog.tsx)
class ClientsScreen extends StatefulWidget {
  final AppStateProvider appState;

  const ClientsScreen({super.key, required this.appState});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  String _search = '';
  String _typeFilter = 'all'; // 'all' | 'Locataire Principal' | 'Chauffeur secondaire'
  String _nationalityFilter = 'all';

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

  void _openClientForm([ClientModel? existing]) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (ctx) => ClientFormDialog(
          appState: widget.appState,
          client: existing,
        ),
      ),
    );
  }

  Future<void> _callClient(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) return;
    final uri = Uri.parse('tel:$clean');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _confirmDelete(ClientModel client) async {
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
                'Supprimer le client ?',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
        content: Text(
          'Êtes-vous sûr de vouloir supprimer définitivement le profil client de "${client.fullName}" ?',
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
      await widget.appState.deleteClient(client.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final allClients = widget.appState.clients;
    final allContracts = widget.appState.contracts;

    final filtered = allClients.where((c) {
      if (_typeFilter != 'all' && c.customerType != _typeFilter) {
        return false;
      }
      if (_nationalityFilter != 'all' &&
          c.nationality.toLowerCase() != _nationalityFilter.toLowerCase()) {
        return false;
      }
      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        return c.fullName.toLowerCase().contains(q) ||
            c.cin.toLowerCase().contains(q) ||
            c.phone.toLowerCase().contains(q) ||
            c.licenseNumber.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    final totalCount = allClients.length;
    final activeRentersCount = allClients.where((c) {
      return allContracts.any((k) =>
          k.isActive &&
          (k.clientId == c.id ||
              k.customerName.toLowerCase() == c.fullName.toLowerCase()));
    }).length;

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 90),
        child: FloatingActionButton.extended(
          heroTag: 'new_client_fab_btn',
          onPressed: () => _openClientForm(),
          backgroundColor: AppColors2026.cyanNeon,
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
          // Filter & Search Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
            child: Column(
              children: [
                // Search Bar
                SizedBox(
                  height: 42,
                  child: TextField(
                    onChanged: (v) => setState(() => _search = v),
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 0),
                      hintText: 'Rechercher nom, prénom, CIN, tél ou permis...',
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

                // Quick Filter Chips (All, Locataire Principal, Chauffeur Secondaire)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterPill(
                        label: 'Tous ($totalCount)',
                        selected: _typeFilter == 'all',
                        onTap: () => setState(() => _typeFilter = 'all'),
                      ),
                      const SizedBox(width: 8),
                      _FilterPill(
                        label: 'En Location ($activeRentersCount)',
                        selected: _typeFilter == 'active_rental',
                        onTap: () => setState(() => _typeFilter = 'active_rental'),
                      ),
                      const SizedBox(width: 8),
                      _FilterPill(
                        label: 'Locataires Principaux',
                        selected: _typeFilter == 'Locataire Principal',
                        onTap: () =>
                            setState(() => _typeFilter = 'Locataire Principal'),
                      ),
                      const SizedBox(width: 8),
                      _FilterPill(
                        label: 'Chauffeurs Adjoints',
                        selected: _typeFilter == 'Chauffeur secondaire',
                        onTap: () =>
                            setState(() => _typeFilter = 'Chauffeur secondaire'),
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
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.users,
                            size: 44, color: AppColors2026.textMuted),
                        const SizedBox(height: 12),
                        const Text(
                          'Aucun client trouvé',
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
                      final client = filtered[i];
                      final clientContracts = allContracts
                          .where((c) =>
                              c.clientId == client.id ||
                              c.customerName.toLowerCase() ==
                                  client.fullName.toLowerCase())
                          .toList();
                      final hasActiveRental =
                          clientContracts.any((c) => c.isActive);

                      return SpatialGlassCard(
                        margin: const EdgeInsets.only(bottom: 12),
                        borderColor: hasActiveRental
                            ? AppColors2026.emeraldNeon.withOpacity(0.4)
                            : Colors.white10,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: AppColors2026.cyanNeon
                                        .withOpacity(0.14),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: AppColors2026.cyanNeon
                                          .withOpacity(0.4),
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    client.lastName.isNotEmpty
                                        ? client.lastName[0].toUpperCase()
                                        : 'C',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 16,
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
                                      const SizedBox(height: 2),
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
                              spacing: 8,
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
                            const Divider(height: 18, color: Colors.white12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                if (client.phone.isNotEmpty)
                                  IconButton(
                                    tooltip: 'Appeler le client',
                                    onPressed: () => _callClient(client.phone),
                                    icon: const Icon(LucideIcons.phoneCall,
                                        size: 16,
                                        color: AppColors2026.emeraldBright),
                                  )
                                else
                                  const SizedBox.shrink(),
                                Row(
                                  children: [
                                    TextButton.icon(
                                      onPressed: () => _openClientForm(client),
                                      style: TextButton.styleFrom(
                                        foregroundColor: AppColors2026.cyanBright,
                                      ),
                                      icon: const Icon(LucideIcons.edit3,
                                          size: 14),
                                      label: const Text('Modifier',
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold)),
                                    ),
                                    const SizedBox(width: 4),
                                    IconButton(
                                      tooltip: 'Supprimer',
                                      onPressed: () => _confirmDelete(client),
                                      icon: const Icon(
                                        LucideIcons.trash2,
                                        size: 16,
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected
              ? AppColors2026.cyanNeon
              : Colors.white.withOpacity(0.05),
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
          Icon(icon, size: 12, color: AppColors2026.cyanBright),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors2026.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
