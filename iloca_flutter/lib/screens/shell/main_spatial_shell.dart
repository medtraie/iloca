import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../providers/app_state_provider.dart';
import '../../services/supabase_sync_service.dart';
import '../alerts/alerts_screen.dart';
import '../clients/client_form_dialog.dart';
import '../clients/clients_screen.dart';
import '../contracts/contract_form_dialog.dart';
import '../contracts/contracts_screen.dart';
import '../expenses/expense_form_dialog.dart';
import '../expenses/expenses_screen.dart';
import '../invoices/invoice_form_dialog.dart';
import '../invoices/invoices_screen.dart';
import '../map/fleet_map_screen.dart';
import '../overview/overview_screen.dart';
import '../repairs/repairs_screen.dart';
import '../reports/reports_screen.dart';
import '../vehicles/vehicle_form_dialog.dart';
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

  // Tab indices:
  // 0: Cockpit (Overview), 1: GPS Live (Map), 2: Véhicules,
  // 3: Contrats, 4: Clients, 5: Factures, 6: Révisions/Repairs,
  // 7: Dépenses, 8: Rapports, 9: Alertes
  static const List<SpatialSectionMeta> sections = [
    SpatialSectionMeta(
      title: 'Overview',
      subtitle: 'Tableau de Bord & Cockpit Exécutif',
      icon: LucideIcons.layoutGrid,
      accentColor: AppColors2026.gold,
    ),
    SpatialSectionMeta(
      title: 'GPS Live',
      subtitle: 'Carte Satellite, Traceur & Télémétrie',
      icon: LucideIcons.mapPin,
      accentColor: AppColors2026.emeraldNeon,
    ),
    SpatialSectionMeta(
      title: 'Véhicules',
      subtitle: 'Parc Automobile & Gestion des États',
      icon: LucideIcons.car,
      accentColor: AppColors2026.goldLight,
    ),
    SpatialSectionMeta(
      title: 'Contrats',
      subtitle: 'Locations Actives & Contrats Officiels',
      icon: LucideIcons.fileText,
      accentColor: AppColors2026.gold,
    ),
    SpatialSectionMeta(
      title: 'Clients',
      subtitle: 'CRM VIP & Profils Locataires',
      icon: LucideIcons.users,
      accentColor: AppColors2026.goldLight,
    ),
    SpatialSectionMeta(
      title: 'Factures',
      subtitle: 'Facturation Légale & TVA 20%',
      icon: LucideIcons.receipt,
      accentColor: AppColors2026.amberSolar,
    ),
    SpatialSectionMeta(
      title: 'Révisions',
      subtitle: 'Maintenance, Réparations & Atelier',
      icon: LucideIcons.wrench,
      accentColor: AppColors2026.emeraldNeon,
    ),
    SpatialSectionMeta(
      title: 'Dépenses',
      subtitle: 'Charges Flotte, Vignettes & Assurances',
      icon: LucideIcons.wallet,
      accentColor: AppColors2026.roseLaser,
    ),
    SpatialSectionMeta(
      title: 'Rapports',
      subtitle: 'Intelligence Financière & Rentabilité BI',
      icon: LucideIcons.barChart3,
      accentColor: AppColors2026.blueRoyal,
    ),
    SpatialSectionMeta(
      title: 'Alertes',
      subtitle: 'Surveillance Flotte, Retards & GPS',
      icon: LucideIcons.bellRing,
      accentColor: AppColors2026.roseLaser,
    ),
  ];

  @override
  State<MainSpatialShell> createState() => _MainSpatialShellState();
}

class _MainSpatialShellState extends State<MainSpatialShell> {
  Timer? _clockTimer;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _clockTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted &&
          widget.appState.vehicles.isEmpty &&
          !widget.appState.isSyncing) {
        widget.appState.refreshAllData();
      }
      if (mounted && widget.appState.gpsDevices.isEmpty) {
        widget.appState.refreshGpsTelemetry();
      }
    });
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    super.dispose();
  }

  Future<void> _confirmLogout(BuildContext context, AppStateProvider state) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors2026.modalSheet,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: AppColors2026.roseLaser.withOpacity(0.45)),
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
          'Voulez-vous vraiment vous déconnecter de votre espace exécutif ?',
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

  void _openQuickCreateModal(BuildContext context, AppStateProvider state) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors2026.modalSheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: AppColors2026.gold.withOpacity(0.16),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: AppColors2026.gold.withOpacity(0.42),
                          ),
                        ),
                        child: const Center(
                          child: Text(
                            '✦',
                            style: TextStyle(
                              color: AppColors2026.goldLight,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'CRÉATION RAPIDE VIP',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w900,
                              color: AppColors2026.goldLight,
                              letterSpacing: 1.0,
                            ),
                          ),
                          Text(
                            'Actions instantanées 3D • Cloud Sync',
                            style: TextStyle(
                              fontSize: 10,
                              color: AppColors2026.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(LucideIcons.x,
                        size: 18, color: AppColors2026.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Divider(color: AppColors2026.gold.withOpacity(0.18), height: 1),
              const SizedBox(height: 16),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.18,
                children: [
                  Executive3DTile(
                    label: 'Contrat Express',
                    subtitle: 'Location officielle 1 clic',
                    orbTopColor: const Color(0xFF2B2310),
                    orbBorderColor: AppColors2026.gold,
                    icon: LucideIcons.zap,
                    iconGradient: const [
                      Color(0xFFFFF2B2),
                      Color(0xFFD4AF37),
                      Color(0xFF8A6414),
                    ],
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => ContractFormDialog(
                            appState: state,
                            mode: ContractFormMode.create,
                          ),
                        ),
                      );
                    },
                  ),
                  Executive3DTile(
                    label: 'Client & CRM',
                    subtitle: 'Fiche VIP & Scans HD',
                    orbTopColor: const Color(0xFF261E11),
                    orbBorderColor: AppColors2026.goldLight,
                    icon: LucideIcons.userPlus,
                    iconGradient: const [
                      Color(0xFFFFF3C4),
                      Color(0xFFD4AF37),
                      Color(0xFF7C5A10),
                    ],
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => ClientFormDialog(appState: state),
                        ),
                      );
                    },
                  ),
                  Executive3DTile(
                    label: 'Nouveau Véhicule',
                    subtitle: 'Ajouter au parc 2026',
                    orbTopColor: const Color(0xFF0E2920),
                    orbBorderColor: AppColors2026.emeraldNeon,
                    icon: LucideIcons.car,
                    iconGradient: const [
                      Color(0xFFA7F3D0),
                      Color(0xFF10B981),
                      Color(0xFF065F46),
                    ],
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => VehicleFormDialog(appState: state),
                        ),
                      );
                    },
                  ),
                  Executive3DTile(
                    label: 'Facture TVA',
                    subtitle: 'Émission fiscale 20%',
                    orbTopColor: const Color(0xFF2B1D0E),
                    orbBorderColor: AppColors2026.amberSolar,
                    icon: LucideIcons.receipt,
                    iconGradient: const [
                      Color(0xFFFDE68A),
                      Color(0xFFF59E0B),
                      Color(0xFF92400E),
                    ],
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => InvoiceFormDialog(appState: state),
                        ),
                      );
                    },
                  ),
                  Executive3DTile(
                    label: 'Nouvelle Dépense',
                    subtitle: 'Charges, Assurance, Vignette',
                    orbTopColor: const Color(0xFF2B1014),
                    orbBorderColor: AppColors2026.roseLaser,
                    icon: LucideIcons.wallet,
                    iconGradient: const [
                      Color(0xFFFECACA),
                      Color(0xFFEF4444),
                      Color(0xFF7F1D1D),
                    ],
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          fullscreenDialog: true,
                          builder: (_) => ExpenseFormDialog(appState: state),
                        ),
                      );
                    },
                  ),
                  Executive3DTile(
                    label: 'Révision / Atelier',
                    subtitle: 'Maintenance & Suivi SLA',
                    orbTopColor: const Color(0xFF0E2233),
                    orbBorderColor: AppColors2026.blueRoyal,
                    icon: LucideIcons.wrench,
                    iconGradient: const [
                      Color(0xFFBAE6FD),
                      Color(0xFF38BDF8),
                      Color(0xFF0369A1),
                    ],
                    onTap: () {
                      Navigator.pop(ctx);
                      state.setActiveTab(6);
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openGestionModal(BuildContext context, AppStateProvider state) {
    final unreadAlerts = state.allAlerts.length;
    final urgentMaint = state.repairs.where((r) => r.isUrgent).length;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors2026.modalSheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF2E2410), Color(0xFF131620)],
                          ),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: AppColors2026.gold.withOpacity(0.45),
                          ),
                        ),
                        child: const Center(
                          child: Text(
                            '✦',
                            style: TextStyle(
                              color: AppColors2026.goldLight,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'MODULES EXECUTIVE',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w900,
                              color: AppColors2026.goldLight,
                              letterSpacing: 1.2,
                            ),
                          ),
                          Text(
                            'Suite de Commandement 3D • Accès Direct',
                            style: TextStyle(
                              fontSize: 10,
                              color: AppColors2026.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(LucideIcons.x,
                        size: 18, color: AppColors2026.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Divider(color: AppColors2026.gold.withOpacity(0.18), height: 1),
              const SizedBox(height: 14),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 3,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 0.92,
                children: [
                  if (state.isSectionAllowed('Contrats'))
                    Executive3DTile(
                      label: 'Contrats',
                      badgeText: '${state.contracts.length}',
                      orbTopColor: const Color(0xFF2A2210),
                      orbBorderColor: AppColors2026.gold,
                      icon: LucideIcons.fileText,
                      iconGradient: const [
                        Color(0xFFFFF2B2),
                        Color(0xFFD4AF37),
                        Color(0xFF8A6414),
                      ],
                      onTap: () {
                        Navigator.pop(ctx);
                        state.setActiveTab(3);
                      },
                    ),
                  if (state.isSectionAllowed('Clients'))
                    Executive3DTile(
                      label: 'Clients',
                      badgeText: '${state.clients.length}',
                      orbTopColor: const Color(0xFF261E10),
                      orbBorderColor: AppColors2026.gold,
                      icon: LucideIcons.users,
                      iconGradient: const [
                        Color(0xFFFFF3C4),
                        Color(0xFFD4AF37),
                        Color(0xFF7C5A10),
                      ],
                      onTap: () {
                        Navigator.pop(ctx);
                        state.setActiveTab(4);
                      },
                    ),
                  if (state.isSectionAllowed('Factures'))
                    Executive3DTile(
                      label: 'Factures',
                      badgeText: '${state.invoices.length}',
                      badgeColor: AppColors2026.amberSolar,
                      orbTopColor: const Color(0xFF2B1D0E),
                      orbBorderColor: AppColors2026.amberSolar,
                      icon: LucideIcons.receipt,
                      iconGradient: const [
                        Color(0xFFFDE68A),
                        Color(0xFFF59E0B),
                        Color(0xFF92400E),
                      ],
                      onTap: () {
                        Navigator.pop(ctx);
                        state.setActiveTab(5);
                      },
                    ),
                  if (state.isSectionAllowed('Révisions'))
                    Executive3DTile(
                      label: 'Révisions',
                      badgeText: urgentMaint > 0 ? '$urgentMaint' : '${state.repairs.length}',
                      badgeColor: AppColors2026.emeraldNeon,
                      orbTopColor: const Color(0xFF0D281F),
                      orbBorderColor: AppColors2026.emeraldNeon,
                      icon: LucideIcons.shieldCheck,
                      iconGradient: const [
                        Color(0xFFA7F3D0),
                        Color(0xFF10B981),
                        Color(0xFF065F46),
                      ],
                      onTap: () {
                        Navigator.pop(ctx);
                        state.setActiveTab(6);
                      },
                    ),
                  if (state.isSectionAllowed('Dépenses'))
                    Executive3DTile(
                      label: 'Dépenses',
                      badgeText: '${state.expenses.length}',
                      badgeColor: AppColors2026.roseLaser,
                      orbTopColor: const Color(0xFF2B1014),
                      orbBorderColor: AppColors2026.roseLaser,
                      icon: LucideIcons.trendingDown,
                      iconGradient: const [
                        Color(0xFFFECACA),
                        Color(0xFFEF4444),
                        Color(0xFF7F1D1D),
                      ],
                      onTap: () {
                        Navigator.pop(ctx);
                        state.setActiveTab(7);
                      },
                    ),
                  if (state.isSectionAllowed('Rapports'))
                    Executive3DTile(
                      label: 'Rapports',
                      badgeText: 'BI',
                      badgeColor: AppColors2026.blueRoyal,
                      orbTopColor: const Color(0xFF0E2233),
                      orbBorderColor: AppColors2026.blueRoyal,
                      icon: LucideIcons.barChart3,
                      iconGradient: const [
                        Color(0xFFBAE6FD),
                        Color(0xFF38BDF8),
                        Color(0xFF0369A1),
                      ],
                      onTap: () {
                        Navigator.pop(ctx);
                        state.setActiveTab(8);
                      },
                    ),
                  if (state.isSectionAllowed('Alertes'))
                    Executive3DTile(
                      label: 'Alertes',
                      badgeText: unreadAlerts > 0 ? '$unreadAlerts' : null,
                      badgeColor: AppColors2026.roseLaser,
                      pulseBadge: unreadAlerts > 0,
                      orbTopColor: const Color(0xFF2B1F0D),
                      orbBorderColor: AppColors2026.amberSolar,
                      icon: LucideIcons.bellRing,
                      iconGradient: const [
                        Color(0xFFFEF08A),
                        Color(0xFFF59E0B),
                        Color(0xFF92400E),
                      ],
                      onTap: () {
                        Navigator.pop(ctx);
                        state.setActiveTab(9);
                      },
                    ),
                  Executive3DTile(
                    label: 'Map GPS',
                    badgeText: '${state.gpsDevices.length}',
                    badgeColor: AppColors2026.emeraldNeon,
                    orbTopColor: const Color(0xFF0C231D),
                    orbBorderColor: AppColors2026.emeraldNeon,
                    icon: LucideIcons.mapPin,
                    iconGradient: const [
                      Color(0xFFA7F3D0),
                      Color(0xFF10B981),
                      Color(0xFF065F46),
                    ],
                    onTap: () {
                      Navigator.pop(ctx);
                      state.setActiveTab(1);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors2026.surfaceInput,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        gradient: AppColors2026.goldGradient,
                        borderRadius: BorderRadius.circular(11),
                      ),
                      child: Center(
                        child: Text(
                          state.userName.isNotEmpty
                              ? state.userName.substring(0, 1).toUpperCase()
                              : 'B',
                          style: const TextStyle(
                            color: AppColors2026.obsidian,
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            state.userName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            '${state.userEmail} • ${state.userRole.toUpperCase()}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppColors2026.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Actualiser Cloud',
                      onPressed: () {
                        state.refreshAllData();
                        state.refreshGpsTelemetry();
                      },
                      icon: const Icon(LucideIcons.refreshCw,
                          size: 17, color: AppColors2026.goldLight),
                    ),
                    IconButton(
                      tooltip: 'Déconnexion',
                      onPressed: () {
                        Navigator.pop(ctx);
                        _confirmLogout(context, state);
                      },
                      icon: const Icon(LucideIcons.logOut,
                          size: 17, color: AppColors2026.roseLaser),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = widget.appState;
    return ListenableBuilder(
      listenable: appState,
      builder: (context, _) {
        final allowedIndices = <int>[];
        for (int i = 0; i < MainSpatialShell.sections.length; i++) {
          if (appState.isSectionAllowed(MainSpatialShell.sections[i].title)) {
            allowedIndices.add(i);
          }
        }
        final rawIndex = appState.activeTabIndex
            .clamp(0, MainSpatialShell.sections.length - 1);
        final currentIndex = allowedIndices.contains(rawIndex)
            ? rawIndex
            : (allowedIndices.isNotEmpty ? allowedIndices.first : 0);

        if (currentIndex != appState.activeTabIndex) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            appState.setActiveTab(currentIndex);
          });
        }

        final isWide = MediaQuery.of(context).size.width >= 840;

        return Scaffold(
          extendBody: true,
          backgroundColor: AppColors2026.obsidian,
          body: Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0.0, -0.95),
                radius: 1.35,
                colors: [
                  Color(0x20D4AF37),
                  AppColors2026.obsidian,
                  AppColors2026.abyss,
                ],
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Row(
                children: [
                  if (isWide)
                    _buildLuxuryNavigationRail(
                        context, appState, currentIndex, allowedIndices),
                  Expanded(
                    child: Column(
                      children: [
                        _buildLuxuryStickyHeader(context, appState),
                        if (appState.lastSyncError != null &&
                            !appState.isSyncing)
                          _buildSyncErrorBanner(appState),
                        Expanded(
                          child: IndexedStack(
                            index: currentIndex,
                            children: [
                              OverviewScreen(appState: appState),
                              FleetMapScreen(appState: appState),
                              VehiclesScreen(appState: appState),
                              ContractsScreen(appState: appState),
                              ClientsScreen(appState: appState),
                              InvoicesScreen(appState: appState),
                              RepairsScreen(appState: appState),
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
              : _buildLuxuryBottomDock(context, appState, currentIndex),
        );
      },
    );
  }

  Widget _buildSyncErrorBanner(AppStateProvider state) {
    final err = state.lastSyncError ?? '';
    final reason = err.contains('SocketException') ||
            err.contains('Failed host lookup') ||
            err.contains('ClientException')
        ? 'Pas de connexion au serveur (vérifiez Internet).'
        : err.contains('Timeout')
            ? 'Le serveur met trop de temps à répondre.'
            : err.contains('PlatformException') || err.contains('SharedPreferences')
                ? 'Connexion au serveur en cours...'
                : err;
    return Container(
      margin: const EdgeInsets.fromLTRB(14, 8, 14, 0),
      padding: const EdgeInsets.fromLTRB(12, 7, 6, 7),
      decoration: BoxDecoration(
        color: AppColors2026.roseLaser.withOpacity(0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors2026.roseLaser.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(LucideIcons.wifiOff, size: 15, color: AppColors2026.roseLaser),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Données non synchronisées : $reason',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
            ),
          ),
          TextButton(
            onPressed: () => state.retrySync(),
            child: const Text('Réessayer',
                style: TextStyle(
                    fontWeight: FontWeight.w900, color: AppColors2026.goldLight)),
          ),
        ],
      ),
    );
  }

  /// Sticky Luxury Top Header matching Canvas Screenshot (`step_104.png`)
  Widget _buildLuxuryStickyHeader(BuildContext context, AppStateProvider state) {
    final clockStr = DateFormat('HH:mm').format(_now);
    final alertCount = state.allAlerts.length;
    final companyDisplay = SupabaseSyncService.currentCompanyName.isNotEmpty
        ? SupabaseSyncService.currentCompanyName
        : 'BOUNATOURS';

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors2026.surfaceHeader,
            border: Border(
              bottom: BorderSide(
                color: AppColors2026.gold.withOpacity(0.16),
              ),
            ),
          ),
          child: Row(
            children: [
              // Brand Crest & Playfair Wordmark (Tap to return to Cockpit)
              Expanded(
                child: GestureDetector(
                  onTap: () => state.setActiveTab(0),
                  child: Row(
                    children: [
                      const LuxuryCrestEmblem(size: 42),
                      const SizedBox(width: 11),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              companyDisplay,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTheme2026.luxurySerif(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppColors2026.emeraldBright,
                                letterSpacing: 0.8,
                              ),
                            ),
                            const SizedBox(height: 1),
                            const Text(
                              'LOCATION',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 2.0,
                                color: AppColors2026.goldLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Right Status Pill: LIVE • HH:MM (Tap to refresh Cloud & GPS)
              GestureDetector(
                onTap: () {
                  state.refreshAllData();
                  state.refreshGpsTelemetry();
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF12151E),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColors2026.gold.withOpacity(0.28)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedPulseDot(
                        color: state.isSyncing
                            ? AppColors2026.goldLight
                            : AppColors2026.emeraldNeon,
                        size: 6.5,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        state.isSyncing ? 'SYNC' : 'LIVE',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFE2E8F0),
                        ),
                      ),
                      const Text(
                        ' • ',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors2026.textMuted,
                        ),
                      ),
                      Text(
                        clockStr,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: AppColors2026.goldLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Notification Bell Button with Crimson Alert Count Badge
              GestureDetector(
                onTap: () => state.setActiveTab(9),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFF12151E),
                        borderRadius: BorderRadius.circular(13),
                        border: Border.all(
                          color: state.activeTabIndex == 9
                              ? AppColors2026.gold.withOpacity(0.55)
                              : Colors.white.withOpacity(0.10),
                        ),
                      ),
                      child: const Icon(
                        LucideIcons.bell,
                        size: 16,
                        color: AppColors2026.goldLight,
                      ),
                    ),
                    if (alertCount > 0)
                      Positioned(
                        top: -4,
                        right: -4,
                        child: Container(
                          constraints: const BoxConstraints(minWidth: 17, minHeight: 17),
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(
                            color: AppColors2026.roseLaser,
                            shape: alertCount < 10 ? BoxShape.circle : BoxShape.rectangle,
                            borderRadius:
                                alertCount < 10 ? null : BorderRadius.circular(99),
                            border: Border.all(
                              color: const Color(0xFF07080C),
                              width: 1.5,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              '$alertCount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Fixed 5-Item Luxury Bottom Dock (`Cockpit`, `GPS Live`, `+`, `Véhicules`, `Gestion`)
  Widget _buildLuxuryBottomDock(
    BuildContext context,
    AppStateProvider state,
    int currentIndex,
  ) {
    final isModuleActive = currentIndex >= 3;
    final hasAlerts = state.allAlerts.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: AppColors2026.surfaceNav,
        border: Border(
          top: BorderSide(color: AppColors2026.gold.withOpacity(0.22)),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.88),
            blurRadius: 32,
            offset: const Offset(0, -10),
          ),
        ],
      ),
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: 68,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildDockItem(
                      label: 'Cockpit',
                      icon: LucideIcons.layoutGrid,
                      selected: !isModuleActive && currentIndex == 0,
                      onTap: () => state.setActiveTab(0),
                    ),
                    _buildDockItem(
                      label: 'GPS Live',
                      icon: LucideIcons.mapPin,
                      selected: !isModuleActive && currentIndex == 1,
                      onTap: () => state.setActiveTab(1),
                    ),
                    // Center Floating VIP Gold Action (+)
                    Expanded(
                      child: Center(
                        child: Transform.translate(
                          offset: const Offset(0, -14),
                          child: GestureDetector(
                            onTap: () => _openQuickCreateModal(context, state),
                            child: Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                gradient: AppColors2026.goldGradient,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.42),
                                  width: 1.2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors2026.gold.withOpacity(0.45),
                                    blurRadius: 24,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                LucideIcons.plus,
                                color: AppColors2026.obsidian,
                                size: 26,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    _buildDockItem(
                      label: 'Véhicules',
                      icon: LucideIcons.car,
                      selected: !isModuleActive && currentIndex == 2,
                      onTap: () => state.setActiveTab(2),
                    ),
                    _buildDockItem(
                      label: 'Gestion',
                      icon: LucideIcons.menu,
                      selected: isModuleActive,
                      showDot: hasAlerts,
                      onTap: () => _openGestionModal(context, state),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDockItem({
    required String label,
    required IconData icon,
    required bool selected,
    bool showDot = false,
    required VoidCallback onTap,
  }) {
    final color = selected ? AppColors2026.goldLight : AppColors2026.textSecondary;
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(icon, size: 21, color: color),
                if (showDot)
                  Positioned(
                    right: -4,
                    top: -2,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppColors2026.roseLaser,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFF080A0F),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                color: color,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLuxuryNavigationRail(
    BuildContext context,
    AppStateProvider state,
    int currentIndex,
    List<int> allowedIndices,
  ) {
    return Container(
      width: 235,
      margin: const EdgeInsets.all(12),
      child: SpatialGlassCard(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
        borderRadius: 26,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 10),
              child: Row(
                children: [
                  LuxuryCrestEmblem(size: 38),
                  SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'BONATOURS',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                            color: AppColors2026.goldLight,
                          ),
                        ),
                        Text(
                          'EXECUTIVE 2026',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: AppColors2026.emeraldNeon,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Expanded(
              child: ListView.separated(
                itemCount: allowedIndices.length,
                separatorBuilder: (_, __) => const SizedBox(height: 5),
                itemBuilder: (context, index) {
                  final originalIndex = allowedIndices[index];
                  final item = MainSpatialShell.sections[originalIndex];
                  final selected = originalIndex == currentIndex;
                  final alertBadge = item.title == 'Alertes' && state.allAlerts.isNotEmpty
                      ? state.allAlerts.length
                      : 0;

                  return InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => state.setActiveTab(originalIndex),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        color: selected
                            ? AppColors2026.gold.withOpacity(0.16)
                            : Colors.transparent,
                        border: Border.all(
                          color: selected
                              ? AppColors2026.gold.withOpacity(0.45)
                              : Colors.transparent,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            item.icon,
                            size: 18,
                            color: selected
                                ? AppColors2026.goldLight
                                : AppColors2026.textSecondary,
                          ),
                          const SizedBox(width: 11),
                          Expanded(
                            child: Text(
                              item.title,
                              style: TextStyle(
                                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                                fontSize: 13,
                                color: selected ? Colors.white : AppColors2026.textSecondary,
                              ),
                            ),
                          ),
                          if (alertBadge > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
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
}
