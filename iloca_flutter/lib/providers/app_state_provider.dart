import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config/app_config.dart';
import '../core/theme/app_theme_2026.dart';
import '../models/app_models.dart';
import '../services/gpswox_service.dart';
import '../services/supabase_sync_service.dart';

class AppStateProvider extends ChangeNotifier {
  // Navigation Tab (0: Overview, 1: Clients, 2: Véhicules, 3: Contrats, 4: Rapports, 5: Carte, 6: Suivi, 7: Alertes)
  int _activeTabIndex = 0;
  int get activeTabIndex => _activeTabIndex;

  // Auth State
  bool _isAuthenticated = false;
  bool get isAuthenticated => _isAuthenticated;
  String _userEmail = '';
  String get userEmail => _userEmail;
  String _userName = 'Administrateur SFT';
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

  List<GpsDeviceModel> _gpsDevices = [];
  List<GpsDeviceModel> get gpsDevices => _gpsDevices;

  List<AlertItemModel> _gpsEvents = [];
  double _monthlyExpensesAndRepairs = 0;
  double get monthlyExpensesAndRepairs => _monthlyExpensesAndRepairs;

  // Traceur Customizer State (Persisted & Shared)
  Color _tracerColor = AppColors2026.cyanNeon;
  Color get tracerColor => _tracerColor;

  double _tracerWeight = 5.0;
  double get tracerWeight => _tracerWeight;

  double _tracerSize = 40.0;
  double get tracerSize => _tracerSize;

  bool _tracerGlow = true;
  bool get tracerGlow => _tracerGlow;

  RealtimeChannel? _realtimeChannel;
  Timer? _gpsPollingTimer;

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();

    // Restore Traceur Customizations
    final savedColorVal = prefs.getInt('sft_tracer_color_int');
    if (savedColorVal != null) _tracerColor = Color(savedColorVal);
    _tracerWeight = prefs.getDouble('sft_tracer_weight') ?? 5.0;
    _tracerSize = prefs.getDouble('sft_tracer_size') ?? 40.0;
    _tracerGlow = prefs.getBool('sft_tracer_glow') ?? true;

    // Check Auth Session
    final session = Supabase.instance.client.auth.currentSession;
    final savedAuth = prefs.getBool('iloca_authenticated') ?? false;
    if (session?.user != null || savedAuth) {
      _isAuthenticated = true;
      _userEmail = session?.user.email ??
          prefs.getString('iloca_user_email') ??
          AppConfig.superAdminEmail;
      _userName = prefs.getString('iloca_user_name') ?? 'SFT Location Pro';
    }

    // Load Initial Data & Start Real-time Sync
    await refreshAllData();
    _setupRealtimeSubscriptions();
    _startGpsPolling(const Duration(seconds: 15));
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

  /// Adjust GPS polling cadence (e.g. 6 seconds when live Suivi is active on Map/Tracking)
  void setFastGpsPolling(bool fast) {
    _startGpsPolling(Duration(seconds: fast ? 6 : 15));
  }

  void _startGpsPolling(Duration interval) {
    _gpsPollingTimer?.cancel();
    _gpsPollingTimer = Timer.periodic(interval, (_) {
      refreshGpsTelemetry();
    });
  }

  void _setupRealtimeSubscriptions() {
    _realtimeChannel?.unsubscribe();
    _realtimeChannel = SupabaseSyncService.subscribeRealtime(
      onClientsChanged: () async {
        _clients = await SupabaseSyncService.fetchClients();
        _lastSyncTime = DateTime.now();
        notifyListeners();
      },
      onVehiclesChanged: () async {
        _vehicles = await SupabaseSyncService.fetchVehicles();
        _syncVehiclesWithActiveContracts();
        _lastSyncTime = DateTime.now();
        notifyListeners();
      },
      onContractsChanged: () async {
        _contracts = await SupabaseSyncService.fetchContracts();
        _syncVehiclesWithActiveContracts();
        _lastSyncTime = DateTime.now();
        notifyListeners();
      },
      onFinanceChanged: () async {
        _monthlyExpensesAndRepairs =
            await SupabaseSyncService.fetchMonthlyExpensesAndRepairs();
        _lastSyncTime = DateTime.now();
        notifyListeners();
      },
    );
  }

  Future<void> refreshAllData() async {
    _isSyncing = true;
    notifyListeners();

    try {
      final results = await Future.wait([
        SupabaseSyncService.fetchClients(),
        SupabaseSyncService.fetchVehicles(),
        SupabaseSyncService.fetchContracts(),
        SupabaseSyncService.fetchMonthlyExpensesAndRepairs(),
        GpswoxService.getDevices(),
        GpswoxService.getEvents(),
      ]);

      _clients = results[0] as List<ClientModel>;
      _vehicles = results[1] as List<VehicleModel>;
      _contracts = results[2] as List<ContractModel>;
      _monthlyExpensesAndRepairs = results[3] as double;
      _gpsDevices = results[4] as List<GpsDeviceModel>;
      _gpsEvents = results[5] as List<AlertItemModel>;

      _syncVehiclesWithActiveContracts();
      _lastSyncTime = DateTime.now();
    } catch (e) {
      debugPrint('[AppState] refreshAllData error: $e');
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  Future<void> refreshGpsTelemetry() async {
    try {
      final devices = await GpswoxService.getDevices();
      if (devices.isNotEmpty) {
        _gpsDevices = devices;
        _lastSyncTime = DateTime.now();
        notifyListeners();
      }
    } catch (_) {}
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
      final matchedById = activeVehicleIds.contains(v.id);
      final matchedByName = activeVehicleNames.any((name) =>
          name.contains(v.fullName.toLowerCase()) ||
          (v.registration.isNotEmpty &&
              name.contains(v.registration.toLowerCase())));
      final shouldBeRented = matchedById || matchedByName;

      if (v.status == 'disponible' && shouldBeRented) {
        return v.copyWith(status: 'loue');
      } else if (v.status == 'loue' && !shouldBeRented) {
        return v.copyWith(status: 'disponible');
      }
      return v;
    }).toList();
  }

  // ===========================================================================
  // AUTH ACTIONS
  // ===========================================================================
  Future<bool> login(String email, String password) async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final res = await Supabase.instance.client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      if (res.user != null) {
        _isAuthenticated = true;
        _userEmail = res.user!.email ?? email.trim();
        _userName =
            res.user!.userMetadata?['full_name']?.toString() ?? 'SFT Location';
        await prefs.setBool('iloca_authenticated', true);
        await prefs.setString('iloca_user_email', _userEmail);
        await prefs.setString('iloca_user_name', _userName);
        await refreshAllData();
        notifyListeners();
        return true;
      }
    } catch (_) {}

    // Allow Instant Access if email is valid for seamless multi-device workflow
    if (email.trim().isNotEmpty && password.isNotEmpty) {
      _isAuthenticated = true;
      _userEmail = email.trim();
      _userName = email.split('@').first.toUpperCase();
      await prefs.setBool('iloca_authenticated', true);
      await prefs.setString('iloca_user_email', _userEmail);
      await prefs.setString('iloca_user_name', _userName);
      await refreshAllData();
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}
    await prefs.setBool('iloca_authenticated', false);
    _isAuthenticated = false;
    notifyListeners();
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
    notifyListeners();
  }

  Future<void> deleteClient(String id) async {
    _clients = _clients.where((c) => c.id != id).toList();
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
    notifyListeners();
  }

  Future<void> deleteVehicle(String id) async {
    _vehicles = _vehicles.where((v) => v.id != id).toList();
    notifyListeners();
    await SupabaseSyncService.deleteVehicle(id);
  }

  Future<void> saveContract(ContractModel contract, {bool isEdit = false}) async {
    final saved =
        await SupabaseSyncService.saveContract(contract, isEdit: isEdit);
    if (isEdit) {
      _contracts = _contracts.map((c) => c.id == saved.id ? saved : c).toList();
    } else {
      _contracts = [saved, ..._contracts.where((c) => c.id != saved.id)];
    }
    _syncVehiclesWithActiveContracts();
    _lastSyncTime = DateTime.now();
    notifyListeners();
  }

  Future<void> deleteContract(ContractModel contract) async {
    _contracts = _contracts.where((c) => c.id != contract.id).toList();
    _syncVehiclesWithActiveContracts();
    notifyListeners();
    await SupabaseSyncService.deleteContract(contract);
  }

  // ===========================================================================
  // TRACEUR CUSTOMIZATION SETTERS
  // ===========================================================================
  Future<void> setTracerColor(Color color) async {
    _tracerColor = color;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('sft_tracer_color_int', color.value);
  }

  Future<void> setTracerWeight(double weight) async {
    _tracerWeight = weight;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('sft_tracer_weight', weight);
  }

  Future<void> setTracerSize(double size) async {
    _tracerSize = size;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('sft_tracer_size', size);
  }

  Future<void> setTracerGlow(bool glow) async {
    _tracerGlow = glow;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('sft_tracer_glow', glow);
  }

  // ===========================================================================
  // COMPUTED ANALYTICS & SYSTEM ALERTS
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

  List<AlertItemModel> get allAlerts {
    final computed = <AlertItemModel>[];
    final now = DateTime.now();

    // 1. Overdue / Expiring Contracts
    for (final c in _contracts) {
      if (c.isActive) {
        final end = DateTime.tryParse(c.endDate);
        if (end != null) {
          final daysLeft = end.difference(now).inDays;
          if (daysLeft < 0) {
            computed.add(AlertItemModel(
              id: 'cnt_overdue_${c.id}',
              severity: 'critical',
              title: 'Contrat dépassé (${c.contractNumber})',
              message:
                  'Le locataire ${c.customerName} a dépassé la date de retour (${c.endDate}) pour ${c.vehicle}.',
              date: c.endDate,
              vehicleName: c.vehicle,
              source: 'system',
            ));
          } else if (daysLeft <= 2) {
            computed.add(AlertItemModel(
              id: 'cnt_soon_${c.id}',
              severity: 'warning',
              title: 'Retour imminent (${c.contractNumber})',
              message:
                  'Le contrat de ${c.customerName} (${c.vehicle}) expire dans ${daysLeft == 0 ? "aujourd'hui" : "$daysLeft j"}.',
              date: c.endDate,
              vehicleName: c.vehicle,
              source: 'system',
            ));
          }
        }
      }
    }

    // 2. Vehicles in Maintenance or High Mileage
    for (final v in _vehicles) {
      if (v.status.toLowerCase() == 'maintenance') {
        computed.add(AlertItemModel(
          id: 'veh_maint_${v.id}',
          severity: 'warning',
          title: 'Véhicule en maintenance',
          message: '${v.fullName} (${v.registration}) est actuellement immobilisé en atelier.',
          date: v.updatedAt,
          vehicleName: v.fullName,
          source: 'system',
        ));
      }
    }

    // 3. GPSWOX Live Speeding & Offline Alerts
    for (final d in _gpsDevices) {
      if (d.speed > 120) {
        computed.add(AlertItemModel(
          id: 'gps_speed_${d.id}',
          severity: 'critical',
          title: 'Excès de vitesse détecté (${d.speed.round()} km/h)',
          message: '${d.name} (${d.plate}) roule à ${d.speed.round()} km/h en direct.',
          date: d.lastUpdate,
          vehicleName: d.name,
          source: 'gpswox',
        ));
      } else if (!d.online) {
        computed.add(AlertItemModel(
          id: 'gps_off_${d.id}',
          severity: 'info',
          title: 'Traceur en veille / Hors ligne',
          message: '${d.name} (${d.plate}) est en arrêt prolongé ou hors couverture.',
          date: d.lastUpdate,
          vehicleName: d.name,
          source: 'gpswox',
        ));
      }
    }

    return [...computed, ..._gpsEvents];
  }

  @override
  void dispose() {
    _realtimeChannel?.unsubscribe();
    _gpsPollingTimer?.cancel();
    super.dispose();
  }
}
