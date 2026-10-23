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

  // Auth State (Default: starts at LoginScreen on fresh install)
  bool _isAuthenticated = false;
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

  List<ExpenseModel> _expenses = [];
  List<ExpenseModel> get expenses => _expenses;

  double _monthlyExpensesAndRepairs = 0;
  double get monthlyExpensesAndRepairs {
    if (_monthlyExpensesAndRepairs > 0) return _monthlyExpensesAndRepairs;
    return totalMonthlyExpensesAverage;
  }

  // Traceur Customizer State (Persisted)
  Color _tracerColor = AppColors2026.cyanNeon;
  Color get tracerColor => _tracerColor;

  double _tracerWeight = 5.0;
  double get tracerWeight => _tracerWeight;

  double _tracerSize = 40.0;
  double get tracerSize => _tracerSize;

  bool _tracerGlow = true;
  bool get tracerGlow => _tracerGlow;

  Future<void> setTracerColor(Color color) async {
    _tracerColor = color;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('sft_tracer_color_int', color.toARGB32());
    } catch (_) {}
  }

  Future<void> setTracerWeight(double weight) async {
    _tracerWeight = weight;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setDouble('sft_tracer_weight', weight);
    } catch (_) {}
  }

  Future<void> setTracerSize(double size) async {
    _tracerSize = size;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setDouble('sft_tracer_size', size);
    } catch (_) {}
  }

  Future<void> setTracerGlow(bool glow) async {
    _tracerGlow = glow;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('sft_tracer_glow', glow);
    } catch (_) {}
  }

  void setFastGpsPolling(bool fast) {}

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
      if (savedAuth == true) {
        _isAuthenticated = true;
        _userEmail = prefs.getString('iloca_user_email') ?? AppConfig.superAdminEmail;
        _userName = prefs.getString('iloca_user_name') ?? 'Administrateur BonaTours';
      } else {
        _isAuthenticated = false;
      }
      try {
        final session = Supabase.instance.client.auth.currentSession;
        if (session?.user != null) {
          _userEmail = session!.user.email ?? _userEmail;
        }
      } catch (e) {
        debugPrint('[AppState] Supabase session check note: $e');
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
      final cJson = prefs.getString('cache_clients') ?? prefs.getString('iloca:clients:local');
      if (cJson != null) {
        final list = jsonDecode(cJson) as List<dynamic>;
        _clients = list.map((e) => ClientModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      final vJson = prefs.getString('cache_vehicles') ?? prefs.getString('iloca:vehicles:local');
      if (vJson != null) {
        final list = jsonDecode(vJson) as List<dynamic>;
        _vehicles = list.map((e) => VehicleModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      final kJson = prefs.getString('cache_contracts') ?? prefs.getString('iloca:contracts:local');
      if (kJson != null) {
        final list = jsonDecode(kJson) as List<dynamic>;
        _contracts = list.map((e) => ContractModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      final iJson = prefs.getString('cache_invoices') ?? prefs.getString('iloca:invoices:local');
      if (iJson != null) {
        final list = jsonDecode(iJson) as List<dynamic>;
        _invoices = list.map((e) => InvoiceModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      final eJson = prefs.getString('cache_expenses') ?? prefs.getString('iloca:expenses:local');
      if (eJson != null) {
        final list = jsonDecode(eJson) as List<dynamic>;
        _expenses = list.map((e) => ExpenseModel.fromJson(Map<String, dynamic>.from(e))).toList();
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
      await prefs.setString('cache_expenses', jsonEncode(_expenses.map((e) => e.toJson()).toList()));
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
          _expenses = await SupabaseSyncService.fetchExpenses();
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

  /// Human-readable reason of the last failed sync (null when data loaded fine).
  String? _lastSyncError;
  String? get lastSyncError => _lastSyncError;

  Future<void>? _inFlightRefresh;
  int _autoRetryAttempt = 0;
  Timer? _autoRetryTimer;

  /// High-speed parallel refresh from Supabase (Zero GPS blocking).
  /// Concurrent calls share the same in-flight request; failures are retried automatically.
  Future<void> refreshAllData() {
    return _inFlightRefresh ??=
        _doRefreshAllData().whenComplete(() => _inFlightRefresh = null);
  }

  Future<void> _doRefreshAllData() async {
    _isSyncing = true;
    notifyListeners();

    try {
      SupabaseSyncService.lastFetchError = null;
      final results = await Future.wait([
        SupabaseSyncService.fetchClients(),
        SupabaseSyncService.fetchVehicles(),
        SupabaseSyncService.fetchContracts(),
        SupabaseSyncService.fetchInvoices(),
        SupabaseSyncService.fetchExpenses(),
        SupabaseSyncService.fetchMonthlyExpensesAndRepairs(),
      ]).timeout(const Duration(seconds: 40));

      final fetchedClients = results[0] as List<ClientModel>;
      final fetchedVehicles = results[1] as List<VehicleModel>;
      final fetchedContracts = results[2] as List<ContractModel>;
      final fetchedInvoices = results[3] as List<InvoiceModel>;
      final fetchedExpenses = results[4] as List<ExpenseModel>;
      final fetchedMonthly = results[5] as double;

      if (fetchedClients.isNotEmpty || _clients.isEmpty) {
        _clients = fetchedClients;
      }
      if (fetchedVehicles.isNotEmpty || _vehicles.isEmpty) {
        _vehicles = fetchedVehicles;
      }
      if (fetchedContracts.isNotEmpty || _contracts.isEmpty) {
        _contracts = fetchedContracts;
      }
      if (fetchedInvoices.isNotEmpty || _invoices.isEmpty) {
        _invoices = fetchedInvoices;
      }
      if (fetchedExpenses.isNotEmpty || _expenses.isEmpty) {
        _expenses = fetchedExpenses;
      }
      if (fetchedMonthly > 0 || _monthlyExpensesAndRepairs == 0) {
        _monthlyExpensesAndRepairs = fetchedMonthly;
      }

      _syncVehiclesWithActiveContracts();
      _lastSyncError = SupabaseSyncService.lastFetchError;
      if (_lastSyncError == null) {
        _lastSyncTime = DateTime.now();
        _autoRetryAttempt = 0;
      }
      await _saveToLocalCache();
    } catch (e) {
      _lastSyncError = e.toString();
      debugPrint('[AppState] refreshAllData error: $e');
    } finally {
      _isSyncing = false;
      notifyListeners();
    }

    if (_lastSyncError != null) _scheduleAutoRetry();
  }

  /// Retries a failed sync with backoff (3s, 8s, 15s, 30s) — e.g. when the
  /// phone's network is not ready yet right after launch / login.
  void _scheduleAutoRetry() {
    const delays = [3, 8, 15, 30];
    if (_autoRetryAttempt >= delays.length || !_isAuthenticated) return;
    final delay = Duration(seconds: delays[_autoRetryAttempt]);
    _autoRetryAttempt++;
    _autoRetryTimer?.cancel();
    _autoRetryTimer = Timer(delay, () {
      if (_isAuthenticated) refreshAllData();
    });
  }

  /// Manual retry from the UI (resets the backoff counter).
  Future<void> retrySync() {
    _autoRetryAttempt = 0;
    _autoRetryTimer?.cancel();
    return refreshAllData();
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

    // 1. Immediately activate authenticated session for instant 0ms transition
    _isAuthenticated = true;
    _userEmail = cleanEmail;
    _userName = cleanEmail.contains('@')
        ? cleanEmail.split('@').first.toUpperCase()
        : 'BonaTours';

    notifyListeners();

    // 2. Persist state safely
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('iloca_authenticated', true);
      await prefs.setString('iloca_user_email', _userEmail);
      await prefs.setString('iloca_user_name', _userName);
    } catch (e) {
      debugPrint('[AppState] Persist login note: $e');
    }

    // 3. Background server auth & parallel cloud sync (zero UI blocking)
    unawaited(_performBackgroundAuthAndSync(cleanEmail, cleanPass));

    return true;
  }

  Future<void> _performBackgroundAuthAndSync(String email, String password) async {
    // 1. Trigger immediate parallel data fetch right away without waiting for auth
    final initialRefresh = refreshAllData();

    // 2. Authenticate with Supabase in parallel
    try {
      final res = await Supabase.instance.client.auth
          .signInWithPassword(email: email, password: password)
          .timeout(const Duration(seconds: 4));
      if (res.user != null) {
        _userEmail = res.user!.email ?? email;
        _userName = res.user!.userMetadata?['full_name']?.toString() ?? _userName;
        try {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('iloca_user_email', _userEmail);
          await prefs.setString('iloca_user_name', _userName);
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('[AppState] Background auth note: $e');
    }

    // 3. Ensure initial refresh completes and Realtime subscriptions are active
    try {
      await initialRefresh;
      _setupRealtimeSubscriptions();
    } catch (e) {
      debugPrint('[AppState] Background refresh error: $e');
    }
  }

  Future<void> logout() async {
    // 1. Immediately switch auth state & notify UI (0ms transition)
    _isAuthenticated = false;
    _autoRetryTimer?.cancel();
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

  Future<void> saveExpense(ExpenseModel expense, {bool isEdit = false}) async {
    final saved = await SupabaseSyncService.saveExpense(expense);
    if (isEdit) {
      _expenses = _expenses.map((e) => e.id == saved.id ? saved : e).toList();
    } else {
      _expenses = [saved, ..._expenses.where((e) => e.id != saved.id)];
    }
    _lastSyncTime = DateTime.now();
    _saveToLocalCache();
    notifyListeners();
  }

  Future<void> deleteExpense(String id) async {
    _expenses = _expenses.where((e) => e.id != id).toList();
    _saveToLocalCache();
    notifyListeners();
    await SupabaseSyncService.deleteExpense(id);
  }

  double get totalExpensesAmount {
    return _expenses.fold(0.0, (acc, e) => acc + e.totalCost);
  }

  double get totalMonthlyExpensesAverage {
    return _expenses.fold(0.0, (acc, e) => acc + e.monthlyCost);
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

    // 6. Échéances des Charges Flotte (Assurance, Visite Tech, Vignette)
    for (final exp in _expenses) {
      if (!exp.archived && exp.endDate.isNotEmpty) {
        final end = DateTime.tryParse(exp.endDate);
        if (end != null) {
          final daysLeft = end.difference(now).inDays;
          final veh = _vehicles.where((v) => v.id == exp.vehicleId).firstOrNull?.fullName ?? 'Flotte BonaTours';
          if (daysLeft < 0) {
            computed.add(AlertItemModel(
              id: 'exp_exp_${exp.id}',
              severity: 'critical',
              title: 'Échéance expirée : ${exp.typeLabel}',
              message: '${exp.typeLabel} pour $veh a expiré depuis ${daysLeft.abs()} jour(s).',
              date: exp.endDate,
              vehicleName: veh,
              source: 'finance',
            ));
          } else if (daysLeft <= 15) {
            computed.add(AlertItemModel(
              id: 'exp_soon_${exp.id}',
              severity: 'warning',
              title: 'Échéance imminente : ${exp.typeLabel}',
              message: 'Renouvellement de ${exp.typeLabel} pour $veh dans $daysLeft jour(s).',
              date: exp.endDate,
              vehicleName: veh,
              source: 'finance',
            ));
          }
        }
      }
    }

    return computed;
  }

  @override
  void dispose() {
    _autoRetryTimer?.cancel();
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }
}
