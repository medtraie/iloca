import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../models/app_models.dart';

/// Bidirectional Instant Synchronization Engine (Flutter Android/iOS <-> Supabase <-> Web)
class SupabaseSyncService {
  static const _uuid = Uuid();
  static const _localClientsKey = 'iloca:clients:local';
  static const _localVehiclesKey = 'iloca:vehicles:local';
  static const _localContractsKey = 'iloca:contracts:local';
  static const _localInvoicesKey = 'iloca:invoices:local';
  static const _localExpensesKey = 'iloca:expenses:local';

  static SupabaseClient get _sb => Supabase.instance.client;

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
    final localRaw = prefs.getString(_localClientsKey);
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
      final rows = await _sb
          .from('clients')
          .select('*')
          .order('updated_at', ascending: false);
      final remote = (rows as List)
          .map((r) => ClientModel.fromJson(Map<String, dynamic>.from(r)))
          .toList();
      await prefs.setString(
        _localClientsKey,
        jsonEncode(remote.map((e) => e.toJson()).toList()),
      );
      return remote;
    } catch (e) {
      debugPrint('[SupabaseSync] fetchClients fallback to local: $e');
      return localList;
    }
  }

  static Future<ClientModel> saveClient(ClientModel client, {bool isEdit = false}) async {
    final payload = client.toSupabasePayload();
    final userId = _sb.auth.currentUser?.id;
    if (userId != null) {
      payload['user_id'] = userId;
    }

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
    final localRaw = prefs.getString(_localVehiclesKey);
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
      final rows = await _sb
          .from('vehicles')
          .select('*')
          .order('updated_at', ascending: false);
      final remote = (rows as List)
          .map((r) => VehicleModel.fromJson(Map<String, dynamic>.from(r)))
          .toList();
      await prefs.setString(
        _localVehiclesKey,
        jsonEncode(remote.map((e) => e.toJson()).toList()),
      );
      return remote;
    } catch (e) {
      debugPrint('[SupabaseSync] fetchVehicles fallback to local: $e');
      return localList;
    }
  }

  static Future<VehicleModel> saveVehicle(VehicleModel vehicle, {bool isEdit = false}) async {
    final payload = vehicle.toSupabasePayload();
    // Do not enforce user_id if null to allow shared fleet visibility across Web & Mobile
    final userId = _sb.auth.currentUser?.id;
    if (userId != null) {
      payload['user_id'] = userId;
    }

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
    final localRaw = prefs.getString(_localContractsKey);
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
      final rows = await _sb
          .from('contracts')
          .select('*')
          .order('created_at', ascending: false);
      final remote = (rows as List)
          .map((r) => ContractModel.fromJson(Map<String, dynamic>.from(r)))
          .toList();
      await prefs.setString(
        _localContractsKey,
        jsonEncode(remote.map((e) => e.toJson()).toList()),
      );
      return remote;
    } catch (e) {
      debugPrint('[SupabaseSync] fetchContracts fallback to local: $e');
      return localList;
    }
  }

  static Future<ContractModel> saveContract(ContractModel contract, {bool isEdit = false}) async {
    final payload = contract.toSupabasePayload();
    final userId = _sb.auth.currentUser?.id;
    if (userId != null) {
      payload['user_id'] = userId;
    }

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
    final localRaw = prefs.getString(_localInvoicesKey);
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
      final rows = await _sb
          .from('invoices')
          .select('*')
          .order('updated_at', ascending: false);
      final remote = (rows as List)
          .map((r) => InvoiceModel.fromJson(Map<String, dynamic>.from(r)))
          .toList();
      await prefs.setString(
        _localInvoicesKey,
        jsonEncode(remote.map((e) => e.toJson()).toList()),
      );
      return remote;
    } catch (e) {
      debugPrint('[SupabaseSync] fetchInvoices fallback to local: $e');
      return localList;
    }
  }

  static Future<InvoiceModel> saveInvoice(InvoiceModel invoice, {bool isEdit = false}) async {
    final payload = invoice.toSupabasePayload();
    final userId = _sb.auth.currentUser?.id;
    if (userId != null) {
      payload['user_id'] = userId;
    }

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
    final now = DateTime.now();
    final monthStart = DateTime(now.year, now.month, 1).toIso8601String();
    double total = 0;

    try {
      final expRows = await _sb
          .from('expenses')
          .select('monthly_cost,total_cost,created_at')
          .gte('created_at', monthStart);
      for (final r in (expRows as List)) {
        final val = double.tryParse((r['monthly_cost'] ?? r['total_cost'] ?? '0').toString()) ?? 0;
        total += val;
      }
    } catch (_) {}

    try {
      final repRows = await _sb
          .from('repairs')
          .select('cout,created_at')
          .gte('created_at', monthStart);
      for (final r in (repRows as List)) {
        final val = double.tryParse((r['cout'] ?? '0').toString()) ?? 0;
        total += val;
      }
    } catch (_) {}

    return total;
  }

  // ===========================================================================
  // EXPENSES CRUD
  // ===========================================================================
  static Future<List<ExpenseModel>> fetchExpenses() async {
    final prefs = await SharedPreferences.getInstance();
    final localJson = prefs.getString(_localExpensesKey);
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
      final res = await _sb
          .from('expenses')
          .select('*')
          .order('created_at', ascending: false);

      final remoteList = (res as List<dynamic>)
          .map((e) => ExpenseModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();

      final remoteIds = remoteList.map((e) => e.id).toSet();
      final combined = [
        ...remoteList,
        ...localList.where((e) => !remoteIds.contains(e.id)),
      ];

      await prefs.setString(
        _localExpensesKey,
        jsonEncode(combined.map((e) => e.toJson()).toList()),
      );
      return combined;
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
    };

    final userId = _sb.auth.currentUser?.id;
    if (userId != null) {
      payload['user_id'] = userId;
    }

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
