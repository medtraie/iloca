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
  final String passportDelivered;
  final String birthDate;
  final String nationality;
  final String customerType; // 'Locataire Principal' | 'Chauffeur secondaire'
  final String? cinImageUrl;
  final String? licenseImageUrl;
  final String? passportImageUrl;
  final String? avatarUrl;
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
    this.passportDelivered = '',
    this.birthDate = '',
    this.nationality = 'Marocaine',
    this.customerType = 'Locataire Principal',
    this.cinImageUrl,
    this.licenseImageUrl,
    this.passportImageUrl,
    this.avatarUrl,
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
      passportDelivered:
          (row['passport_delivered'] ?? '').toString(),
      birthDate:
          (row['birth_date'] ?? row['dateNaissance'] ?? '').toString(),
      nationality:
          (row['nationality'] ?? row['nationalite'] ?? 'Marocaine').toString(),
      customerType: row['customer_type'] == 'Chauffeur secondaire' ||
              row['type'] == 'Chauffeur secondaire'
          ? 'Chauffeur secondaire'
          : 'Locataire Principal',
      cinImageUrl: row['cin_image_url'] ?? row['cinImageUrl'],
      licenseImageUrl: row['license_image_url'] ?? row['permisImageUrl'],
      passportImageUrl: row['passport_image_url'] ?? row['passeportImageUrl'],
      avatarUrl: row['avatar_url'] ?? row['tenantImageUrl'],
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
      'passport_delivered':
          passportDelivered.trim().isEmpty ? null : passportDelivered.trim(),
      'birth_date': birthDate.trim().isEmpty ? null : birthDate.trim(),
      'nationality':
          nationality.trim().isEmpty ? 'Marocaine' : nationality.trim(),
      'customer_type': customerType,
      'cin_image_url': cinImageUrl,
      'license_image_url': licenseImageUrl,
      'passport_image_url': passportImageUrl,
      'avatar_url': avatarUrl,
    };
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        ...toSupabasePayload(),
        'created_at': createdAt,
        'updated_at': updatedAt,
      };

  ClientModel copyWith({
    String? lastName,
    String? firstName,
    String? addressMorocco,
    String? addressForeign,
    String? phone,
    String? cin,
    String? cinDelivered,
    String? licenseNumber,
    String? licenseDelivered,
    String? passportNumber,
    String? passportDelivered,
    String? birthDate,
    String? nationality,
    String? customerType,
    String? cinImageUrl,
    String? licenseImageUrl,
    String? passportImageUrl,
    String? avatarUrl,
  }) {
    return ClientModel(
      id: id,
      lastName: lastName ?? this.lastName,
      firstName: firstName ?? this.firstName,
      addressMorocco: addressMorocco ?? this.addressMorocco,
      addressForeign: addressForeign ?? this.addressForeign,
      phone: phone ?? this.phone,
      cin: cin ?? this.cin,
      cinDelivered: cinDelivered ?? this.cinDelivered,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      licenseDelivered: licenseDelivered ?? this.licenseDelivered,
      passportNumber: passportNumber ?? this.passportNumber,
      passportDelivered: passportDelivered ?? this.passportDelivered,
      birthDate: birthDate ?? this.birthDate,
      nationality: nationality ?? this.nationality,
      customerType: customerType ?? this.customerType,
      cinImageUrl: cinImageUrl ?? this.cinImageUrl,
      licenseImageUrl: licenseImageUrl ?? this.licenseImageUrl,
      passportImageUrl: passportImageUrl ?? this.passportImageUrl,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      createdAt: createdAt,
      updatedAt: DateTime.now().toIso8601String(),
    );
  }
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
  final List<String> photos;
  final List<String> documents;
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
    this.photos = const [],
    this.documents = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  String get fullName => '$brand $model'.trim().isEmpty
      ? 'Véhicule SFT'
      : '$brand $model'.trim();

  String? get mainPhoto => photos.isNotEmpty ? photos.first : null;

  factory VehicleModel.fromJson(Map<String, dynamic> row) {
    final now = DateTime.now().toIso8601String();
    double parseNum(dynamic val, [double fallback = 0]) {
      if (val == null) return fallback;
      final n = double.tryParse(val.toString());
      return n ?? fallback;
    }

    List<String> parseList(dynamic val) {
      if (val == null) return [];
      if (val is List) {
        return val.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
      }
      return [];
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
      photos: parseList(row['photos_urls'] ?? row['photos']),
      documents: parseList(row['documents_urls'] ?? row['documents']),
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
      'photos_urls': photos,
      'documents_urls': documents,
    };
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        ...toSupabasePayload(),
        'created_at': createdAt,
        'updated_at': updatedAt,
      };

  VehicleModel copyWith({
    String? status,
    List<String>? photos,
    List<String>? documents,
  }) {
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
      photos: photos ?? this.photos,
      documents: documents ?? this.documents,
      createdAt: createdAt,
      updatedAt: DateTime.now().toIso8601String(),
    );
  }
}

/// 3. Contract Model (100% compatible with Supabase `public.contracts`)
class DamagePointModel {
  final String id;
  final double x;
  final double y;

  const DamagePointModel({
    required this.id,
    required this.x,
    required this.y,
  });

  factory DamagePointModel.fromJson(Map<String, dynamic> map) {
    double toNum(dynamic v) => double.tryParse((v ?? '0').toString()) ?? 0;
    return DamagePointModel(
      id: (map['id'] ?? 'dmg_${DateTime.now().microsecondsSinceEpoch}').toString(),
      x: toNum(map['x']).clamp(0.0, 100.0),
      y: toNum(map['y']).clamp(0.0, 100.0),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'x': x,
        'y': y,
      };
}

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
  final String status; // 'ouvert' | 'ferme' | 'signed' | 'completed' | 'draft' | 'sent'
  final String notes;
  final int deliveryFuelLevel;
  final int returnFuelLevel;
  final List<DamagePointModel> deliveryDamages;
  final List<DamagePointModel> returnDamages;
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
    this.notes = '',
    this.deliveryFuelLevel = 100,
    this.returnFuelLevel = 100,
    this.deliveryDamages = const [],
    this.returnDamages = const [],
    this.contractData = const {},
    required this.createdAt,
    required this.updatedAt,
  });

  int get baseDurationDays {
    final manualDays = int.tryParse(
          (contractData['rentalDays'] ?? contractData['rentalDuration'] ?? '')
              .toString(),
        ) ??
        0;
    if (manualDays > 0) return manualDays;
    final s = DateTime.tryParse(startDate.split('T').first);
    final e = DateTime.tryParse(endDate.split('T').first);
    if (s == null || e == null) return 1;
    final diff = e.difference(s).inDays;
    return diff <= 0 ? 1 : diff;
  }

  int get extensionDays {
    final ext = int.tryParse((contractData['extendedDays'] ?? '0').toString()) ?? 0;
    if (ext > 0) return ext;
    final extUntil = (contractData['extensionUntil'] ?? '').toString().trim();
    if (extUntil.isNotEmpty) {
      final origEnd = DateTime.tryParse(endDate.split('T').first);
      final extDate = DateTime.tryParse(extUntil.split('T').first);
      if (origEnd != null && extDate != null && extDate.isAfter(origEnd)) {
        return extDate.difference(origEnd).inDays;
      }
    }
    return 0;
  }

  String get effectiveEndDate {
    final extUntil = (contractData['extensionUntil'] ?? '').toString().trim();
    if (extUntil.isNotEmpty) return extUntil.split('T').first;
    final ext = extensionDays;
    if (ext > 0) {
      final origEnd = DateTime.tryParse(endDate.split('T').first);
      if (origEnd != null) {
        final d = origEnd.add(Duration(days: ext));
        return '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      }
    }
    return endDate.split('T').first;
  }

  int get overdueDays {
    if (!isActive) return 0;
    final effEnd = DateTime.tryParse(effectiveEndDate);
    if (effEnd == null) return 0;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final endDay = DateTime(effEnd.year, effEnd.month, effEnd.day);
    if (today.isAfter(endDay)) {
      return today.difference(endDay).inDays;
    }
    return 0;
  }

  int get durationDays => baseDurationDays + extensionDays + overdueDays;

  double get effectiveTotalAmount {
    if (dailyRate > 0) {
      return dailyRate * durationDays;
    }
    return totalAmount;
  }

  double get remainingAmount =>
      (effectiveTotalAmount - advancePayment).clamp(0, double.infinity);

  String get financialStatus {
    if (remainingAmount <= 0) return 'payé';
    if (advancePayment > 0) return 'en cours';
    return 'en attente';
  }

  bool get isActive =>
      ['ouvert', 'signed', 'sent', 'draft', 'actif'].contains(status.toLowerCase());

  bool get isClosed =>
      ['ferme', 'completed', 'cloture'].contains(status.toLowerCase());

  bool get isOverdue => overdueDays > 0;

  bool get hasDeliverySignature {
    final a = (contractData['delivery_agent_signature'] ??
            contractData['agentSignatureDelivery'] ??
            '')
        .toString()
        .trim();
    final t = (contractData['delivery_tenant_signature'] ??
            contractData['renterSignatureDelivery'] ??
            '')
        .toString()
        .trim();
    return a.isNotEmpty || t.isNotEmpty;
  }

  bool get hasReturnSignature {
    final a = (contractData['return_agent_signature'] ??
            contractData['agentSignatureReturn'] ??
            '')
        .toString()
        .trim();
    final t = (contractData['return_tenant_signature'] ??
            contractData['renterSignatureReturn'] ??
            '')
        .toString()
        .trim();
    return a.isNotEmpty || t.isNotEmpty;
  }

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

    List<DamagePointModel> parseDamages(dynamic val) {
      if (val is List) {
        return val
            .whereType<Map>()
            .map((m) => DamagePointModel.fromJson(Map<String, dynamic>.from(m)))
            .toList();
      }
      return const [];
    }

    final delivFuel = parseNum(
      row['delivery_fuel_level'] ?? rawData['delivery_fuel_level'],
      100,
    ).round().clamp(0, 100);
    final retFuel = parseNum(
      row['return_fuel_level'] ?? rawData['return_fuel_level'],
      100,
    ).round().clamp(0, 100);

    final delivDmg = parseDamages(
      row['delivery_damages'] ?? rawData['delivery_damages'],
    );
    final retDmg = parseDamages(
      row['return_damages'] ?? rawData['return_damages'],
    );

    return ContractModel(
      id: (row['id'] ?? '').toString(),
      contractNumber: (row['contract_number'] ??
              row['contractNumber'] ??
              rawData['contractSerie'] ??
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
              rawData['customerCin'] ??
              rawData['cin'] ??
              '')
          .toString(),
      clientId: (row['client_id'] ??
              rawData['clientId'] ??
              rawData['client_id'] ??
              '')
          .toString(),
      vehicle: (row['vehicle'] ?? rawData['vehicle'] ?? 'Véhicule').toString(),
      vehicleId: (row['vehicleid'] ??
              row['vehicleId'] ??
              row['vehicle_id'] ??
              rawData['vehicleId'] ??
              rawData['vehicle_id'] ??
              '')
          .toString(),
      startDate: (row['start_date'] ?? row['startDate'] ?? now.substring(0, 10))
          .toString(),
      endDate:
          (row['end_date'] ?? row['endDate'] ?? now.substring(0, 10)).toString(),
      dailyRate: parseNum(
          row['daily_rate'] ??
              row['dailyRate'] ??
              rawData['dailyPrice'] ??
              rawData['dailyRate'],
          300),
      totalAmount: parseNum(
          row['total_amount'] ?? row['totalAmount'] ?? rawData['totalPrice'],
          0),
      advancePayment: parseNum(
          row['advance_payment'] ??
              rawData['advance'] ??
              rawData['advancePayment'],
          0),
      paymentMethod: (row['payment_method'] ??
              rawData['paymentMethod'] ??
              'Espèces')
          .toString(),
      status: (row['status'] ?? 'ouvert').toString(),
      notes: (row['notes'] ?? rawData['observationsDelivery'] ?? '').toString(),
      deliveryFuelLevel: delivFuel,
      returnFuelLevel: retFuel,
      deliveryDamages: delivDmg,
      returnDamages: retDmg,
      contractData: rawData,
      createdAt: (row['created_at'] ?? now).toString(),
      updatedAt: (row['updated_at'] ?? now).toString(),
    );
  }

  Map<String, dynamic> toSupabasePayload() {
    final delivDmgJson = deliveryDamages.map((d) => d.toJson()).toList();
    final retDmgJson = returnDamages.map((d) => d.toJson()).toList();

    final isUuid = RegExp(
        r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
    final validVehicleUuid = isUuid.hasMatch(vehicleId) ? vehicleId : null;

    final contractDataPayload = {
      ...contractData,
      if (clientId.isNotEmpty) 'clientId': clientId,
      if (vehicleId.isNotEmpty) 'vehicleId': vehicleId,
      'contractSerie': contractNumber,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'cin': customerCin,
      'vehicle': vehicle,
      'dailyRate': dailyRate,
      'advancePayment': advancePayment,
      'paymentMethod': paymentMethod,
      'originalAmount': totalAmount,
      'delivery_fuel_level': deliveryFuelLevel,
      'return_fuel_level': returnFuelLevel,
      'delivery_damages': delivDmgJson,
      'return_damages': retDmgJson,
    };

    return {
      'contract_number': contractNumber,
      'customer_name': customerName,
      'customer_phone': customerPhone.isEmpty ? null : customerPhone,
      'customer_national_id': customerCin.isEmpty ? null : customerCin,
      'vehicle': vehicle,
      if (validVehicleUuid != null) 'vehicleid': validVehicleUuid,
      'start_date': startDate,
      'end_date': endDate,
      'daily_rate': dailyRate,
      'total_amount': totalAmount,
      'advance_payment': advancePayment,
      'payment_method': paymentMethod.isEmpty ? 'Espèces' : paymentMethod,
      'status': status,
      'notes': notes.isEmpty ? null : notes,
      'delivery_fuel_level': deliveryFuelLevel,
      'return_fuel_level': returnFuelLevel,
      'delivery_damages': delivDmgJson,
      'return_damages': retDmgJson,
      'contract_data': contractDataPayload,
    };
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        ...toSupabasePayload(),
        'created_at': createdAt,
        'updated_at': updatedAt,
      };

  ContractModel copyWith({
    String? id,
    String? contractNumber,
    String? customerName,
    String? customerPhone,
    String? customerCin,
    String? clientId,
    String? vehicle,
    String? vehicleId,
    String? startDate,
    String? endDate,
    double? dailyRate,
    double? totalAmount,
    double? advancePayment,
    String? paymentMethod,
    String? status,
    String? notes,
    int? deliveryFuelLevel,
    int? returnFuelLevel,
    List<DamagePointModel>? deliveryDamages,
    List<DamagePointModel>? returnDamages,
    Map<String, dynamic>? contractData,
    String? createdAt,
    String? updatedAt,
  }) {
    return ContractModel(
      id: id ?? this.id,
      contractNumber: contractNumber ?? this.contractNumber,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      customerCin: customerCin ?? this.customerCin,
      clientId: clientId ?? this.clientId,
      vehicle: vehicle ?? this.vehicle,
      vehicleId: vehicleId ?? this.vehicleId,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      dailyRate: dailyRate ?? this.dailyRate,
      totalAmount: totalAmount ?? this.totalAmount,
      advancePayment: advancePayment ?? this.advancePayment,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      deliveryFuelLevel: deliveryFuelLevel ?? this.deliveryFuelLevel,
      returnFuelLevel: returnFuelLevel ?? this.returnFuelLevel,
      deliveryDamages: deliveryDamages ?? this.deliveryDamages,
      returnDamages: returnDamages ?? this.returnDamages,
      contractData: contractData ?? this.contractData,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
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
