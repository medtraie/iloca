import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../providers/app_state_provider.dart';

/// 8. ALERTES SCREEN (Centre d'Alertes Système & Événements GPSWOX 2026)
class AlertsScreen extends StatefulWidget {
  final AppStateProvider appState;

  const AlertsScreen({super.key, required this.appState});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  String _severityFilter = 'all'; // 'all' | 'critical' | 'warning' | 'info'

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
        return 'CRITIQUE';
      case 'warning':
        return 'AVERTISSEMENT';
      default:
        return 'INFO';
    }
  }

  IconData _sevIcon(String s) {
    switch (s) {
      case 'critical':
        return LucideIcons.shieldAlert;
      case 'warning':
        return LucideIcons.alertTriangle;
      default:
        return LucideIcons.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final all = widget.appState.allAlerts;
    final critCount = all.where((a) => a.severity == 'critical').length;
    final warnCount = all.where((a) => a.severity == 'warning').length;
    final infoCount = all.where((a) => a.severity == 'info').length;

    final filtered = all.where((a) {
      if (_severityFilter != 'all' && a.severity != _severityFilter) {
        return false;
      }
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
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SURVEILLANCE & SÉCURITÉ SFT',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppColors2026.roseLaser,
                      letterSpacing: 0.7,
                    ),
                  ),
                  Text(
                    'Centre d\'Alertes Live',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              OutlinedButton.icon(
                onPressed: widget.appState.refreshAllData,
                icon: const Icon(LucideIcons.refreshCw, size: 15),
                label: const Text('Actualiser'),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Severity KPI Row
          Row(
            children: [
              Expanded(
                child: _SeverityCounterCard(
                  label: 'Critiques',
                  count: critCount,
                  color: AppColors2026.roseLaser,
                  selected: _severityFilter == 'critical',
                  onTap: () => setState(() => _severityFilter =
                      _severityFilter == 'critical' ? 'all' : 'critical'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _SeverityCounterCard(
                  label: 'Avertissements',
                  count: warnCount,
                  color: AppColors2026.amberSolar,
                  selected: _severityFilter == 'warning',
                  onTap: () => setState(() => _severityFilter =
                      _severityFilter == 'warning' ? 'all' : 'warning'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _SeverityCounterCard(
                  label: 'Infos GPS',
                  count: infoCount,
                  color: AppColors2026.cyanNeon,
                  selected: _severityFilter == 'info',
                  onTap: () => setState(() => _severityFilter =
                      _severityFilter == 'info' ? 'all' : 'info'),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          if (filtered.isEmpty)
            SpatialGlassCard(
              padding: const EdgeInsets.all(28),
              child: Column(
                children: [
                  const Icon(
                    LucideIcons.shieldCheck,
                    size: 42,
                    color: AppColors2026.emeraldNeon,
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Aucune alerte active',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tous les véhicules et contrats fonctionnent normalement.',
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
                borderColor: c.withOpacity(0.4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: c.withOpacity(0.16),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(_sevIcon(alert.severity), color: c, size: 20),
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
                              Text(
                                alert.source.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors2026.textSecondary,
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
                            ),
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
  final int count;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _SeverityCounterCard({
    required this.label,
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
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.24) : color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? color : color.withOpacity(0.3),
            width: selected ? 1.8 : 1,
          ),
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
