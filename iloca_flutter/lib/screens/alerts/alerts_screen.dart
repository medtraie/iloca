import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../providers/app_state_provider.dart';

/// Centre d'Alertes Opérationnel BonaTours 2026 (100% Retards, Contrats, Factures & Flotte - Zéro GPS)
class AlertsScreen extends StatefulWidget {
  final AppStateProvider appState;

  const AlertsScreen({super.key, required this.appState});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  String _categoryFilter = 'all'; // 'all' | 'critical' | 'warning' | 'finance'

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

  Color _sevColor(String s) {
    switch (s) {
      case 'critical':
        return AppColors2026.roseLaser;
      case 'warning':
        return AppColors2026.amberSolar;
      default:
        return AppColors2026.cyanNeon;
    }
  }

  String _sevLabel(String s) {
    switch (s) {
      case 'critical':
        return 'URGENT / CRITIQUE';
      case 'warning':
        return 'AVERTISSEMENT';
      default:
        return 'SUIVI & SOLDE';
    }
  }

  IconData _sevIcon(String source, String sev) {
    if (sev == 'critical') return LucideIcons.alertOctagon;
    if (source == 'contrat') return LucideIcons.fileWarning;
    if (source == 'facture') return LucideIcons.receipt;
    if (source == 'finance') return LucideIcons.coins;
    if (source == 'flotte') return LucideIcons.wrench;
    return LucideIcons.alertTriangle;
  }

  @override
  Widget build(BuildContext context) {
    final all = widget.appState.allAlerts;
    final critCount = all.where((a) => a.severity == 'critical').length;
    final warnCount = all.where((a) => a.severity == 'warning').length;
    final financeCount = all.where((a) => a.source == 'facture' || a.source == 'finance').length;

    final filtered = all.where((a) {
      if (_categoryFilter == 'critical') return a.severity == 'critical';
      if (_categoryFilter == 'warning') return a.severity == 'warning';
      if (_categoryFilter == 'finance') return a.source == 'facture' || a.source == 'finance';
      return true;
    }).toList();

    return RefreshIndicator(
      color: AppColors2026.cyanNeon,
      onRefresh: widget.appState.refreshAllData,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 130),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CENTRE D\'EXPLOITATION BONATOURS',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors2026.roseLaser,
                        letterSpacing: 0.7,
                      ),
                    ),
                    Text(
                      'Alertes Opérationnelles',
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: widget.appState.refreshAllData,
                icon: const Icon(LucideIcons.refreshCw, size: 14),
                label: const Text('Actualiser'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white24),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Operational Filter Cards (No GPS)
          Row(
            children: [
              Expanded(
                child: _SeverityCounterCard(
                  label: 'Critiques',
                  subtitle: 'Retards',
                  count: critCount,
                  color: AppColors2026.roseLaser,
                  selected: _categoryFilter == 'critical',
                  onTap: () => setState(() => _categoryFilter =
                      _categoryFilter == 'critical' ? 'all' : 'critical'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _SeverityCounterCard(
                  label: 'Rappels',
                  subtitle: '< 48h & Atelier',
                  count: warnCount,
                  color: AppColors2026.amberSolar,
                  selected: _categoryFilter == 'warning',
                  onTap: () => setState(() => _categoryFilter =
                      _categoryFilter == 'warning' ? 'all' : 'warning'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _SeverityCounterCard(
                  label: 'Finances',
                  subtitle: 'Soldes & Impayés',
                  count: financeCount,
                  color: AppColors2026.cyanNeon,
                  selected: _categoryFilter == 'finance',
                  onTap: () => setState(() => _categoryFilter =
                      _categoryFilter == 'finance' ? 'all' : 'finance'),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          if (filtered.isEmpty)
            SpatialGlassCard(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  const Icon(
                    LucideIcons.checkCircle2,
                    size: 44,
                    color: AppColors2026.emeraldNeon,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Aucune anomalie active',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Tous les contrats, véhicules et factures sont conformes et à jour.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            )
          else
            ...filtered.map((alert) {
              final c = _sevColor(alert.severity);
              return SpatialGlassCard(
                margin: const EdgeInsets.only(bottom: 10),
                borderColor: c.withOpacity(0.35),
                padding: const EdgeInsets.all(14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: c.withOpacity(0.16),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        _sevIcon(alert.source, alert.severity),
                        color: c,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              NeonBadge(
                                label: _sevLabel(alert.severity),
                                color: c,
                                pulsing: alert.severity == 'critical',
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.06),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  alert.source.toUpperCase(),
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors2026.textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            alert.title,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            alert.message,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors2026.textSecondary,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                alert.date.split('T').first,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors2026.textMuted,
                                ),
                              ),
                              GestureDetector(
                                onTap: () {
                                  if (alert.source == 'contrat') {
                                    widget.appState.setActiveTab(3); // Contrats
                                  } else if (alert.source == 'facture') {
                                    widget.appState.setActiveTab(4); // Factures
                                  } else if (alert.source == 'flotte') {
                                    widget.appState.setActiveTab(2); // Véhicules
                                  }
                                },
                                child: Row(
                                  children: [
                                    Text(
                                      'Accéder',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                        color: c,
                                      ),
                                    ),
                                    const SizedBox(width: 2),
                                    Icon(LucideIcons.arrowRight, size: 12, color: c),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _SeverityCounterCard extends StatelessWidget {
  final String label;
  final String subtitle;
  final int count;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _SeverityCounterCard({
    required this.label,
    required this.subtitle,
    required this.count,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? color.withOpacity(0.18)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? color : Colors.white10,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: selected ? color : Colors.white70,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 9.5,
                color: AppColors2026.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
