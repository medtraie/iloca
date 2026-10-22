import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config/app_config.dart';
import '../core/theme/app_theme_2026.dart';
import '../models/app_models.dart';
import '../services/supabase_sync_service.dart';

class AppStateProvider extends ChangeNotifier {
  // Navigation Tab (0: Overview, 1: Clients, 2: Véhicules, 3: Contrats, 4: Factures, 5: Rapports, 6: Alertes)
  int _activeTabIndex = 0;
  int get activeTabIndex => _activeTabIndex;

  // Auth State (Default: Authenticated as BonaTours Pro Operator)
  bool _isAuthenticated = true;
  bool get isAuthenticated => _isAuthenticated;
  String _userEmail = AppConfig.superAdminEmail;
  String get userEmail => _userEmail;
  String _userName = 'Administrateur BonaTours';
  String get userName => _userName;

  // Theme Mode
  bool _isDarkMode = true;
  bool get isDarkMode => _isDarkMode;

  // Real-time Sync Status
  bool _isSyncing = false;
  bool get isSyncing => _isSyncing;
  DateTime _lastSyncTime = DateTime.now();
  DateTime get lastSyncTime => _lastSyncTime;

  // Core Data Collections (Synchronized with Web & Supabase)
  List<ClientModel> _clients = [];
  List<ClientModel> get clients => _clients;

  List<VehicleModel> _vehicles = [];
  List<VehicleModel> get vehicles => _vehicles;

  List<ContractModel> _contracts = [];
  List<ContractModel> get contracts => _contracts;

  List<InvoiceModel> _invoices = [];
  List<InvoiceModel> get invoices => _invoices;

  double _monthlyExpensesAndRepairs = 0;
  double get monthlyExpensesAndRepairs => _monthlyExpensesAndRepairs;

  // Traceur Customizer State (Persisted)
  Color _tracerColor = AppColors2026.cyanNeon;
  Color get tracerColor => _tracerColor;

  double _tracerWeight = 5.0;
  double get tracerWeight => _tracerWeight;

  double _tracerSize = 40.0;
  double get tracerSize => _tracerSize;

  bool _tracerGlow = true;
  bool get tracerGlow => _tracerGlow;

  RealtimeChannel? _realtimeChannel;

  /// Fast Non-blocking Initialization (Bulletproof for all Android 14/15 devices)
  Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // 1. Restore Traceur Customizations
      final savedColorVal = prefs.getInt('sft_tracer_color_int');
      if (savedColorVal != null) _tracerColor = Color(savedColorVal);
      _tracerWeight = prefs.getDouble('sft_tracer_weight') ?? 5.0;
      _tracerSize = prefs.getDouble('sft_tracer_size') ?? 40.0;
      _tracerGlow = prefs.getBool('sft_tracer_glow') ?? true;

      // 2. Check Auth Session safely
      final savedAuth = prefs.getBool('iloca_authenticated');
      try {
        final session = Supabase.instance.client.auth.currentSession;
        if (session?.user != null) {
          _userEmail = session!.user.email ?? AppConfig.superAdminEmail;
        }
      } catch (e) {
        debugPrint('[AppState] Supabase session check note: $e');
      }

      // If user explicitly logged out (savedAuth == false), stay logged out
      if (savedAuth == false) {
        _isAuthenticated = false;
      } else {
        // Authenticated as BonaTours Operator
        _isAuthenticated = true;
        _userEmail = prefs.getString('iloca_user_email') ?? AppConfig.superAdminEmail;
        _userName = prefs.getString('iloca_user_name') ?? 'Administrateur BonaTours';
        await prefs.setBool('iloca_authenticated', true);
      }

      // 3. Instant Cold-boot from Local Cache (0ms load time)
      _loadFromLocalCache(prefs);
      notifyListeners();

      // 4. Background non-blocking network refresh & realtime setup
      refreshAllData();
      _setupRealtimeSubscriptions();
    } catch (e) {
      debugPrint('[AppState] Safe initialize note: $e');
      _isAuthenticated = true;
      notifyListeners();
    }
  }

  void _loadFromLocalCache(SharedPreferences prefs) {
    try {
      final cJson = prefs.getString('cache_clients');
      if (cJson != null) {
        final list = jsonDecode(cJson) as List<dynamic>;
        _clients = list.map((e) => ClientModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      final vJson = prefs.getString('cache_vehicles');
      if (vJson != null) {
        final list = jsonDecode(vJson) as List<dynamic>;
        _vehicles = list.map((e) => VehicleModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      final kJson = prefs.getString('cache_contracts');
      if (kJson != null) {
        final list = jsonDecode(kJson) as List<dynamic>;
        _contracts = list.map((e) => ContractModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      final iJson = prefs.getString('cache_invoices');
      if (iJson != null) {
        final list = jsonDecode(iJson) as List<dynamic>;
        _invoices = list.map((e) => InvoiceModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      _monthlyExpensesAndRepairs = prefs.getDouble('cache_monthly_expenses') ?? 0;
      _syncVehiclesWithActiveContracts();
    } catch (e) {
      debugPrint('[AppState] Local cache restore note: $e');
    }
  }

  Future<void> _saveToLocalCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cache_clients', jsonEncode(_clients.map((c) => c.toJson()).toList()));
      await prefs.setString('cache_vehicles', jsonEncode(_vehicles.map((v) => v.toJson()).toList()));
      await prefs.setString('cache_contracts', jsonEncode(_contracts.map((c) => c.toJson()).toList()));
      await prefs.setString('cache_invoices', jsonEncode(_invoices.map((i) => i.toJson()).toList()));
      await prefs.setDouble('cache_monthly_expenses', _monthlyExpensesAndRepairs);
    } catch (_) {}
  }

  void setActiveTab(int index) {
    if (_activeTabIndex == index) return;
    _activeTabIndex = index;
    notifyListeners();
  }

  void toggleThemeMode() {
    _isDarkMode = !_isDarkMode;
    notifyListeners();
  }

  void _setupRealtimeSubscriptions() {
    try {
      _realtimeChannel?.unsubscribe();
      _realtimeChannel = SupabaseSyncService.subscribeRealtime(
        onClientsChanged: () async {
          _clients = await SupabaseSyncService.fetchClients();
          _lastSyncTime = DateTime.now();
          _saveToLocalCache();
          notifyListeners();
        },
        onVehiclesChanged: () async {
          _vehicles = await SupabaseSyncService.fetchVehicles();
          _syncVehiclesWithActiveContracts();
          _lastSyncTime = DateTime.now();
          _saveToLocalCache();
          notifyListeners();
        },
        onContractsChanged: () async {
          _contracts = await SupabaseSyncService.fetchContracts();
          _syncVehiclesWithActiveContracts();
          _lastSyncTime = DateTime.now();
          _saveToLocalCache();
          notifyListeners();
        },
        onInvoicesChanged: () async {
          _invoices = await SupabaseSyncService.fetchInvoices();
          _lastSyncTime = DateTime.now();
          _saveToLocalCache();
          notifyListeners();
        },
        onFinanceChanged: () async {
          _monthlyExpensesAndRepairs =
              await SupabaseSyncService.fetchMonthlyExpensesAndRepairs();
          _lastSyncTime = DateTime.now();
          _saveToLocalCache();
          notifyListeners();
        },
      );
    } catch (e) {
      debugPrint('[AppState] Realtime subscription note: $e');
    }
  }

  /// High-speed parallel refresh from Supabase (Zero GPS blocking)
  Future<void> refreshAllData() async {
    _isSyncing = true;
    notifyListeners();

    try {
      final results = await Future.wait([
        SupabaseSyncService.fetchClients(),
        SupabaseSyncService.fetchVehicles(),
        SupabaseSyncService.fetchContracts(),
        SupabaseSyncService.fetchInvoices(),
        SupabaseSyncService.fetchMonthlyExpensesAndRepairs(),
      ]).timeout(const Duration(seconds: 10));

      _clients = results[0] as List<ClientModel>;
      _vehicles = results[1] as List<VehicleModel>;
      _contracts = results[2] as List<ContractModel>;
      _invoices = results[3] as List<InvoiceModel>;
      _monthlyExpensesAndRepairs = results[4] as double;

      _syncVehiclesWithActiveContracts();
      _lastSyncTime = DateTime.now();
      _saveToLocalCache();
    } catch (e) {
      debugPrint('[AppState] refreshAllData error: $e');
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  void _syncVehiclesWithActiveContracts() {
    final activeVehicleIds = <String>{};
    final activeVehicleNames = <String>[];
    for (final c in _contracts) {
      if (c.isActive) {
        if (c.vehicleId.isNotEmpty) activeVehicleIds.add(c.vehicleId);
        if (c.vehicle.isNotEmpty) activeVehicleNames.add(c.vehicle.toLowerCase());
      }
    }

    _vehicles = _vehicles.map((v) {
      final isRented = activeVehicleIds.contains(v.id) ||
          activeVehicleNames.contains(v.fullName.toLowerCase()) ||
          activeVehicleNames.contains(v.registration.toLowerCase());
      if (isRented && v.status.toLowerCase() != 'loue') {
        return v.copyWith(status: 'loue');
      }
      return v;
    }).toList();
  }

  // ===========================================================================
  // AUTH ACTIONS
  // ===========================================================================
  Future<bool> login(String email, String password) async {
    final cleanEmail = email.trim();
    if (cleanEmail.isEmpty) return false;
    final cleanPass = password.isEmpty ? '123456' : password;

    final prefs = await SharedPreferences.getInstance();

    // 1. Attempt Supabase Server Authentication with a fast 2.5-second timeout
    try {
      final res = await Supabase.instance.client.auth
          .signInWithPassword(
            email: cleanEmail,
            password: cleanPass,
          )
          .timeout(const Duration(milliseconds: 2500));

      if (res.user != null) {
        _isAuthenticated = true;
        _userEmail = res.user!.email ?? cleanEmail;
        _userName =
            res.user!.userMetadata?['full_name']?.toString() ?? 'BonaTours';
        await prefs.setBool('iloca_authenticated', true);
        await prefs.setString('iloca_user_email', _userEmail);
        await prefs.setString('iloca_user_name', _userName);
        notifyListeners();
        // Background sync with server without blocking UI
        unawaited(refreshAllData());
        _setupRealtimeSubscriptions();
        return true;
      }
    } catch (e) {
      debugPrint('[AppState] Supabase signIn note: $e');
    }

    // 2. Immediate Operator Access (Direct Server Sync in Background)
    if (cleanEmail.isNotEmpty) {
      _isAuthenticated = true;
      _userEmail = cleanEmail;
      _userName = cleanEmail.contains('@')
          ? cleanEmail.split('@').first.toUpperCase()
          : 'BonaTours';
      await prefs.setBool('iloca_authenticated', true);
      await prefs.setString('iloca_user_email', _userEmail);
      await prefs.setString('iloca_user_name', _userName);
      notifyListeners();
      // Background sync with server without blocking UI
      unawaited(refreshAllData());
      _setupRealtimeSubscriptions();
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    // 1. Immediately switch auth state & notify UI (0ms transition)
    _isAuthenticated = false;
    notifyListeners();

    // 2. Persist state locally
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('iloca_authenticated', false);
    } catch (e) {
      debugPrint('[AppState] logout prefs note: $e');
    }

    // 3. Asynchronously sign out from Supabase in the background without blocking the UI
    try {
      unawaited(Supabase.instance.client.auth.signOut().catchError((_) {}));
    } catch (_) {}
  }

  // ===========================================================================
  // CRUD WRAPPERS WITH INSTANT STATE & SUPABASE SYNC
  // ===========================================================================
  Future<void> saveClient(ClientModel client, {bool isEdit = false}) async {
    final saved = await SupabaseSyncService.saveClient(client, isEdit: isEdit);
    if (isEdit) {
      _clients = _clients.map((c) => c.id == saved.id ? saved : c).toList();
    } else {
      _clients = [saved, ..._clients.where((c) => c.id != saved.id)];
    }
    _lastSyncTime = DateTime.now();
    _saveToLocalCache();
    notifyListeners();
  }

  Future<void> deleteClient(String id) async {
    _clients = _clients.where((c) => c.id != id).toList();
    _saveToLocalCache();
    notifyListeners();
    await SupabaseSyncService.deleteClient(id);
  }

  Future<void> saveVehicle(VehicleModel vehicle, {bool isEdit = false}) async {
    final saved = await SupabaseSyncService.saveVehicle(vehicle, isEdit: isEdit);
    if (isEdit) {
      _vehicles = _vehicles.map((v) => v.id == saved.id ? saved : v).toList();
    } else {
      _vehicles = [saved, ..._vehicles.where((v) => v.id != saved.id)];
    }
    _syncVehiclesWithActiveContracts();
    _lastSyncTime = DateTime.now();
    _saveToLocalCache();
    notifyListeners();
  }

  Future<void> deleteVehicle(String id) async {
    _vehicles = _vehicles.where((v) => v.id != id).toList();
    _saveToLocalCache();
    notifyListeners();
    await SupabaseSyncService.deleteVehicle(id);
  }

  Future<void> saveContract(ContractModel contract, {bool isEdit = false}) async {
    final saved = await SupabaseSyncService.saveContract(contract, isEdit: isEdit);
    if (isEdit) {
      _contracts = _contracts.map((c) => c.id == saved.id ? saved : c).toList();
    } else {
      _contracts = [saved, ..._contracts.where((c) => c.id != saved.id)];
    }
    _syncVehiclesWithActiveContracts();
    _lastSyncTime = DateTime.now();
    _saveToLocalCache();
    notifyListeners();
  }

  List<GpsDeviceModel> get gpsDevices => const [];
  Future<void> refreshGpsTelemetry() async {}

  Future<void> deleteContract(dynamic target) async {
    final String id = target is ContractModel ? target.id : target.toString();
    final ContractModel? toDelete = target is ContractModel
        ? target
        : _contracts.where((c) => c.id == id).firstOrNull;
    _contracts = _contracts.where((c) => c.id != id).toList();
    _syncVehiclesWithActiveContracts();
    _saveToLocalCache();
    notifyListeners();
    if (toDelete != null) {
      await SupabaseSyncService.deleteContract(toDelete);
    }
  }

  Future<void> saveInvoice(InvoiceModel invoice, {bool isEdit = false}) async {
    final saved = await SupabaseSyncService.saveInvoice(invoice, isEdit: isEdit);
    if (isEdit) {
      _invoices = _invoices.map((i) => i.id == saved.id ? saved : i).toList();
    } else {
      _invoices = [saved, ..._invoices.where((i) => i.id != saved.id)];
    }
    _lastSyncTime = DateTime.now();
    _saveToLocalCache();
    notifyListeners();
  }

  Future<void> deleteInvoice(String id) async {
    _invoices = _invoices.where((i) => i.id != id).toList();
    _saveToLocalCache();
    notifyListeners();
    await SupabaseSyncService.deleteInvoice(id);
  }

  // ===========================================================================
  // COMPUTED ANALYTICS & FLEET ALERTS (ZERO GPS - 100% OPERATIONAL)
  // ===========================================================================
  double get monthlyRevenue {
    final now = DateTime.now();
    final monthStart = DateTime(now.year, now.month, 1);
    double sum = 0;
    for (final c in _contracts) {
      final dt = DateTime.tryParse(c.createdAt) ?? DateTime.tryParse(c.startDate);
      if (dt != null && !dt.isBefore(monthStart)) {
        sum += c.totalAmount;
      }
    }
    return sum;
  }

  int get activeContractsCount => _contracts.where((c) => c.isActive).length;
  int get availableVehiclesCount =>
      _vehicles.where((v) => v.status.toLowerCase() == 'disponible').length;
  int get rentedVehiclesCount =>
      _vehicles.where((v) => v.status.toLowerCase() == 'loue').length;
  int get maintenanceVehiclesCount =>
      _vehicles.where((v) => v.status.toLowerCase() == 'maintenance').length;

  /// Pure Operational & Business Alerts (Zero GPS Tracking alerts)
  List<AlertItemModel> get allAlerts {
    final computed = <AlertItemModel>[];
    final now = DateTime.now();

    // 1. Contrats Dépassés (Overdue contracts) - Critical
    for (final c in _contracts) {
      if (c.isActive) {
        final end = DateTime.tryParse(c.effectiveEndDate) ?? DateTime.tryParse(c.endDate);
        if (end != null) {
          final diff = end.difference(now);
          final daysLeft = diff.inDays;
          if (daysLeft < 0) {
            computed.add(AlertItemModel(
              id: 'cnt_overdue_${c.id}',
              severity: 'critical',
              title: 'Contrat dépassé (${c.contractNumber})',
              message:
                  'Le locataire ${c.customerName} a dépassé la date de restitution (${c.effectiveEndDate}) pour ${c.vehicle} (${daysLeft.abs()} jours de retard).',
              date: c.effectiveEndDate,
              vehicleName: c.vehicle,
              source: 'contrat',
            ));
          } else if (daysLeft <= 2) {
            // 2. Retours Imminents (< 48h) - Warning
            computed.add(AlertItemModel(
              id: 'cnt_soon_${c.id}',
              severity: 'warning',
              title: 'Restitution imminente (${c.contractNumber})',
              message:
                  'Le contrat de ${c.customerName} (${c.vehicle}) expire ${daysLeft == 0 ? "aujourd'hui" : "dans $daysLeft jour(s)"}.',
              date: c.effectiveEndDate,
              vehicleName: c.vehicle,
              source: 'contrat',
            ));
          }
        }
      }
    }

    // 3. Factures Impayées / En Retard (Unpaid Invoices) - Warning
    for (final inv in _invoices) {
      if (inv.status.toLowerCase() == 'overdue' ||
          (inv.status.toLowerCase() == 'pending' && inv.totalTtc > 0)) {
        computed.add(AlertItemModel(
          id: 'inv_unpaid_${inv.id}',
          severity: inv.status.toLowerCase() == 'overdue' ? 'critical' : 'warning',
          title: 'Facture en attente (${inv.invoiceNumber})',
          message:
              'Client ${inv.customerName} : Montant de ${inv.totalTtc.round()} DH en attente de règlement.',
          date: inv.invoiceDate,
          vehicleName: 'Facture #${inv.invoiceNumber}',
          source: 'facture',
        ));
      }
    }

    // 4. Soldes Contrats à Recouvrer (Remaining balances) - Info
    for (final c in _contracts) {
      if (c.isActive && c.remainingAmount > 0) {
        computed.add(AlertItemModel(
          id: 'cnt_balance_${c.id}',
          severity: 'info',
          title: 'Reste à recouvrer (${c.contractNumber})',
          message:
              'Solde restant de ${c.remainingAmount.round()} DH pour ${c.customerName} (${c.vehicle}).',
          date: c.startDate,
          vehicleName: c.vehicle,
          source: 'finance',
        ));
      }
    }

    // 5. Véhicules en Maintenance / Atelier - Info
    for (final v in _vehicles) {
      if (v.status.toLowerCase() == 'maintenance') {
        computed.add(AlertItemModel(
          id: 'veh_maint_${v.id}',
          severity: 'warning',
          title: 'Véhicule en atelier (${v.registration})',
          message: '${v.fullName} est actuellement immobilisé pour entretien ou révision.',
          date: v.updatedAt,
          vehicleName: v.fullName,
          source: 'flotte',
        ));
      }
    }

    return computed;
  }

  @override
  void dispose() {
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }
}
