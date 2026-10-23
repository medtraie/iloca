import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../core/config/app_config.dart';
import '../models/app_models.dart';

/// Bidirectional Instant Synchronization Engine (Flutter Android/iOS <-> Supabase <-> Web)
class SupabaseSyncService {
  static const _uuid = Uuid();
  static const _defaultSuperAdminId = '5096a8c8-178e-4829-827d-b4881713435b';
  static const _localClientsKey = 'iloca:clients:local';
  static const _localVehiclesKey = 'iloca:vehicles:local';
  static const _localContractsKey = 'iloca:contracts:local';
  static const _localInvoicesKey = 'iloca:invoices:local';
  static const _localExpensesKey = 'iloca:expenses:local';

  static SupabaseClient get _sb => Supabase.instance.client;

  static String get _effectiveUserId =>
      _sb.auth.currentUser?.id ?? _defaultSuperAdminId;

  /// Dual-Engine Table Fetcher:
  /// 1. High-speed direct HTTPS REST call to Supabase PostgREST (immune to expired GoTrue session tokens or isolate delays)
  /// 2. Fallback to Supabase SDK client
  static Future<List<Map<String, dynamic>>> _fetchTableRows(
    String table, {
    String? orderBy,
    bool ascending = false,
  }) async {
    try {
      final orderParam = orderBy != null
          ? '&order=$orderBy.${ascending ? 'asc' : 'desc'}'
          : '';
      final uri = Uri.parse(
        '${AppConfig.supabaseUrl}/rest/v1/$table?select=*$orderParam',
      );
      final response = await http
          .get(
            uri,
            headers: {
              'apikey': AppConfig.supabasePublishableKey,
              'Authorization': 'Bearer ${AppConfig.supabasePublishableKey}',
              'Accept': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 7));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) {
          return decoded
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
      }
    } catch (e) {
      debugPrint('[SupabaseSync] Direct REST note ($table): $e');
    }

    final query = _sb.from(table).select('*');
    final rows = orderBy != null
        ? await query
            .order(orderBy, ascending: ascending)
            .timeout(const Duration(seconds: 7))
        : await query.timeout(const Duration(seconds: 7));
    return (rows as List)
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  /// Subscribe to Supabase Postgres Realtime Changes on all tables
  static RealtimeChannel subscribeRealtime({
    required VoidCallback onClientsChanged,
    required VoidCallback onVehiclesChanged,
    required VoidCallback onContractsChanged,
    required VoidCallback onInvoicesChanged,
    required VoidCallback onFinanceChanged,
  }) {
    final channel = _sb.channel('iloca-flutter-realtime-2026');

    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'clients',
          callback: (_) => onClientsChanged(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'vehicles',
          callback: (_) => onVehiclesChanged(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'contracts',
          callback: (_) {
            onContractsChanged();
            onVehiclesChanged();
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'invoices',
          callback: (_) => onInvoicesChanged(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'expenses',
          callback: (_) => onFinanceChanged(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'repairs',
          callback: (_) => onFinanceChanged(),
        )
        .subscribe();

    return channel;
  }

  // ===========================================================================
  // CLIENTS CRUD (Instant Sync with `public.clients`)
  // ===========================================================================
  static Future<List<ClientModel>> fetchClients() async {
    final prefs = await SharedPreferences.getInstance();
    final localRaw = prefs.getString(_localClientsKey) ?? prefs.getString('cache_clients');
    List<ClientModel> localList = [];
    if (localRaw != null) {
      try {
        final decoded = jsonDecode(localRaw) as List;
        localList = decoded
            .map((e) => ClientModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      } catch (_) {}
    }

    try {
      final rows = await _fetchTableRows('clients', orderBy: 'updated_at', ascending: false);
      final remote = rows
          .map((r) => ClientModel.fromJson(r))
          .toList();
      final encoded = jsonEncode(remote.map((e) => e.toJson()).toList());
      await prefs.setString(_localClientsKey, encoded);
      await prefs.setString('cache_clients', encoded);
      return remote;
    } catch (e) {
      debugPrint('[SupabaseSync] fetchClients fallback to local: $e');
      return localList;
    }
  }

  static Future<ClientModel> saveClient(ClientModel client, {bool isEdit = false}) async {
    final payload = client.toSupabasePayload();
    payload['user_id'] = _effectiveUserId;

    try {
      if (isEdit && client.id.isNotEmpty) {
        final res = await _sb
            .from('clients')
            .update(payload)
            .eq('id', client.id)
            .select('*')
            .single();
        return ClientModel.fromJson(Map<String, dynamic>.from(res));
      } else {
        // If creating new client, omit id if empty so Supabase Postgres generates UUID automatically
        final res = await _sb
            .from('clients')
            .insert(payload)
            .select('*')
            .single();
        return ClientModel.fromJson(Map<String, dynamic>.from(res));
      }
    } catch (e) {
      debugPrint('[SupabaseSync] saveClient local fallback: $e');
      final now = DateTime.now().toIso8601String();
      return ClientModel(
        id: client.id.isNotEmpty ? client.id : _uuid.v4(),
        lastName: client.lastName,
        firstName: client.firstName,
        addressMorocco: client.addressMorocco,
        addressForeign: client.addressForeign,
        phone: client.phone,
        cin: client.cin,
        cinDelivered: client.cinDelivered,
        licenseNumber: client.licenseNumber,
        licenseDelivered: client.licenseDelivered,
        passportNumber: client.passportNumber,
        birthDate: client.birthDate,
        nationality: client.nationality,
        customerType: client.customerType,
        cinImageUrl: client.cinImageUrl,
        licenseImageUrl: client.licenseImageUrl,
        passportImageUrl: client.passportImageUrl,
        avatarUrl: client.avatarUrl,
        createdAt: now,
        updatedAt: now,
      );
    }
  }

  static Future<void> deleteClient(String id) async {
    try {
      await _sb.from('clients').delete().eq('id', id);
    } catch (e) {
      debugPrint('[SupabaseSync] deleteClient error: $e');
    }
  }

  // ===========================================================================
  // VEHICLES CRUD (Instant Sync with `public.vehicles`)
  // ===========================================================================
  static Future<List<VehicleModel>> fetchVehicles() async {
    final prefs = await SharedPreferences.getInstance();
    final localRaw = prefs.getString(_localVehiclesKey) ?? prefs.getString('cache_vehicles');
    List<VehicleModel> localList = [];
    if (localRaw != null) {
      try {
        final decoded = jsonDecode(localRaw) as List;
        localList = decoded
            .map((e) => VehicleModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      } catch (_) {}
    }

    try {
      final rows = await _fetchTableRows('vehicles', orderBy: 'updated_at', ascending: false);
      final remote = rows
          .map((r) => VehicleModel.fromJson(r))
          .toList();
      final encoded = jsonEncode(remote.map((e) => e.toJson()).toList());
      await prefs.setString(_localVehiclesKey, encoded);
      await prefs.setString('cache_vehicles', encoded);
      return remote;
    } catch (e) {
      debugPrint('[SupabaseSync] fetchVehicles fallback to local: $e');
      return localList;
    }
  }

  static Future<VehicleModel> saveVehicle(VehicleModel vehicle, {bool isEdit = false}) async {
    final payload = vehicle.toSupabasePayload();
    payload['user_id'] = _effectiveUserId;

    try {
      if (isEdit && vehicle.id.isNotEmpty) {
        final res = await _sb
            .from('vehicles')
            .update(payload)
            .eq('id', vehicle.id)
            .select('*')
            .single();
        return VehicleModel.fromJson(Map<String, dynamic>.from(res));
      } else {
        // If id is empty, don't supply id field to let Supabase Postgres generate UUID automatically
        final res = await _sb
            .from('vehicles')
            .insert(payload)
            .select('*')
            .single();
        return VehicleModel.fromJson(Map<String, dynamic>.from(res));
      }
    } catch (e) {
      debugPrint('[SupabaseSync] saveVehicle error: $e');
      // If error occurred (e.g. offline), generate UUID and store locally
      if (vehicle.id.isEmpty) {
        return VehicleModel(
          id: _uuid.v4(),
          brand: vehicle.brand,
          model: vehicle.model,
          registration: vehicle.registration,
          year: vehicle.year,
          fuelType: vehicle.fuelType,
          gearbox: vehicle.gearbox,
          mileage: vehicle.mileage,
          color: vehicle.color,
          dailyRate: vehicle.dailyRate,
          status: vehicle.status,
          departureMileage: vehicle.departureMileage,
          hasGps: vehicle.hasGps,
          photos: vehicle.photos,
          documents: vehicle.documents,
          createdAt: DateTime.now().toIso8601String(),
          updatedAt: DateTime.now().toIso8601String(),
        );
      }
      return vehicle;
    }
  }

  static Future<void> updateVehicleStatus(String vehicleId, String status) async {
    if (vehicleId.isEmpty) return;
    try {
      await _sb.from('vehicles').update({'status': status}).eq('id', vehicleId);
    } catch (_) {}
  }

  static Future<void> deleteVehicle(String id) async {
    try {
      await _sb.from('vehicles').delete().eq('id', id);
    } catch (e) {
      debugPrint('[SupabaseSync] deleteVehicle error: $e');
    }
  }

  // ===========================================================================
  // CONTRACTS CRUD (Instant Sync with `public.contracts` + Vehicle Rental Sync)
  // ===========================================================================
  static Future<List<ContractModel>> fetchContracts() async {
    final prefs = await SharedPreferences.getInstance();
    final localRaw = prefs.getString(_localContractsKey) ?? prefs.getString('cache_contracts');
    List<ContractModel> localList = [];
    if (localRaw != null) {
      try {
        final decoded = jsonDecode(localRaw) as List;
        localList = decoded
            .map((e) => ContractModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      } catch (_) {}
    }

    try {
      final rows = await _fetchTableRows('contracts', orderBy: 'created_at', ascending: false);
      final remote = rows
          .map((r) => ContractModel.fromJson(r))
          .toList();
      final encoded = jsonEncode(remote.map((e) => e.toJson()).toList());
      await prefs.setString(_localContractsKey, encoded);
      await prefs.setString('cache_contracts', encoded);
      return remote;
    } catch (e) {
      debugPrint('[SupabaseSync] fetchContracts fallback to local: $e');
      return localList;
    }
  }

  static Future<ContractModel> saveContract(ContractModel contract, {bool isEdit = false}) async {
    final payload = contract.toSupabasePayload();
    payload['user_id'] = _effectiveUserId;

    try {
      ContractModel saved;
      if (isEdit && contract.id.isNotEmpty) {
        final res = await _sb
            .from('contracts')
            .update(payload)
            .eq('id', contract.id)
            .select('*')
            .single();
        saved = ContractModel.fromJson(Map<String, dynamic>.from(res));
      } else {
        final res = await _sb
            .from('contracts')
            .insert(payload)
            .select('*')
            .single();
        saved = ContractModel.fromJson(Map<String, dynamic>.from(res));
      }

      // Automatically synchronize vehicle status ('loue' or 'disponible') just like the Web App
      if (saved.vehicleId.isNotEmpty) {
        final newVehStatus = saved.isActive ? 'loue' : 'disponible';
        await updateVehicleStatus(saved.vehicleId, newVehStatus);
      }
      return saved;
    } catch (e, stack) {
      debugPrint('[SupabaseSync] saveContract error: $e\n$stack');
      if (e.toString().contains('SocketException') ||
          e.toString().contains('ClientException')) {
        return contract;
      }
      rethrow;
    }
  }

  static Future<void> deleteContract(ContractModel contract) async {
    try {
      await _sb.from('contracts').delete().eq('id', contract.id);
      if (contract.vehicleId.isNotEmpty) {
        await updateVehicleStatus(contract.vehicleId, 'disponible');
      }
    } catch (e) {
      debugPrint('[SupabaseSync] deleteContract error: $e');
    }
  }

  // ===========================================================================
  // INVOICES CRUD (Instant Sync with `public.invoices`)
  // ===========================================================================
  static Future<List<InvoiceModel>> fetchInvoices() async {
    final prefs = await SharedPreferences.getInstance();
    final localRaw = prefs.getString(_localInvoicesKey) ?? prefs.getString('cache_invoices');
    List<InvoiceModel> localList = [];
    if (localRaw != null) {
      try {
        final decoded = jsonDecode(localRaw) as List;
        localList = decoded
            .map((e) => InvoiceModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      } catch (_) {}
    }

    try {
      final rows = await _fetchTableRows('invoices', orderBy: 'updated_at', ascending: false);
      final remote = rows
          .map((r) => InvoiceModel.fromJson(r))
          .toList();
      final encoded = jsonEncode(remote.map((e) => e.toJson()).toList());
      await prefs.setString(_localInvoicesKey, encoded);
      await prefs.setString('cache_invoices', encoded);
      return remote;
    } catch (e) {
      debugPrint('[SupabaseSync] fetchInvoices fallback to local: $e');
      return localList;
    }
  }

  static Future<InvoiceModel> saveInvoice(InvoiceModel invoice, {bool isEdit = false}) async {
    final payload = invoice.toSupabasePayload();
    payload['user_id'] = _effectiveUserId;

    try {
      InvoiceModel saved;
      if (isEdit && invoice.id.isNotEmpty) {
        final res = await _sb
            .from('invoices')
            .update(payload)
            .eq('id', invoice.id)
            .select('*')
            .single();
        saved = InvoiceModel.fromJson(Map<String, dynamic>.from(res));
      } else {
        final res = await _sb
            .from('invoices')
            .insert(payload)
            .select('*')
            .single();
        saved = InvoiceModel.fromJson(Map<String, dynamic>.from(res));
      }
      return saved;
    } catch (e, stack) {
      debugPrint('[SupabaseSync] saveInvoice error: $e\n$stack');
      if (e.toString().contains('SocketException') ||
          e.toString().contains('ClientException')) {
        return invoice;
      }
      rethrow;
    }
  }

  static Future<void> deleteInvoice(String id) async {
    try {
      await _sb.from('invoices').delete().eq('id', id);
    } catch (e) {
      debugPrint('[SupabaseSync] deleteInvoice error: $e');
    }
  }

  // ===========================================================================
  // EXPENSES & REPAIRS FETCH FOR OVERVIEW & REPORTS
  // ===========================================================================
  static Future<double> fetchMonthlyExpensesAndRepairs() async {
    double total = 0;

    try {
      final expRows = await _fetchTableRows('expenses', orderBy: 'created_at', ascending: false);
      for (final r in expRows) {
        if (r['archived'] == true) continue;
        final val = double.tryParse((r['monthly_cost'] ?? r['total_cost'] ?? '0').toString()) ?? 0;
        total += val;
      }
    } catch (_) {}

    try {
      final repRows = await _fetchTableRows('repairs', orderBy: 'created_at', ascending: false);
      final now = DateTime.now();
      final monthPrefix = '${now.year}-${now.month.toString().padLeft(2, '0')}';
      for (final r in repRows) {
        final createdAt = (r['created_at'] ?? '').toString();
        if (createdAt.startsWith(monthPrefix)) {
          final val = double.tryParse((r['cout'] ?? '0').toString()) ?? 0;
          total += val;
        }
      }
    } catch (_) {}

    return total;
  }

  // ===========================================================================
  // EXPENSES CRUD
  // ===========================================================================
  static Future<List<ExpenseModel>> fetchExpenses() async {
    final prefs = await SharedPreferences.getInstance();
    final localJson = prefs.getString(_localExpensesKey) ?? prefs.getString('cache_expenses');
    List<ExpenseModel> localList = [];
    if (localJson != null && localJson.isNotEmpty) {
      try {
        final list = jsonDecode(localJson) as List<dynamic>;
        localList = list
            .map((e) => ExpenseModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      } catch (e) {
        debugPrint('[SupabaseSync] fetchExpenses local cache parse error: $e');
      }
    }

    try {
      final rows = await _fetchTableRows('expenses', orderBy: 'created_at', ascending: false);
      final remoteList = rows
          .map((e) => ExpenseModel.fromJson(e))
          .toList();

      final encoded = jsonEncode(remoteList.map((e) => e.toJson()).toList());
      await prefs.setString(_localExpensesKey, encoded);
      await prefs.setString('cache_expenses', encoded);
      return remoteList;
    } catch (e) {
      debugPrint('[SupabaseSync] fetchExpenses network error (using cache): $e');
      return localList;
    }
  }

  static Future<ExpenseModel> saveExpense(ExpenseModel expense) async {
    final isEdit = expense.id.isNotEmpty && !expense.id.startsWith('temp_');
    final now = DateTime.now().toIso8601String();
    final generatedId = isEdit ? expense.id : _uuid.v4();

    final payload = <String, dynamic>{
      'vehicle_id': expense.vehicleId,
      'type': expense.type,
      'total_cost': expense.totalCost,
      'start_date': expense.startDate,
      'end_date': expense.endDate,
      'period_months': expense.periodMonths < 1 ? 1 : expense.periodMonths,
      'monthly_cost': expense.monthlyCost,
      'document_url': expense.documentUrl,
      'notes': expense.notes,
      'tags': expense.tags,
      'recurring_enabled': expense.recurringEnabled,
      'recurring_frequency': expense.recurringFrequency,
      'archived': expense.archived,
      'parent_expense_id': expense.parentExpenseId,
      'next_due_date': expense.nextDueDate ?? expense.endDate,
      'updated_at': now,
      'user_id': _effectiveUserId,
    };

    try {
      ExpenseModel saved;
      if (isEdit) {
        final res = await _sb
            .from('expenses')
            .update(payload)
            .eq('id', expense.id)
            .select('*')
            .single();
        saved = ExpenseModel.fromJson(Map<String, dynamic>.from(res));
      } else {
        payload['id'] = generatedId;
        payload['created_at'] = expense.createdAt.isNotEmpty ? expense.createdAt : now;
        final res = await _sb
            .from('expenses')
            .insert(payload)
            .select('*')
            .single();
        saved = ExpenseModel.fromJson(Map<String, dynamic>.from(res));
      }
      return saved;
    } catch (e, stack) {
      debugPrint('[SupabaseSync] saveExpense error: $e\n$stack');
      if (e.toString().contains('SocketException') ||
          e.toString().contains('ClientException')) {
        return expense.copyWith(
          id: generatedId,
          updatedAt: now,
        );
      }
      rethrow;
    }
  }

  static Future<void> deleteExpense(String id) async {
    try {
      await _sb.from('expenses').delete().eq('id', id);
    } catch (e) {
      debugPrint('[SupabaseSync] deleteExpense error: $e');
    }
  }
}
