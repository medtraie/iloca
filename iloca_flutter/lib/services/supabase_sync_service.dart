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

  static SupabaseClient get _sb => Supabase.instance.client;

  /// Subscribe to Supabase Postgres Realtime Changes on all tables
  static RealtimeChannel subscribeRealtime({
    required VoidCallback onClientsChanged,
    required VoidCallback onVehiclesChanged,
    required VoidCallback onContractsChanged,
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
}
