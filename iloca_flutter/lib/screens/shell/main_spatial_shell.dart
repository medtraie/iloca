import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../providers/app_state_provider.dart';
import '../alerts/alerts_screen.dart';
import '../auth/login_screen.dart';
import '../clients/clients_screen.dart';
import '../contracts/contracts_screen.dart';
import '../expenses/expenses_screen.dart';
import '../invoices/invoices_screen.dart';
import '../overview/overview_screen.dart';
import '../reports/reports_screen.dart';
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

class MainSpatialShell extends StatefulWidget {
  final AppStateProvider appState;

  const MainSpatialShell({super.key, required this.appState});

  static const List<SpatialSectionMeta> sections = [
    SpatialSectionMeta(
      title: 'Overview',
      subtitle: 'Centre de Commandement BonaTours 2026',
      icon: LucideIcons.layoutGrid,
      accentColor: AppColors2026.cyanNeon,
    ),
    SpatialSectionMeta(
      title: 'Clients',
      subtitle: 'CRM & Profils Locataires Synchronisés',
      icon: LucideIcons.users,
      accentColor: AppColors2026.violetElectric,
    ),
    SpatialSectionMeta(
      title: 'Véhicules',
      subtitle: 'Parc Automobile & Statut Temps Réel',
      icon: LucideIcons.car,
      accentColor: AppColors2026.emeraldNeon,
    ),
    SpatialSectionMeta(
      title: 'Contrats',
      subtitle: 'Locations Actives & Facturation Instantanée',
      icon: LucideIcons.fileText,
      accentColor: AppColors2026.amberSolar,
    ),
    SpatialSectionMeta(
      title: 'Factures',
      subtitle: 'Facturation Légale & Recouvrement BonaTours',
      icon: LucideIcons.receipt,
      accentColor: AppColors2026.cyanBright,
    ),
    SpatialSectionMeta(
      title: 'Dépenses',
      subtitle: 'Charges Flotte, Vignettes, Assurances & Entretien',
      icon: LucideIcons.wallet,
      accentColor: AppColors2026.amberSolar,
    ),
    SpatialSectionMeta(
      title: 'Rapports',
      subtitle: 'Intelligence Financière & Rentabilité',
      icon: LucideIcons.barChart3,
      accentColor: AppColors2026.violetElectric,
    ),
    SpatialSectionMeta(
      title: 'Alertes',
      subtitle: 'Surveillance Flotte, Retards & Recouvrement',
      icon: LucideIcons.bellRing,
      accentColor: AppColors2026.roseLaser,
    ),
  ];

  @override
  State<MainSpatialShell> createState() => _MainSpatialShellState();
}

class _MainSpatialShellState extends State<MainSpatialShell> {
  @override
  void initState() {
    super.initState();
    // Ensure data is fetched immediately when entering the Cockpit shell
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted &&
          widget.appState.vehicles.isEmpty &&
          !widget.appState.isSyncing) {
        widget.appState.refreshAllData();
      }
    });
  }

  Future<void> _confirmLogout(BuildContext context, AppStateProvider state) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors2026.obsidianSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: AppColors2026.roseLaser.withOpacity(0.4)),
        ),
        title: const Row(
          children: [
            Icon(LucideIcons.logOut, color: AppColors2026.roseLaser, size: 20),
            SizedBox(width: 8),
            Text('Déconnexion',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          ],
        ),
        content: const Text(
          'Voulez-vous vraiment vous déconnecter de BonaTours ?',
          style: TextStyle(color: AppColors2026.textSecondary, fontSize: 13),
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
            child: const Text('Se déconnecter'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await state.logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = widget.appState;
    return ListenableBuilder(
      listenable: appState,
      builder: (context, _) {
        final currentIndex = appState.activeTabIndex
            .clamp(0, MainSpatialShell.sections.length - 1);
        final currentMeta = MainSpatialShell.sections[currentIndex];
        final isWide = MediaQuery.of(context).size.width >= 840;

        return Scaffold(
          extendBody: true,
          body: Container(
            decoration: BoxDecoration(
              gradient: appState.isDarkMode
                  ? const RadialGradient(
                      center: Alignment(-0.7, -0.8),
                      radius: 1.6,
                      colors: [
                        Color(0xFF0E1B38),
                        AppColors2026.abyss,
                        Color(0xFF03060C),
                      ],
                    )
                  : null,
            ),
            child: SafeArea(
              bottom: false,
              child: Row(
                children: [
                  if (isWide)
                    _buildSpatialNavigationRail(
                        context, appState, currentIndex),
                  Expanded(
                    child: Column(
                      children: [
                        _buildTopSpatialHeader(context, appState, currentMeta),
                        if (appState.lastSyncError != null &&
                            !appState.isSyncing)
                          _buildSyncErrorBanner(appState),
                        Expanded(
                          child: IndexedStack(
                            index: currentIndex,
                            children: [
                              OverviewScreen(appState: appState),
                              ClientsScreen(appState: appState),
                              VehiclesScreen(appState: appState),
                              ContractsScreen(appState: appState),
                              InvoicesScreen(appState: appState),
                              ExpensesScreen(appState: appState),
                              ReportsScreen(appState: appState),
                              AlertsScreen(appState: appState),
                            ],
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
              : _buildMobileSpatialDock(context, appState, currentIndex),
        );
      },
    );
  }

  /// Visible sync failure notice with the real cause and a manual retry.
  Widget _buildSyncErrorBanner(AppStateProvider state) {
    final err = state.lastSyncError ?? '';
    final reason = err.contains('SocketException') ||
            err.contains('Failed host lookup') ||
            err.contains('ClientException')
        ? 'Pas de connexion au serveur (vérifiez Internet).'
        : err.contains('Timeout')
            ? 'Le serveur met trop de temps à répondre.'
            : err;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.fromLTRB(12, 8, 6, 8),
      decoration: BoxDecoration(
        color: AppColors2026.roseLaser.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors2026.roseLaser.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(LucideIcons.wifiOff,
              size: 16, color: AppColors2026.roseLaser),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Données non synchronisées : $reason',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
            ),
          ),
          TextButton(
            onPressed: () => state.retrySync(),
            child: const Text('Réessayer',
                style: TextStyle(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
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
                ? Colors.white.withOpacity(0.07)
                : Colors.black.withOpacity(0.06),
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
                  meta.accentColor.withOpacity(0.45),
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: meta.accentColor.withOpacity(0.35),
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
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        meta.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.4,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2.5,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors2026.emeraldNeon.withOpacity(0.14),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: AppColors2026.emeraldNeon.withOpacity(0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AnimatedPulseDot(
                            color: state.isSyncing
                                ? AppColors2026.cyanNeon
                                : AppColors2026.emeraldNeon,
                            size: 5,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            state.isSyncing ? 'SYNC...' : 'LIVE',
                            style: const TextStyle(
                              fontSize: 8.5,
                              fontWeight: FontWeight.w900,
                              color: AppColors2026.emeraldNeon,
                              letterSpacing: 0.4,
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
                    fontSize: 10.5,
                    color: AppColors2026.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            padding: const EdgeInsets.all(6),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            tooltip: 'Synchroniser',
            onPressed: () {
              state.refreshAllData();
              state.refreshGpsTelemetry();
            },
            icon: const Icon(LucideIcons.refreshCw, size: 17),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            padding: const EdgeInsets.all(6),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            tooltip: 'Changer le thème',
            onPressed: () => state.toggleThemeMode(),
            icon: Icon(
              state.isDarkMode ? LucideIcons.sun : LucideIcons.moon,
              size: 17,
              color: state.isDarkMode
                  ? AppColors2026.amberSolar
                  : AppColors2026.violetElectric,
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            padding: const EdgeInsets.all(6),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            tooltip: 'Déconnexion',
            onPressed: () => _confirmLogout(context, state),
            icon: const Icon(
              LucideIcons.logOut,
              size: 17,
              color: AppColors2026.roseLaser,
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
                      gradient: AppColors2026.cyanEmeraldGradient,
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
                        'bonatours',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Text(
                        'LOCATION & TOURS PRO',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: AppColors2026.cyanNeon,
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
                itemCount: MainSpatialShell.sections.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (context, index) {
                  final item = MainSpatialShell.sections[index];
                  final selected = index == currentIndex;
                  final alertBadge = item.title == 'Alertes' && state.allAlerts.isNotEmpty
                      ? state.allAlerts.length
                      : 0;

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
                            ? item.accentColor.withOpacity(0.18)
                            : Colors.transparent,
                        border: Border.all(
                          color: selected
                              ? item.accentColor.withOpacity(0.55)
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
                                : AppColors2026.textSecondary,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              item.title,
                              style: TextStyle(
                                fontWeight: selected
                                    ? FontWeight.w800
                                    : FontWeight.w600,
                                fontSize: 13.5,
                                color: selected
                                    ? Colors.white
                                    : AppColors2026.textSecondary,
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
                                color: AppColors2026.roseLaser,
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
                : Colors.white.withOpacity(0.92),
            border: Border(
              top: BorderSide(
                color: state.isDarkMode
                    ? Colors.white.withOpacity(0.1)
                    : Colors.black.withOpacity(0.08),
              ),
            ),
          ),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: MainSpatialShell.sections.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (context, index) {
              final item = MainSpatialShell.sections[index];
              final selected = index == currentIndex;
              final alertBadge = item.title == 'Alertes' && state.allAlerts.isNotEmpty
                  ? state.allAlerts.length
                  : 0;

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
                        ? item.accentColor.withOpacity(0.18)
                        : Colors.transparent,
                    border: Border.all(
                      color: selected
                          ? item.accentColor.withOpacity(0.6)
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
                                : AppColors2026.textSecondary,
                          ),
                          if (alertBadge > 0)
                            Positioned(
                              right: -6,
                              top: -6,
                              child: Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(
                                  color: AppColors2026.roseLaser,
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
                              : AppColors2026.textSecondary,
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
