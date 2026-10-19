import 'package:flutter/material.dart';

/// 1. Client / Tenant Model (100% compatible with Supabase `public.clients`)
class ClientModel {
  final String id;
  final String lastName;
  final String firstName;
  final String addressMorocco;
  final String addressForeign;
  final String phone;
  final String cin;
  final String cinDelivered;
  final String licenseNumber;
  final String licenseDelivered;
  final String passportNumber;
  final String birthDate;
  final String nationality;
  final String customerType; // 'Locataire Principal' | 'Chauffeur secondaire'
  final String createdAt;
  final String updatedAt;

  const ClientModel({
    required this.id,
    required this.lastName,
    this.firstName = '',
    this.addressMorocco = '',
    this.addressForeign = '',
    this.phone = '',
    this.cin = '',
    this.cinDelivered = '',
    this.licenseNumber = '',
    this.licenseDelivered = '',
    this.passportNumber = '',
    this.birthDate = '',
    this.nationality = 'Marocaine',
    this.customerType = 'Locataire Principal',
    required this.createdAt,
    required this.updatedAt,
  });

  String get fullName => '$firstName $lastName'.trim().isEmpty
      ? 'Client SFT'
      : '$firstName $lastName'.trim();

  String get displayAddress =>
      addressMorocco.isNotEmpty ? addressMorocco : addressForeign;

  factory ClientModel.fromJson(Map<String, dynamic> row) {
    final now = DateTime.now().toIso8601String();
    return ClientModel(
      id: (row['id'] ?? '').toString(),
      lastName: (row['last_name'] ?? row['nom'] ?? '').toString(),
      firstName: (row['first_name'] ?? row['prenom'] ?? '').toString(),
      addressMorocco:
          (row['address_morocco'] ?? row['adresse'] ?? '').toString(),
      addressForeign: (row['address_foreign'] ?? '').toString(),
      phone: (row['phone'] ?? row['telephone'] ?? '').toString(),
      cin: (row['cin'] ?? '').toString(),
      cinDelivered: (row['cin_delivered'] ?? row['dateCin'] ?? '').toString(),
      licenseNumber:
          (row['license_number'] ?? row['permis'] ?? '').toString(),
      licenseDelivered:
          (row['license_delivered'] ?? row['datePermis'] ?? '').toString(),
      passportNumber:
          (row['passport_number'] ?? row['passeport'] ?? '').toString(),
      birthDate:
          (row['birth_date'] ?? row['dateNaissance'] ?? '').toString(),
      nationality:
          (row['nationality'] ?? row['nationalite'] ?? 'Marocaine').toString(),
      customerType: row['customer_type'] == 'Chauffeur secondaire' ||
              row['type'] == 'Chauffeur secondaire'
          ? 'Chauffeur secondaire'
          : 'Locataire Principal',
      createdAt: (row['created_at'] ?? row['createdAt'] ?? now).toString(),
      updatedAt: (row['updated_at'] ?? row['updatedAt'] ?? now).toString(),
    );
  }

  Map<String, dynamic> toSupabasePayload() {
    return {
      'last_name': lastName.trim(),
      'first_name': firstName.trim().isEmpty ? null : firstName.trim(),
      'address_morocco':
          addressMorocco.trim().isEmpty ? null : addressMorocco.trim(),
      'address_foreign':
          addressForeign.trim().isEmpty ? null : addressForeign.trim(),
      'phone': phone.trim().isEmpty ? null : phone.trim(),
      'cin': cin.trim().isEmpty ? null : cin.trim(),
      'cin_delivered':
          cinDelivered.trim().isEmpty ? null : cinDelivered.trim(),
      'license_number':
          licenseNumber.trim().isEmpty ? null : licenseNumber.trim(),
      'license_delivered':
          licenseDelivered.trim().isEmpty ? null : licenseDelivered.trim(),
      'passport_number':
          passportNumber.trim().isEmpty ? null : passportNumber.trim(),
      'birth_date': birthDate.trim().isEmpty ? null : birthDate.trim(),
      'nationality':
          nationality.trim().isEmpty ? 'Marocaine' : nationality.trim(),
      'customer_type': customerType,
    };
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        ...toSupabasePayload(),
        'created_at': createdAt,
        'updated_at': updatedAt,
      };
}

/// 2. Vehicle Model (100% compatible with Supabase `public.vehicles`)
class VehicleModel {
  final String id;
  final String brand;
  final String model;
  final String registration;
  final int year;
  final String fuelType;
  final String gearbox;
  final double mileage;
  final String color;
  final double dailyRate;
  final String status; // 'disponible' | 'loue' | 'maintenance'
  final double departureMileage;
  final bool hasGps;
  final String createdAt;
  final String updatedAt;

  const VehicleModel({
    required this.id,
    required this.brand,
    this.model = '',
    this.registration = '',
    this.year = 2025,
    this.fuelType = 'Diesel',
    this.gearbox = 'Automatique',
    this.mileage = 0,
    this.color = 'Noir',
    this.dailyRate = 300,
    this.status = 'disponible',
    this.departureMileage = 0,
    this.hasGps = true,
    required this.createdAt,
    required this.updatedAt,
  });

  String get fullName => '$brand $model'.trim().isEmpty
      ? 'Véhicule SFT'
      : '$brand $model'.trim();

  factory VehicleModel.fromJson(Map<String, dynamic> row) {
    final now = DateTime.now().toIso8601String();
    double parseNum(dynamic val, [double fallback = 0]) {
      if (val == null) return fallback;
      final n = double.tryParse(val.toString());
      return n ?? fallback;
    }

    return VehicleModel(
      id: (row['id'] ?? '').toString(),
      brand: (row['brand'] ?? row['marque'] ?? '').toString(),
      model: (row['model'] ?? row['modele'] ?? '').toString(),
      registration:
          (row['registration'] ?? row['immatriculation'] ?? '').toString(),
      year: parseNum(row['year'] ?? row['annee'], 2025).round(),
      fuelType:
          (row['fuel_type'] ?? row['type_carburant'] ?? 'Diesel').toString(),
      gearbox:
          (row['gearbox'] ?? row['boite_vitesse'] ?? 'Automatique').toString(),
      mileage: parseNum(row['mileage'] ?? row['kilometrage'], 0),
      color: (row['color'] ?? row['couleur'] ?? 'Noir').toString(),
      dailyRate: parseNum(row['daily_rate'] ?? row['prix_par_jour'], 300),
      status:
          (row['status'] ?? row['etat_vehicule'] ?? 'disponible').toString(),
      departureMileage:
          parseNum(row['departure_mileage'] ?? row['km_depart'], 0),
      hasGps: row['has_gps'] == true || row['gps_installed'] == true,
      createdAt: (row['created_at'] ?? now).toString(),
      updatedAt: (row['updated_at'] ?? now).toString(),
    );
  }

  Map<String, dynamic> toSupabasePayload() {
    return {
      'brand': brand.trim(),
      'model': model.trim().isEmpty ? null : model.trim(),
      'registration': registration.trim().isEmpty ? null : registration.trim(),
      'year': year,
      'fuel_type': fuelType.trim(),
      'gearbox': gearbox.trim(),
      'mileage': mileage,
      'color': color.trim(),
      'daily_rate': dailyRate,
      'status': status.trim().isEmpty ? 'disponible' : status.trim(),
      'departure_mileage': departureMileage,
      'has_gps': hasGps,
    };
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        ...toSupabasePayload(),
        'created_at': createdAt,
        'updated_at': updatedAt,
      };

  VehicleModel copyWith({String? status}) {
    return VehicleModel(
      id: id,
      brand: brand,
      model: model,
      registration: registration,
      year: year,
      fuelType: fuelType,
      gearbox: gearbox,
      mileage: mileage,
      color: color,
      dailyRate: dailyRate,
      status: status ?? this.status,
      departureMileage: departureMileage,
      hasGps: hasGps,
      createdAt: createdAt,
      updatedAt: DateTime.now().toIso8601String(),
    );
  }
}

/// 3. Contract Model (100% compatible with Supabase `public.contracts`)
class ContractModel {
  final String id;
  final String contractNumber;
  final String customerName;
  final String customerPhone;
  final String customerCin;
  final String clientId;
  final String vehicle;
  final String vehicleId;
  final String startDate;
  final String endDate;
  final double dailyRate;
  final double totalAmount;
  final double advancePayment;
  final String paymentMethod; // 'Espèces' | 'Chèque' | 'Virement'
  final String status; // 'ouvert' | 'ferme' | 'signed' | 'completed'
  final Map<String, dynamic> contractData;
  final String createdAt;
  final String updatedAt;

  const ContractModel({
    required this.id,
    required this.contractNumber,
    required this.customerName,
    this.customerPhone = '',
    this.customerCin = '',
    this.clientId = '',
    required this.vehicle,
    this.vehicleId = '',
    required this.startDate,
    required this.endDate,
    this.dailyRate = 300,
    required this.totalAmount,
    this.advancePayment = 0,
    this.paymentMethod = 'Espèces',
    this.status = 'ouvert',
    this.contractData = const {},
    required this.createdAt,
    required this.updatedAt,
  });

  int get durationDays {
    final s = DateTime.tryParse(startDate);
    final e = DateTime.tryParse(endDate);
    if (s == null || e == null) return 1;
    final diff = e.difference(s).inDays;
    return diff <= 0 ? 1 : diff;
  }

  double get remainingAmount =>
      (totalAmount - advancePayment).clamp(0, double.infinity);

  bool get isActive =>
      ['ouvert', 'signed', 'sent', 'draft', 'actif'].contains(status.toLowerCase());

  factory ContractModel.fromJson(Map<String, dynamic> row) {
    final now = DateTime.now().toIso8601String();
    double parseNum(dynamic val, [double fallback = 0]) {
      if (val == null) return fallback;
      final clean = val.toString().replaceAll(RegExp(r'[^0-9.-]'), '');
      return double.tryParse(clean) ?? fallback;
    }

    final rawData = row['contract_data'] is Map
        ? Map<String, dynamic>.from(row['contract_data'] as Map)
        : <String, dynamic>{};

    return ContractModel(
      id: (row['id'] ?? '').toString(),
      contractNumber: (row['contract_number'] ??
              row['contractNumber'] ??
              'CNT-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}')
          .toString(),
      customerName: (row['customer_name'] ??
              row['customerName'] ??
              rawData['customerName'] ??
              'Client')
          .toString(),
      customerPhone: (row['customer_phone'] ??
              row['customerPhone'] ??
              rawData['customerPhone'] ??
              '')
          .toString(),
      customerCin: (row['customer_national_id'] ??
              row['customerCin'] ??
              rawData['cin'] ??
              '')
          .toString(),
      clientId: (row['client_id'] ?? '').toString(),
      vehicle: (row['vehicle'] ?? rawData['vehicle'] ?? 'Véhicule').toString(),
      vehicleId: (row['vehicle_id'] ?? row['vehicleId'] ?? '').toString(),
      startDate: (row['start_date'] ?? row['startDate'] ?? now.substring(0, 10))
          .toString(),
      endDate:
          (row['end_date'] ?? row['endDate'] ?? now.substring(0, 10)).toString(),
      dailyRate: parseNum(
          row['daily_rate'] ?? row['dailyRate'] ?? rawData['dailyRate'], 300),
      totalAmount: parseNum(row['total_amount'] ?? row['totalAmount'], 0),
      advancePayment:
          parseNum(row['advance_payment'] ?? rawData['advancePayment'], 0),
      paymentMethod: (row['payment_method'] ??
              rawData['paymentMethod'] ??
              'Espèces')
          .toString(),
      status: (row['status'] ?? 'ouvert').toString(),
      contractData: rawData,
      createdAt: (row['created_at'] ?? now).toString(),
      updatedAt: (row['updated_at'] ?? now).toString(),
    );
  }

  Map<String, dynamic> toSupabasePayload() {
    return {
      'contract_number': contractNumber,
      'customer_name': customerName,
      'customer_phone': customerPhone.isEmpty ? null : customerPhone,
      'customer_national_id': customerCin.isEmpty ? null : customerCin,
      if (clientId.isNotEmpty) 'client_id': clientId,
      'vehicle': vehicle,
      if (vehicleId.isNotEmpty) 'vehicle_id': vehicleId,
      'start_date': startDate,
      'end_date': endDate,
      'daily_rate': dailyRate,
      'total_amount': totalAmount,
      'advance_payment': advancePayment,
      'payment_method': paymentMethod,
      'status': status,
      'contract_data': {
        ...contractData,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'cin': customerCin,
        'vehicle': vehicle,
        'dailyRate': dailyRate,
        'advancePayment': advancePayment,
        'paymentMethod': paymentMethod,
        'originalAmount': totalAmount,
      },
    };
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        ...toSupabasePayload(),
        'created_at': createdAt,
        'updated_at': updatedAt,
      };
}

/// 4. GPSWOX Live Telemetry Device Model
class GpsDeviceModel {
  final String id;
  final String name;
  final String plate;
  final String imei;
  final double lat;
  final double lng;
  final double speed;
  final bool online;
  final bool ignition;
  final double? fuelLevel;
  final double battery;
  final double distanceToday;
  final String lastUpdate;
  final Map<String, dynamic> raw;

  const GpsDeviceModel({
    required this.id,
    required this.name,
    required this.plate,
    this.imei = '',
    required this.lat,
    required this.lng,
    required this.speed,
    required this.online,
    required this.ignition,
    this.fuelLevel,
    this.battery = 100,
    this.distanceToday = 0,
    required this.lastUpdate,
    this.raw = const {},
  });

  String get status {
    if (online && speed > 1) return 'moving';
    if (online) return 'online';
    return 'offline';
  }

  String get statusLabel {
    switch (status) {
      case 'moving':
        return 'En mouvement';
      case 'online':
        return 'À l\'arrêt';
      default:
        return 'Hors ligne';
    }
  }

  Color get statusColor {
    switch (status) {
      case 'moving':
        return const Color(0xFF10B981);
      case 'online':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF64748B);
    }
  }

  bool get hasValidPosition =>
      lat.isFinite && lng.isFinite && (lat.abs() > 0.001 || lng.abs() > 0.001);
}

/// 5. GPS History Point & Stop Detection Models
class HistoryPointModel {
  final double lat;
  final double lng;
  final int timestamp;
  final double speed;

  const HistoryPointModel({
    required this.lat,
    required this.lng,
    required this.timestamp,
    required this.speed,
  });

  DateTime get dateTime => DateTime.fromMillisecondsSinceEpoch(timestamp);
}

class DetectedStopModel {
  final double lat;
  final double lng;
  final int fromTimestamp;
  final int toTimestamp;
  final int durationMin;

  const DetectedStopModel({
    required this.lat,
    required this.lng,
    required this.fromTimestamp,
    required this.toTimestamp,
    required this.durationMin,
  });
}

class RouteStatsModel {
  final double distanceKm;
  final int durationMin;
  final int avgSpeed;
  final int maxSpeed;
  final int stopsCount;

  const RouteStatsModel({
    this.distanceKm = 0,
    this.durationMin = 0,
    this.avgSpeed = 0,
    this.maxSpeed = 0,
    this.stopsCount = 0,
  });
}

/// 6. Unified Alert & GPS Event Model
class AlertItemModel {
  final String id;
  final String severity; // 'critical' | 'warning' | 'info'
  final String title;
  final String message;
  final String date;
  final String vehicleName;
  final String source; // 'system' | 'gpswox'

  const AlertItemModel({
    required this.id,
    required this.severity,
    required this.title,
    required this.message,
    required this.date,
    this.vehicleName = '',
    this.source = 'system',
  });
}
