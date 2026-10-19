import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../providers/app_state_provider.dart';
import '../alerts/alerts_screen.dart';
import '../clients/clients_screen.dart';
import '../contracts/contracts_screen.dart';
import '../map/fleet_map_screen.dart';
import '../overview/overview_screen.dart';
import '../reports/reports_screen.dart';
import '../tracking/tracking_screen.dart';
import '../vehicles/vehicles_screen.dart';

class SpatialSectionMeta {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color accentColor;

  const SpatialSectionMeta({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.accentColor,
  });
}

class MainSpatialShell extends StatelessWidget {
  const MainSpatialShell({super.key});

  static const List<SpatialSectionMeta> sections = [
    SpatialSectionMeta(
      title: 'Overview',
      subtitle: 'Centre de Commandement Spatial 2026',
      icon: LucideIcons.layoutGrid,
      accentColor: AppTheme2026.electricCyan,
    ),
    SpatialSectionMeta(
      title: 'Clients',
      subtitle: 'CRM & Profils Locataires Synchronisés',
      icon: LucideIcons.users,
      accentColor: AppTheme2026.hyperViolet,
    ),
    SpatialSectionMeta(
      title: 'Véhicules',
      subtitle: 'Parc Automobile & Statut Temps Réel',
      icon: LucideIcons.car,
      accentColor: AppTheme2026.neonEmerald,
    ),
    SpatialSectionMeta(
      title: 'Contrats',
      subtitle: 'Locations Actives & Facturation Instantanée',
      icon: LucideIcons.fileText,
      accentColor: AppTheme2026.amberGold,
    ),
    SpatialSectionMeta(
      title: 'Rapports',
      subtitle: 'Intelligence Financière & Rentabilité',
      icon: LucideIcons.barChart3,
      accentColor: AppTheme2026.electricCyan,
    ),
    SpatialSectionMeta(
      title: 'Carte',
      subtitle: 'Google Maps Live & Suivi Traceur Direct',
      icon: LucideIcons.map,
      accentColor: AppTheme2026.neonEmerald,
    ),
    SpatialSectionMeta(
      title: 'Suivi',
      subtitle: 'Studio Trajectoire GPSWOX & Lecteur Vidéo',
      icon: LucideIcons.radar,
      accentColor: AppTheme2026.hyperViolet,
    ),
    SpatialSectionMeta(
      title: 'Alertes',
      subtitle: 'Télémesure Sécurité, Vitesse & Contrats',
      icon: LucideIcons.bellRing,
      accentColor: AppTheme2026.crimsonAlert,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppStateProvider>();
    final currentIndex = state.activeTabIndex.clamp(0, sections.length - 1);
    final currentMeta = sections[currentIndex];
    final isWide = MediaQuery.of(context).size.width >= 840;
    final isFullBleedMap = currentIndex == 5 || currentIndex == 6;

    final screens = const [
      OverviewScreen(),
      ClientsScreen(),
      VehiclesScreen(),
      ContractsScreen(),
      ReportsScreen(),
      FleetMapScreen(),
      TrackingScreen(),
      AlertsScreen(),
    ];

    return Scaffold(
      extendBody: !isFullBleedMap,
      body: Container(
        decoration: BoxDecoration(
          gradient: state.isDarkMode
              ? const RadialGradient(
                  center: Alignment(-0.7, -0.8),
                  radius: 1.6,
                  colors: [
                    Color(0xFF0E1B38),
                    AppTheme2026.obsidianBg,
                    Color(0xFF03060C),
                  ],
                )
              : null,
        ),
        child: SafeArea(
          bottom: isFullBleedMap,
          child: Row(
            children: [
              // ── ADAPTIVE TABLET / DESKTOP SPATIAL RAIL ──
              if (isWide)
                _buildSpatialNavigationRail(context, state, currentIndex),

              // ── MAIN WORKSPACE ──
              Expanded(
                child: Column(
                  children: [
                    _buildTopSpatialHeader(context, state, currentMeta),
                    Expanded(
                      child: IndexedStack(
                        index: currentIndex,
                        children: screens,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: isWide
          ? null
          : _buildMobileSpatialDock(context, state, currentIndex),
    );
  }

  Widget _buildTopSpatialHeader(
    BuildContext context,
    AppStateProvider state,
    SpatialSectionMeta meta,
  ) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: state.isDarkMode
                ? Colors.white.withValues(alpha: 0.07)
                : Colors.black.withValues(alpha: 0.06),
          ),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              gradient: LinearGradient(
                colors: [
                  meta.accentColor,
                  meta.accentColor.withValues(alpha: 0.45),
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: meta.accentColor.withValues(alpha: 0.35),
                  blurRadius: 12,
                ),
              ],
            ),
            child: Icon(meta.icon, color: Colors.black, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      meta.title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Instant Web <-> Mobile Sync Indicator
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme2026.neonEmerald.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: AppTheme2026.neonEmerald.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AnimatedPulseDot(
                            color: state.isSyncingDb
                                ? AppTheme2026.electricCyan
                                : AppTheme2026.neonEmerald,
                            size: 6,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            state.isSyncingDb ? 'SYNC...' : 'SYNC LIVE',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: AppTheme2026.neonEmerald,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Text(
                  meta.subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme2026.textSecondaryDark,
                  ),
                ),
              ],
            ),
          ),

          // Quick Sync Button
          IconButton(
            tooltip: 'Synchroniser maintenant (Web & GPSWOX)',
            onPressed: () {
              state.refreshAllData();
              state.refreshGpsNow();
            },
            icon: const Icon(LucideIcons.refreshCw, size: 18),
          ),

          // Theme Toggle (Spatial Dark / Pearl Light)
          IconButton(
            tooltip: 'Changer le thème 2026',
            onPressed: () => state.toggleTheme(),
            icon: Icon(
              state.isDarkMode ? LucideIcons.sun : LucideIcons.moon,
              size: 18,
              color: state.isDarkMode
                  ? AppTheme2026.amberGold
                  : AppTheme2026.hyperViolet,
            ),
          ),

          // Logout
          IconButton(
            tooltip: 'Déconnexion',
            onPressed: () => state.signOut(),
            icon: const Icon(
              LucideIcons.logOut,
              size: 18,
              color: AppTheme2026.crimsonAlert,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpatialNavigationRail(
    BuildContext context,
    AppStateProvider state,
    int currentIndex,
  ) {
    return Container(
      width: 230,
      margin: const EdgeInsets.all(12),
      child: SpatialGlassCard(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
        borderRadius: 28,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: AppTheme2026.cyberAuroraGradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      LucideIcons.compass,
                      color: Colors.black,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'iLOCA 2026',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Text(
                        'FLUTTER SPATIAL OS',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: AppTheme2026.electricCyan,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView.separated(
                itemCount: sections.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (context, index) {
                  final item = sections[index];
                  final selected = index == currentIndex;
                  final alertBadge =
                      index == 7 && state.alerts.isNotEmpty ? state.alerts.length : 0;

                  return InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => state.setActiveTab(index),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 220),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        color: selected
                            ? item.accentColor.withValues(alpha: 0.18)
                            : Colors.transparent,
                        border: Border.all(
                          color: selected
                              ? item.accentColor.withValues(alpha: 0.55)
                              : Colors.transparent,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            item.icon,
                            size: 19,
                            color: selected
                                ? item.accentColor
                                : AppTheme2026.textSecondaryDark,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              item.title,
                              style: TextStyle(
                                fontWeight:
                                    selected ? FontWeight.w800 : FontWeight.w600,
                                fontSize: 13.5,
                                color: selected
                                    ? Colors.white
                                    : AppTheme2026.textSecondaryDark,
                              ),
                            ),
                          ),
                          if (alertBadge > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme2026.crimsonAlert,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '$alertBadge',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 2026 Scrollable Spatial Glass Dock for Mobile Phones (all 8 sections accessible in 1 tap)
  Widget _buildMobileSpatialDock(
    BuildContext context,
    AppStateProvider state,
    int currentIndex,
  ) {
    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          height: 76,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: state.isDarkMode
                ? const Color(0xE6080E1C)
                : Colors.white.withValues(alpha: 0.92),
            border: Border(
              top: BorderSide(
                color: state.isDarkMode
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.black.withValues(alpha: 0.08),
              ),
            ),
          ),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: sections.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (context, index) {
              final item = sections[index];
              final selected = index == currentIndex;
              final alertBadge =
                  index == 7 && state.alerts.isNotEmpty ? state.alerts.length : 0;

              return GestureDetector(
                onTap: () => state.setActiveTab(index),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOutCubic,
                  padding: EdgeInsets.symmetric(
                    horizontal: selected ? 16 : 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    color: selected
                        ? item.accentColor.withValues(alpha: 0.18)
                        : Colors.transparent,
                    border: Border.all(
                      color: selected
                          ? item.accentColor.withValues(alpha: 0.6)
                          : Colors.transparent,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(
                            item.icon,
                            size: 20,
                            color: selected
                                ? item.accentColor
                                : AppTheme2026.textSecondaryDark,
                          ),
                          if (alertBadge > 0)
                            Positioned(
                              right: -6,
                              top: -6,
                              child: Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(
                                  color: AppTheme2026.crimsonAlert,
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  '$alertBadge',
                                  style: const TextStyle(
                                    fontSize: 8,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(width: 7),
                      Text(
                        item.title,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight:
                              selected ? FontWeight.w800 : FontWeight.w600,
                          color: selected
                              ? (state.isDarkMode ? Colors.white : Colors.black)
                              : AppTheme2026.textSecondaryDark,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
