import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/services/contract_pdf_service.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/utils/whatsapp_helper.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import '../../services/supabase_sync_service.dart';
import 'contract_pdf_view_screen.dart';

enum ContractFormMode { create, edit, view }

/// Complete Web-Parity "Formulaire de Contrat" (SFTLOCATION - LOCATION DE VOITURES)
class ContractFormDialog extends StatefulWidget {
  final AppStateProvider appState;
  final ContractModel? existingContract;
  final ContractFormMode mode;

  const ContractFormDialog({
    super.key,
    required this.appState,
    this.existingContract,
    this.mode = ContractFormMode.create,
  });

  @override
  State<ContractFormDialog> createState() => _ContractFormDialogState();
}

class _ContractFormDialogState extends State<ContractFormDialog> {
  final ScrollController _scrollController = ScrollController();

  // Selected quick-fill entities
  String? _selectedTenantId;
  String? _selectedSecondDriverId;
  String? _selectedVehicleId;

  // Contract Serie
  late final TextEditingController _serieCtrl;

  // 1. LOCATAIRE PRINCIPAL (12 fields)
  late final TextEditingController _customerLastNameCtrl;
  late final TextEditingController _customerFirstNameCtrl;
  late final TextEditingController _customerAddressMoroccoCtrl;
  late final TextEditingController _customerPhoneCtrl;
  late final TextEditingController _customerAddressForeignCtrl;
  late final TextEditingController _customerCinCtrl;
  late final TextEditingController _customerCinDeliveredCtrl;
  late final TextEditingController _customerLicenseNumberCtrl;
  late final TextEditingController _customerLicenseDeliveredCtrl;
  late final TextEditingController _customerPassportNumberCtrl;
  late final TextEditingController _customerPassportDeliveredCtrl;
  late final TextEditingController _customerBirthDateCtrl;

  // 2. DEUXIÈME CONDUCTEUR (11 fields)
  late final TextEditingController _secondDriverLastNameCtrl;
  late final TextEditingController _secondDriverFirstNameCtrl;
  late final TextEditingController _secondDriverAddressMoroccoCtrl;
  late final TextEditingController _secondDriverPhoneCtrl;
  late final TextEditingController _secondDriverAddressForeignCtrl;
  late final TextEditingController _secondDriverCinCtrl;
  late final TextEditingController _secondDriverCinDeliveredCtrl;
  late final TextEditingController _secondDriverLicenseNumberCtrl;
  late final TextEditingController _secondDriverLicenseDeliveredCtrl;
  late final TextEditingController _secondDriverPassportNumberCtrl;
  late final TextEditingController _secondDriverPassportDeliveredCtrl;

  // 3. VÉHICULE - LIVRAISON (10 fields + Diagram + Fuel)
  late final TextEditingController _vehicleBrandCtrl;
  late final TextEditingController _vehicleModelCtrl;
  late final TextEditingController _vehicleRegistrationCtrl;
  late final TextEditingController _vehicleYearCtrl;
  late final TextEditingController _vehicleKmDepartCtrl;
  late final TextEditingController _deliveryLocationCtrl;
  late final TextEditingController _deliveryDateTimeCtrl;
  late final TextEditingController _rentalDaysCtrl;
  late final TextEditingController _emergencyEquipmentDeliveryCtrl;
  late final TextEditingController _observationsDeliveryCtrl;
  int _deliveryFuelLevel = 100;
  List<DamagePointModel> _deliveryDamages = [];

  // 4. VÉHICULE - REPRISE (7 fields + Diagram + Fuel)
  late final TextEditingController _returnDateTimeCtrl;
  late final TextEditingController _returnLocationCtrl;
  late final TextEditingController _extensionUntilCtrl;
  late final TextEditingController _vehicleKmReturnCtrl;
  late final TextEditingController _extendedDaysCtrl;
  late final TextEditingController _emergencyEquipmentReturnCtrl;
  late final TextEditingController _observationsReturnCtrl;
  int _returnFuelLevel = 100;
  List<DamagePointModel> _returnDamages = [];

  // 5. FACTURATION
  late final TextEditingController _dailyPriceCtrl;
  late final TextEditingController _advanceCtrl;
  String _paymentMethod = 'Espèces';
  String _status = 'ouvert';

  // 6. SIGNATURES (Dates + 4 Base64 PNG Signatures)
  late final TextEditingController _deliveryDateCtrl;
  late final TextEditingController _returnDateCtrl;
  String _deliveryAgentSignature = '';
  String _deliveryTenantSignature = '';
  String _returnAgentSignature = '';
  String _returnTenantSignature = '';

  bool _isSaving = false;

  bool get _isReadOnly => widget.mode == ContractFormMode.view;

  @override
  void initState() {
    super.initState();
    final c = widget.existingContract;
    final data = c?.contractData ?? const <String, dynamic>{};
    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);
    final tomorrowStr =
        DateFormat('yyyy-MM-dd').format(now.add(const Duration(days: 3)));

    // Parse fallback first/last name if not in contract_data
    String fallbackFirstName = '';
    String fallbackLastName = '';
    if (c != null && c.customerName.trim().isNotEmpty) {
      final parts = c.customerName.trim().split(RegExp(r'\s+'));
      if (parts.length == 1) {
        fallbackLastName = parts.first;
      } else {
        fallbackFirstName = parts.first;
        fallbackLastName = parts.sublist(1).join(' ');
      }
    }

    // Parse fallback vehicle brand/model/year
    String fallbackBrand = '';
    String fallbackModel = '';
    String fallbackYear = '${now.year}';
    if (c != null && c.vehicle.trim().isNotEmpty) {
      final vParts = c.vehicle.trim().split(RegExp(r'\s+'));
      fallbackBrand = vParts.first;
      if (vParts.length > 2 && int.tryParse(vParts.last) != null) {
        fallbackYear = vParts.last;
        fallbackModel = vParts.sublist(1, vParts.length - 1).join(' ');
      } else if (vParts.length > 1) {
        fallbackModel = vParts.sublist(1).join(' ');
      }
    }

    String str(String key, [String fallback = '']) {
      final val = data[key];
      if (val == null || val.toString().trim().isEmpty) return fallback;
      return val.toString();
    }

    _selectedTenantId = c?.clientId.isNotEmpty == true ? c!.clientId : null;
    _selectedVehicleId = c?.vehicleId.isNotEmpty == true ? c!.vehicleId : null;

    _serieCtrl = TextEditingController(
      text: c?.contractNumber.isNotEmpty == true
          ? c!.contractNumber
          : _computeNextSerie(),
    );

    // Locataire Principal
    _customerLastNameCtrl = TextEditingController(
      text: str('customerLastName', fallbackLastName),
    );
    _customerFirstNameCtrl = TextEditingController(
      text: str('customerFirstName', fallbackFirstName),
    );
    _customerAddressMoroccoCtrl = TextEditingController(
      text: str('customerAddressMorocco'),
    );
    _customerPhoneCtrl = TextEditingController(
      text: str('customerPhone', c?.customerPhone ?? ''),
    );
    _customerAddressForeignCtrl = TextEditingController(
      text: str('customerAddressForeign'),
    );
    _customerCinCtrl = TextEditingController(
      text: str('customerCin', c?.customerCin ?? ''),
    );
    _customerCinDeliveredCtrl = TextEditingController(
      text: str('customerCinDelivered'),
    );
    _customerLicenseNumberCtrl = TextEditingController(
      text: str('customerLicenseNumber'),
    );
    _customerLicenseDeliveredCtrl = TextEditingController(
      text: str('customerLicenseDelivered'),
    );
    _customerPassportNumberCtrl = TextEditingController(
      text: str('customerPassportNumber'),
    );
    _customerPassportDeliveredCtrl = TextEditingController(
      text: str('customerPassportDelivered'),
    );
    _customerBirthDateCtrl = TextEditingController(
      text: str('customerBirthDate'),
    );

    // 2ème Conducteur
    _secondDriverLastNameCtrl = TextEditingController(
      text: str('secondDriverLastName'),
    );
    _secondDriverFirstNameCtrl = TextEditingController(
      text: str('secondDriverFirstName'),
    );
    _secondDriverAddressMoroccoCtrl = TextEditingController(
      text: str('secondDriverAddressMorocco'),
    );
    _secondDriverPhoneCtrl = TextEditingController(
      text: str('secondDriverPhone'),
    );
    _secondDriverAddressForeignCtrl = TextEditingController(
      text: str('secondDriverAddressForeign'),
    );
    _secondDriverCinCtrl = TextEditingController(
      text: str('secondDriverCin'),
    );
    _secondDriverCinDeliveredCtrl = TextEditingController(
      text: str('secondDriverCinDelivered'),
    );
    _secondDriverLicenseNumberCtrl = TextEditingController(
      text: str('secondDriverLicenseNumber'),
    );
    _secondDriverLicenseDeliveredCtrl = TextEditingController(
      text: str('secondDriverLicenseDelivered'),
    );
    _secondDriverPassportNumberCtrl = TextEditingController(
      text: str('secondDriverPassportNumber'),
    );
    _secondDriverPassportDeliveredCtrl = TextEditingController(
      text: str('secondDriverPassportDelivered'),
    );

    // Véhicule - Livraison
    _vehicleBrandCtrl = TextEditingController(
      text: str('vehicleBrand', fallbackBrand),
    );
    _vehicleModelCtrl = TextEditingController(
      text: str('vehicleModel', fallbackModel),
    );
    _vehicleRegistrationCtrl = TextEditingController(
      text: str('vehicleRegistration'),
    );
    _vehicleYearCtrl = TextEditingController(
      text: str('vehicleYear', fallbackYear),
    );
    _vehicleKmDepartCtrl = TextEditingController(
      text: str('vehicleKmDepart', '0'),
    );
    _deliveryLocationCtrl = TextEditingController(
      text: str('deliveryLocation', 'Casablanca'),
    );
    final startD = c?.startDate.split('T').first ?? todayStr;
    _deliveryDateTimeCtrl = TextEditingController(
      text: str('deliveryDateTime', '${startD}T09:00'),
    );
    final initDays = c != null ? c.baseDurationDays.toString() : '3';
    _rentalDaysCtrl = TextEditingController(
      text: str('rentalDays', str('rentalDuration', initDays)),
    );
    _emergencyEquipmentDeliveryCtrl = TextEditingController(
      text: str('emergencyEquipmentDelivery', 'Roue de secours, Cric, Triangle, Gilet'),
    );
    _observationsDeliveryCtrl = TextEditingController(
      text: str('observationsDelivery', c?.notes ?? ''),
    );
    _deliveryFuelLevel = c?.deliveryFuelLevel ?? 100;
    _deliveryDamages = List<DamagePointModel>.from(c?.deliveryDamages ?? []);

    // Véhicule - Reprise
    final endD = c?.endDate.split('T').first ?? tomorrowStr;
    _returnDateTimeCtrl = TextEditingController(
      text: str('returnDateTime', c != null ? '${endD}T18:00' : '${tomorrowStr}T18:00'),
    );
    _returnLocationCtrl = TextEditingController(
      text: str('returnLocation'),
    );
    _extensionUntilCtrl = TextEditingController(
      text: str('extensionUntil'),
    );
    _vehicleKmReturnCtrl = TextEditingController(
      text: str('vehicleKmReturn'),
    );
    _extendedDaysCtrl = TextEditingController(
      text: str('extendedDays', '0'),
    );
    _emergencyEquipmentReturnCtrl = TextEditingController(
      text: str('emergencyEquipmentReturn'),
    );
    _observationsReturnCtrl = TextEditingController(
      text: str('observationsReturn'),
    );
    _returnFuelLevel = c?.returnFuelLevel ?? 100;
    _returnDamages = List<DamagePointModel>.from(c?.returnDamages ?? []);

    // Facturation
    _dailyPriceCtrl = TextEditingController(
      text: str(
        'dailyPrice',
        c != null ? c.dailyRate.round().toString() : '300',
      ),
    );
    _advanceCtrl = TextEditingController(
      text: str(
        'advance',
        c != null ? c.advancePayment.round().toString() : '0',
      ),
    );
    final pm = str('paymentMethod', c?.paymentMethod ?? 'Espèces');
    _paymentMethod =
        ['Espèces', 'Chèque', 'Virement'].contains(pm) ? pm : 'Espèces';
    _status = c?.status ?? 'ouvert';

    // Signatures
    _deliveryDateCtrl = TextEditingController(
      text: str('deliveryDate', startD),
    );
    _returnDateCtrl = TextEditingController(
      text: str('returnDate', c != null ? endD : ''),
    );
    _deliveryAgentSignature = str(
      'delivery_agent_signature',
      str('agentSignatureDelivery'),
    );
    _deliveryTenantSignature = str(
      'delivery_tenant_signature',
      str('renterSignatureDelivery'),
    );
    _returnAgentSignature = str(
      'return_agent_signature',
      str('agentSignatureReturn'),
    );
    _returnTenantSignature = str(
      'return_tenant_signature',
      str('renterSignatureReturn'),
    );
  }

  String _computeNextSerie() {
    final contracts = widget.appState.contracts;
    if (contracts.isEmpty) return '1';
    int maxSimple = 0;
    int maxBona = 0;
    bool hasBona = false;
    final currentYear = DateTime.now().year;

    for (final c in contracts) {
      final numStr = c.contractNumber.trim();
      final bonaMatch = RegExp(r'BONA(\d{4})(\d{3})').firstMatch(numStr);
      if (bonaMatch != null) {
        hasBona = true;
        final yr = int.tryParse(bonaMatch.group(1)!) ?? currentYear;
        final seq = int.tryParse(bonaMatch.group(2)!) ?? 0;
        if (yr == currentYear && seq > maxBona) maxBona = seq;
      } else {
        final digits = int.tryParse(numStr.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
        if (digits > maxSimple && digits < 1000000) maxSimple = digits;
      }
    }

    if (hasBona && maxSimple == 0) {
      return 'BONA$currentYear${(maxBona + 1).toString().padLeft(3, '0')}';
    }
    return '${maxSimple + 1}';
  }

  String get _lastUsedSerie {
    final contracts = widget.appState.contracts;
    if (contracts.isEmpty) return 'Aucune';
    return contracts.first.contractNumber;
  }

  void _applySelectedClient(ClientModel client, {bool isSecondDriver = false}) {
    setState(() {
      if (!isSecondDriver) {
        _selectedTenantId = client.id;
        _customerLastNameCtrl.text = client.lastName;
        _customerFirstNameCtrl.text = client.firstName;
        _customerAddressMoroccoCtrl.text = client.addressMorocco;
        _customerPhoneCtrl.text = client.phone;
        _customerAddressForeignCtrl.text = client.addressForeign;
        _customerCinCtrl.text = client.cin;
        _customerCinDeliveredCtrl.text = client.cinDelivered;
        _customerLicenseNumberCtrl.text = client.licenseNumber;
        _customerLicenseDeliveredCtrl.text = client.licenseDelivered;
        _customerPassportNumberCtrl.text = client.passportNumber;
        _customerBirthDateCtrl.text = client.birthDate;
      } else {
        _selectedSecondDriverId = client.id;
        _secondDriverLastNameCtrl.text = client.lastName;
        _secondDriverFirstNameCtrl.text = client.firstName;
        _secondDriverAddressMoroccoCtrl.text = client.addressMorocco;
        _secondDriverPhoneCtrl.text = client.phone;
        _secondDriverAddressForeignCtrl.text = client.addressForeign;
        _secondDriverCinCtrl.text = client.cin;
        _secondDriverCinDeliveredCtrl.text = client.cinDelivered;
        _secondDriverLicenseNumberCtrl.text = client.licenseNumber;
        _secondDriverLicenseDeliveredCtrl.text = client.licenseDelivered;
        _secondDriverPassportNumberCtrl.text = client.passportNumber;
      }
    });
  }

  void _applySelectedVehicle(VehicleModel vehicle) {
    setState(() {
      _selectedVehicleId = vehicle.id;
      _vehicleBrandCtrl.text = vehicle.brand;
      _vehicleModelCtrl.text = vehicle.model;
      _vehicleRegistrationCtrl.text = vehicle.registration;
      _vehicleYearCtrl.text = vehicle.year.toString();
      _vehicleKmDepartCtrl.text = vehicle.mileage > 0
          ? vehicle.mileage.round().toString()
          : vehicle.departureMileage.round().toString();
      _dailyPriceCtrl.text = vehicle.dailyRate.round().toString();
    });
  }

  int get _baseDays {
    final manual = int.tryParse(_rentalDaysCtrl.text.trim()) ?? 0;
    if (manual > 0) return manual;
    final s = DateTime.tryParse(_deliveryDateTimeCtrl.text.split('T').first);
    final e = DateTime.tryParse(_returnDateTimeCtrl.text.split('T').first);
    if (s != null && e != null) {
      final d = e.difference(s).inDays;
      return d <= 0 ? 1 : d;
    }
    return 1;
  }

  int get _extendedDays => int.tryParse(_extendedDaysCtrl.text.trim()) ?? 0;

  int get _totalDuration => (_baseDays + _extendedDays).clamp(1, 9999);

  double get _dailyPrice =>
      double.tryParse(_dailyPriceCtrl.text.trim()) ?? 0;

  double get _totalPrice => _dailyPrice * _totalDuration;

  double get _advance => double.tryParse(_advanceCtrl.text.trim()) ?? 0;

  double get _remaining =>
      (_totalPrice - _advance).clamp(0, double.infinity);

  /// Automatic closure check matching Web `shouldCloseContract()`
  bool get _shouldAutoClose {
    final fields = [
      _returnDateTimeCtrl.text.trim(),
      _returnLocationCtrl.text.trim(),
      _vehicleKmReturnCtrl.text.trim(),
      _returnDateCtrl.text.trim(),
    ];
    final filledCount =
        fields.where((f) => f.isNotEmpty && f != '0').length;
    return filledCount >= 3;
  }

  void _recalculateFromDates() {
    final s = DateTime.tryParse(_deliveryDateTimeCtrl.text.split('T').first);
    final e = DateTime.tryParse(_returnDateTimeCtrl.text.split('T').first);
    if (s != null && e != null) {
      final diff = e.difference(s).inDays;
      setState(() {
        _rentalDaysCtrl.text = (diff <= 0 ? 1 : diff).toString();
      });
    }
  }

  Future<void> _pickDateForField(
    TextEditingController ctrl, {
    bool includeTime = false,
    VoidCallback? onPicked,
  }) async {
    if (_isReadOnly) return;
    final initial =
        DateTime.tryParse(ctrl.text.split('T').first) ?? DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1950),
      lastDate: DateTime(2035),
    );
    if (date == null || !mounted) return;
    final datePart = DateFormat('yyyy-MM-dd').format(date);

    if (includeTime) {
      final time = await showTimePicker(
        context: context,
        initialTime: const TimeOfDay(hour: 9, minute: 0),
      );
      final hh = (time?.hour ?? 9).toString().padLeft(2, '0');
      final mm = (time?.minute ?? 0).toString().padLeft(2, '0');
      setState(() {
        ctrl.text = '${datePart}T$hh:$mm';
      });
    } else {
      setState(() {
        ctrl.text = datePart;
      });
    }
    onPicked?.call();
  }

  Map<String, dynamic> _buildFullFormDataMap() {
    return {
      'contractSerie': _serieCtrl.text.trim(),
      // Locataire Principal
      'customerLastName': _customerLastNameCtrl.text.trim(),
      'customerFirstName': _customerFirstNameCtrl.text.trim(),
      'customerAddressMorocco': _customerAddressMoroccoCtrl.text.trim(),
      'customerPhone': _customerPhoneCtrl.text.trim(),
      'customerAddressForeign': _customerAddressForeignCtrl.text.trim(),
      'customerCin': _customerCinCtrl.text.trim(),
      'customerCinDelivered': _customerCinDeliveredCtrl.text.trim(),
      'customerLicenseNumber': _customerLicenseNumberCtrl.text.trim(),
      'customerLicenseDelivered': _customerLicenseDeliveredCtrl.text.trim(),
      'customerPassportNumber': _customerPassportNumberCtrl.text.trim(),
      'customerPassportDelivered': _customerPassportDeliveredCtrl.text.trim(),
      'customerBirthDate': _customerBirthDateCtrl.text.trim(),
      // 2ème Conducteur
      'secondDriverLastName': _secondDriverLastNameCtrl.text.trim(),
      'secondDriverFirstName': _secondDriverFirstNameCtrl.text.trim(),
      'secondDriverAddressMorocco': _secondDriverAddressMoroccoCtrl.text.trim(),
      'secondDriverPhone': _secondDriverPhoneCtrl.text.trim(),
      'secondDriverAddressForeign': _secondDriverAddressForeignCtrl.text.trim(),
      'secondDriverCin': _secondDriverCinCtrl.text.trim(),
      'secondDriverCinDelivered': _secondDriverCinDeliveredCtrl.text.trim(),
      'secondDriverLicenseNumber': _secondDriverLicenseNumberCtrl.text.trim(),
      'secondDriverLicenseDelivered':
          _secondDriverLicenseDeliveredCtrl.text.trim(),
      'secondDriverPassportNumber': _secondDriverPassportNumberCtrl.text.trim(),
      'secondDriverPassportDelivered':
          _secondDriverPassportDeliveredCtrl.text.trim(),
      // Véhicule - Livraison
      'vehicleBrand': _vehicleBrandCtrl.text.trim(),
      'vehicleModel': _vehicleModelCtrl.text.trim(),
      'vehicleRegistration': _vehicleRegistrationCtrl.text.trim(),
      'vehicleYear': _vehicleYearCtrl.text.trim(),
      'vehicleKmDepart': _vehicleKmDepartCtrl.text.trim(),
      'deliveryLocation': _deliveryLocationCtrl.text.trim(),
      'deliveryDateTime': _deliveryDateTimeCtrl.text.trim(),
      'rentalDays': _baseDays.toString(),
      'rentalDuration': _totalDuration.toString(),
      'emergencyEquipmentDelivery': _emergencyEquipmentDeliveryCtrl.text.trim(),
      'observationsDelivery': _observationsDeliveryCtrl.text.trim(),
      'delivery_fuel_level': _deliveryFuelLevel,
      'delivery_damages': _deliveryDamages.map((d) => d.toJson()).toList(),
      // Véhicule - Reprise
      'returnDateTime': _returnDateTimeCtrl.text.trim(),
      'returnLocation': _returnLocationCtrl.text.trim(),
      'extensionUntil': _extensionUntilCtrl.text.trim(),
      'vehicleKmReturn': _vehicleKmReturnCtrl.text.trim(),
      'extendedDays': _extendedDays.toString(),
      'emergencyEquipmentReturn': _emergencyEquipmentReturnCtrl.text.trim(),
      'observationsReturn': _observationsReturnCtrl.text.trim(),
      'return_fuel_level': _returnFuelLevel,
      'return_damages': _returnDamages.map((d) => d.toJson()).toList(),
      // Facturation
      'dailyPrice': _dailyPrice.round().toString(),
      'totalPrice': _totalPrice.round().toString(),
      'advance': _advance.round().toString(),
      'remaining': _remaining.round().toString(),
      'paymentMethod': _paymentMethod,
      // Signatures
      'deliveryDate': _deliveryDateCtrl.text.trim(),
      'returnDate': _returnDateCtrl.text.trim(),
      'delivery_agent_signature': _deliveryAgentSignature,
      'delivery_tenant_signature': _deliveryTenantSignature,
      'return_agent_signature': _returnAgentSignature,
      'return_tenant_signature': _returnTenantSignature,
    };
  }

  ContractModel _buildContractModel() {
    final nowIso = DateTime.now().toIso8601String();
    final fullName =
        '${_customerFirstNameCtrl.text.trim()} ${_customerLastNameCtrl.text.trim()}'
            .trim();
    final vehicleLabel =
        '${_vehicleBrandCtrl.text.trim()} ${_vehicleModelCtrl.text.trim()} ${_vehicleYearCtrl.text.trim()}'
            .trim();
    final startDate = _deliveryDateTimeCtrl.text.split('T').first;
    final endDate = _returnDateTimeCtrl.text.trim().isNotEmpty
        ? _returnDateTimeCtrl.text.split('T').first
        : startDate;

    final finalStatus = _shouldAutoClose ? 'ferme' : _status;

    return ContractModel(
      id: widget.existingContract?.id ?? '',
      contractNumber: _serieCtrl.text.trim().isEmpty
          ? _computeNextSerie()
          : _serieCtrl.text.trim(),
      customerName: fullName.isEmpty ? 'Client' : fullName,
      customerPhone: _customerPhoneCtrl.text.trim(),
      customerCin: _customerCinCtrl.text.trim(),
      clientId: _selectedTenantId ?? widget.existingContract?.clientId ?? '',
      vehicle: vehicleLabel.isEmpty ? 'Véhicule' : vehicleLabel,
      vehicleId: _selectedVehicleId ?? widget.existingContract?.vehicleId ?? '',
      startDate: startDate,
      endDate: endDate,
      dailyRate: _dailyPrice,
      totalAmount: _totalPrice,
      advancePayment: _advance,
      paymentMethod: _paymentMethod,
      status: finalStatus,
      notes: _observationsDeliveryCtrl.text.trim(),
      deliveryFuelLevel: _deliveryFuelLevel,
      returnFuelLevel: _returnFuelLevel,
      deliveryDamages: _deliveryDamages,
      returnDamages: _returnDamages,
      contractData: _buildFullFormDataMap(),
      createdAt: widget.existingContract?.createdAt ?? nowIso,
      updatedAt: nowIso,
    );
  }

  Future<void> _handleSave() async {
    if (_customerLastNameCtrl.text.trim().isEmpty ||
        _vehicleBrandCtrl.text.trim().isEmpty ||
        _deliveryDateTimeCtrl.text.trim().isEmpty ||
        _dailyPrice <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors2026.roseLaser,
          content: Text(
            'Veuillez remplir les champs obligatoires : Nom du locataire, Marque du véhicule, Date de livraison et Prix par jour.',
          ),
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final model = _buildContractModel();
      await widget.appState.saveContract(
        model,
        isEdit: widget.mode == ContractFormMode.edit,
      );
      if (!mounted) return;
      Navigator.pop(context, model);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors2026.emeraldNeon,
          content: Text(
            widget.mode == ContractFormMode.edit
                ? 'Contrat #${model.contractNumber} mis à jour et synchronisé avec le Web !'
                : 'Nouveau Contrat #${model.contractNumber} créé (Ouvert) et synchronisé !',
            style: const TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors2026.roseLaser,
            content: Text('Erreur de synchronisation : $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _shareViaWhatsApp() {
    final c = _buildContractModel();
    final d = c.contractData;
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final text = '''
📄 *CONTRAT DE LOCATION - BONATOURS*
━━━━━━━━━━━━━━━━━━━━━━
🔢 *N° Contrat (Série)* : #${c.contractNumber}
📌 *Statut* : ${c.isClosed ? 'Fermé / Clôturé' : 'Ouvert / En cours'}

👤 *LOCATAIRE PRINCIPAL*
• Nom & Prénom : ${c.customerName}
• Tél : ${c.customerPhone.isEmpty ? '-' : c.customerPhone}
• CIN : ${c.customerCin.isEmpty ? '-' : c.customerCin} (Délivré le: ${d['customerCinDelivered'] ?? '-'})
• Permis N° : ${d['customerLicenseNumber'] ?? '-'} (Délivré le: ${d['customerLicenseDelivered'] ?? '-'})
• Passeport N° : ${d['customerPassportNumber'] ?? '-'}
• Adresse Maroc : ${d['customerAddressMorocco'] ?? '-'}
${(d['secondDriverLastName'] ?? '').toString().isNotEmpty ? '\n👥 *2ÈME CONDUCTEUR*\n• ${d['secondDriverFirstName']} ${d['secondDriverLastName']} | CIN: ${d['secondDriverCin'] ?? '-'} | Permis: ${d['secondDriverLicenseNumber'] ?? '-'}\n' : ''}
🚗 *VÉHICULE*
• Véhicule : ${c.vehicle}
• Immatriculation : ${d['vehicleRegistration'] ?? '-'}
• Km Départ : ${d['vehicleKmDepart'] ?? '0'} km | Carburant Livraison : ${c.deliveryFuelLevel}%
• Livraison : ${d['deliveryDateTime'] ?? c.startDate} (${d['deliveryLocation'] ?? 'Casablanca'})
• Retour prévu : ${d['returnDateTime'] ?? c.endDate} (${d['returnLocation'] ?? '-'})
• Durée : $_totalDuration jour(s)${_extendedDays > 0 ? ' (dont +$_extendedDays j prolongé)' : ''}

💰 *FACTURATION*
• Prix / Jour : ${fmt.format(c.dailyRate)} DH
• Total TTC : ${fmt.format(c.totalAmount)} DH
• Avance : ${fmt.format(c.advancePayment)} DH
• Reste à Payer : ${fmt.format(c.remainingAmount)} DH
• Mode de Règlement : ${c.paymentMethod}
━━━━━━━━━━━━━━━━━━━━━━
📍 BONATOURS - 10 Av. des FAR, 3ème Étage Bureau N°308, Casablanca
📞 Tél: 05 22 22 87 04 • GSM: 06 62 59 63 07
''';

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors2026.obsidianSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.fileText, color: AppColors2026.cyanNeon, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Contrat BonaTours #${c.contractNumber}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              ListTile(
                leading: const Icon(LucideIcons.messageSquare, color: AppColors2026.emeraldNeon),
                title: const Text('Partager Résumé WhatsApp'),
                subtitle: const Text('Envoi du récapitulatif par message'),
                onTap: () {
                  Navigator.pop(ctx);
                  WhatsAppHelper.shareTextMessage(phone: c.customerPhone, message: text);
                },
              ),
              ListTile(
                leading: const Icon(LucideIcons.fileText, color: AppColors2026.cyanBright),
                title: const Text('Partager PDF Contrat (WhatsApp / Autres)'),
                subtitle: const Text('Document PDF officiel identique au Web'),
                onTap: () async {
                  Navigator.pop(ctx);
                  final pdfBytes = await ContractPdfService.generateContractPdf(c);
                  await WhatsAppHelper.sharePdf(
                    bytes: pdfBytes,
                    filename: 'Contrat_${c.contractNumber.replaceAll("/", "_")}.pdf',
                    subject: 'Contrat BonaTours #${c.contractNumber}',
                    phone: c.customerPhone,
                  );
                },
              ),
              ListTile(
                leading: const Icon(LucideIcons.printer, color: AppColors2026.amberSolar),
                title: const Text('Télécharger / Imprimer PDF Contrat'),
                subtitle: const Text('Sauvegarder ou imprimer le contrat officiel'),
                onTap: () async {
                  Navigator.pop(ctx);
                  final pdfBytes = await ContractPdfService.generateContractPdf(c);
                  await WhatsAppHelper.printOrDownloadPdf(
                    bytes: pdfBytes,
                    filename: 'Contrat_${c.contractNumber.replaceAll("/", "_")}',
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openPrintableContractPreview() {
    final c = _buildContractModel();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OfficialContractPdfViewScreen(contract: c),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final titleText = widget.mode == ContractFormMode.create
        ? 'Nouveau Contrat de Location'
        : widget.mode == ContractFormMode.edit
            ? 'Modifier le Contrat #${_serieCtrl.text}'
            : 'Détails du Contrat #${_serieCtrl.text}';

    return Scaffold(
      backgroundColor: AppColors2026.abyss,
      appBar: AppBar(
        backgroundColor: AppColors2026.obsidian,
        leading: IconButton(
          icon: const Icon(LucideIcons.x),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              titleText,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
            ),
            Text(
              'Formulaire Officiel ${SupabaseSyncService.currentCompanyName.isNotEmpty ? SupabaseSyncService.currentCompanyName : "BOUNATOURS"} • Synchronisé Web & Mobile',
              style: TextStyle(
                fontSize: 10,
                color: AppColors2026.cyanBright.withOpacity(0.9),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Aperçu Contrat Officiel / PDF',
            onPressed: _openPrintableContractPreview,
            icon: const Icon(
              LucideIcons.fileText,
              color: AppColors2026.cyanNeon,
              size: 20,
            ),
          ),
          IconButton(
            tooltip: 'Partager WhatsApp',
            onPressed: _shareViaWhatsApp,
            icon: const Icon(
              LucideIcons.share2,
              color: AppColors2026.emeraldNeon,
              size: 20,
            ),
          ),
          if (!_isReadOnly)
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: ElevatedButton.icon(
                onPressed: _isSaving ? null : _handleSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors2026.emeraldNeon,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                ),
                icon: const Icon(LucideIcons.check, size: 15),
                label: Text(
                  widget.mode == ContractFormMode.create ? 'Créer' : 'Sauver',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                ),
              ),
            ),
        ],
      ),
      body: ListView(
        controller: _scrollController,
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 110),
        children: [
          // ── 1. OFFICIAL SFTLOCATION HEADER & SÉRIE DU CONTRAT ──
          _buildOfficialHeaderCard(),
          const SizedBox(height: 16),

          // ── 2. SÉLECTION RAPIDE CLIENT & VÉHICULE (Auto-fill) ──
          if (!_isReadOnly) ...[
            _buildQuickSelectorsCard(),
            const SizedBox(height: 16),
          ],

          // ── 3. SECTION LOCATAIRE (Locataire Principal + 2ème Conducteur) ──
          _buildSectionHeaderBanner(
            title: 'LOCATAIRE',
            subtitle: 'Informations du Conducteur Principal & 2ème Conducteur',
            icon: LucideIcons.users,
            color: AppColors2026.cyanNeon,
          ),
          const SizedBox(height: 10),
          _buildLocataireSection(),
          const SizedBox(height: 20),

          // ── 4. SECTION VÉHICULE (Livraison + Diagramme + Carburant + Reprise) ──
          _buildSectionHeaderBanner(
            title: 'VÉHICULE',
            subtitle:
                'Livraison du Véhicule, Inspection Dommages, Carburant & Reprise',
            icon: LucideIcons.car,
            color: AppColors2026.emeraldNeon,
          ),
          const SizedBox(height: 10),
          _buildVehiculeSection(),
          const SizedBox(height: 20),

          // ── 5. SECTION FACTURATION ──
          _buildSectionHeaderBanner(
            title: 'FACTURATION',
            subtitle: 'Tarification, Durée, Avance, Reste à Payer & Règlement',
            icon: LucideIcons.creditCard,
            color: AppColors2026.amberSolar,
          ),
          const SizedBox(height: 10),
          _buildFacturationSection(fmt),
          const SizedBox(height: 20),

          // ── 6. SECTION SIGNATURES ÉLECTRONIQUES (Livraison & Retour) ──
          _buildSectionHeaderBanner(
            title: 'SIGNATURES',
            subtitle: 'Signatures à la Livraison et au Retour (Agent & Locataire)',
            icon: LucideIcons.penTool,
            color: AppColors2026.violetElectric,
          ),
          const SizedBox(height: 10),
          _buildSignaturesSection(),
          const SizedBox(height: 24),

          // ── 7. BOTTOM ACTION BAR (Same as Web NewContractDialog / EnhancedContractFormDialog) ──
          _buildBottomActionBar(),
        ],
      ),
    );
  }

  Widget _buildOfficialHeaderCard() {
    return SpatialGlassCard(
      borderColor: AppColors2026.cyanNeon.withOpacity(0.4),
      glowColor: AppColors2026.cyanNeon,
      padding: const EdgeInsets.all(18),
      child: Column(
        children: [
          Text(
            SupabaseSyncService.currentCompanyName.isNotEmpty
                ? SupabaseSyncService.currentCompanyName
                : 'BOUNATOURS',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: AppColors2026.cyanBright,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'LOCATION DE VOITURES',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              letterSpacing: 2.0,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc\n'
            'Tél: 0522228704 - Fax: 05 22 47 17 80 • GSM: 06 62 59 63 07\n'
            'E-mail: bonatours308@gmail.com',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              height: 1.45,
              color: AppColors2026.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Courte et longue durée 7/7',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors2026.emeraldBright,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 7),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors2026.cyanNeon, width: 1.6),
              borderRadius: BorderRadius.circular(12),
              color: AppColors2026.cyanNeon.withOpacity(0.1),
            ),
            child: const Text(
              'CONTRAT DE LOCATION',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.1,
              ),
            ),
          ),
          const SizedBox(height: 14),
          // Série / Numéro du contrat row
          Row(
            children: [
              const Text(
                'N° / Série :',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _serieCtrl,
                  readOnly: _isReadOnly,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                    color: AppColors2026.cyanBright,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'Ex: 1 ou BONA2026001',
                    isDense: true,
                  ),
                ),
              ),
              if (!_isReadOnly) ...[
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      _serieCtrl.text = _computeNextSerie();
                    });
                  },
                  icon: const Icon(LucideIcons.sparkles, size: 14),
                  label: const Text('Suivant', style: TextStyle(fontSize: 12)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Dernière série utilisée : $_lastUsedSerie',
            style: const TextStyle(
              fontSize: 11,
              color: AppColors2026.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickSelectorsCard() {
    final clients = widget.appState.clients;
    final vehicles = widget.appState.vehicles;

    return SpatialGlassCard(
      padding: const EdgeInsets.all(14),
      borderColor: AppColors2026.violetElectric.withOpacity(0.35),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                LucideIcons.zap,
                size: 16,
                color: AppColors2026.violetElectric,
              ),
              SizedBox(width: 8),
              Text(
                'SÉLECTION RAPIDE (REMPLISSAGE AUTOMATIQUE)',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: AppColors2026.violetElectric,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: clients.any((c) => c.id == _selectedTenantId)
                ? _selectedTenantId
                : null,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Sélectionner un Client (Locataire Principal)',
              prefixIcon: Icon(LucideIcons.userCheck, size: 18),
              isDense: true,
            ),
            items: clients
                .map(
                  (c) => DropdownMenuItem<String>(
                    value: c.id,
                    child: Text(
                      '${c.fullName} — CIN: ${c.cin.isEmpty ? "N/A" : c.cin} (${c.phone})',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )
                .toList(),
            onChanged: (id) {
              final found = clients.where((c) => c.id == id).firstOrNull;
              if (found != null) _applySelectedClient(found);
            },
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: vehicles.any((v) => v.id == _selectedVehicleId)
                ? _selectedVehicleId
                : null,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Sélectionner un Véhicule du Parc',
              prefixIcon: Icon(LucideIcons.car, size: 18),
              isDense: true,
            ),
            items: vehicles
                .map(
                  (v) => DropdownMenuItem<String>(
                    value: v.id,
                    child: Text(
                      '${v.fullName} (${v.registration}) — ${v.dailyRate.round()} DH/j [${v.status.toUpperCase()}]',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )
                .toList(),
            onChanged: (id) {
              final found = vehicles.where((v) => v.id == id).firstOrNull;
              if (found != null) _applySelectedVehicle(found);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeaderBanner({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            color.withOpacity(0.24),
            AppColors2026.obsidian.withOpacity(0.9),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withOpacity(0.45)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors2026.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocataireSection() {
    final clients = widget.appState.clients;

    return Column(
      children: [
        // 1. Conducteur Principal
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.user, size: 16, color: AppColors2026.cyanNeon),
                  SizedBox(width: 8),
                  Text(
                    'LOCATAIRE PRINCIPAL (CONDUCTEUR PRINCIPAL)',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: AppColors2026.cyanBright,
                    ),
                  ),
                ],
              ),
              const Divider(height: 20, color: Colors.white12),
              Row(
                children: [
                  Expanded(
                    child: _field('Nom *', _customerLastNameCtrl),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field('Prénom', _customerFirstNameCtrl),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _field('Adresse au Maroc', _customerAddressMoroccoCtrl),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field(
                      'Tél.',
                      _customerPhoneCtrl,
                      keyboardType: TextInputType.phone,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field(
                      "Adresse à l'Étranger",
                      _customerAddressForeignCtrl,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field('C.I.N. N°', _customerCinCtrl),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _dateField(
                      'Délivré le (CIN)',
                      _customerCinDeliveredCtrl,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field('Permis N°', _customerLicenseNumberCtrl),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _dateField(
                      'Délivré le (Permis)',
                      _customerLicenseDeliveredCtrl,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field('Passeport N°', _customerPassportNumberCtrl),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _dateField(
                      'Délivré le (Passeport)',
                      _customerPassportDeliveredCtrl,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _dateField('Date de Naissance', _customerBirthDateCtrl),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. 2ème Conducteur
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    LucideIcons.userPlus,
                    size: 16,
                    color: AppColors2026.violetElectric,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      '2ÈME CONDUCTEUR (OPTIONNEL)',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: AppColors2026.violetElectric,
                      ),
                    ),
                  ),
                  if (!_isReadOnly && clients.isNotEmpty)
                    PopupMenuButton<ClientModel>(
                      tooltip: 'Choisir parmi les clients',
                      onSelected: (c) =>
                          _applySelectedClient(c, isSecondDriver: true),
                      itemBuilder: (_) => clients
                          .map(
                            (c) => PopupMenuItem(
                              value: c,
                              child: Text('${c.fullName} (${c.cin})'),
                            ),
                          )
                          .toList(),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors2026.violetElectric.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'Choisir Client',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: AppColors2026.violetElectric,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const Divider(height: 20, color: Colors.white12),
              Row(
                children: [
                  Expanded(
                    child: _field('Nom (2ème)', _secondDriverLastNameCtrl),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field('Prénom (2ème)', _secondDriverFirstNameCtrl),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _field(
                'Adresse au Maroc (2ème)',
                _secondDriverAddressMoroccoCtrl,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field(
                      'Tél. (2ème)',
                      _secondDriverPhoneCtrl,
                      keyboardType: TextInputType.phone,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field(
                      "Adresse à l'Étranger (2ème)",
                      _secondDriverAddressForeignCtrl,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field('C.I.N. N° (2ème)', _secondDriverCinCtrl),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _dateField(
                      'Délivré le (CIN)',
                      _secondDriverCinDeliveredCtrl,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field(
                      'Passeport N° (2ème)',
                      _secondDriverPassportNumberCtrl,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _dateField(
                      'Délivré le (Passeport)',
                      _secondDriverPassportDeliveredCtrl,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field(
                      'Permis N° (2ème)',
                      _secondDriverLicenseNumberCtrl,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _dateField(
                      'Délivré le (Permis)',
                      _secondDriverLicenseDeliveredCtrl,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVehiculeSection() {
    return Column(
      children: [
        // 1. Livraison du Véhicule
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(
                    LucideIcons.key,
                    size: 16,
                    color: AppColors2026.emeraldNeon,
                  ),
                  SizedBox(width: 8),
                  Text(
                    'LIVRAISON DU VÉHICULE (DÉPART)',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: AppColors2026.emeraldBright,
                    ),
                  ),
                ],
              ),
              const Divider(height: 20, color: Colors.white12),
              Row(
                children: [
                  Expanded(child: _field('Marque *', _vehicleBrandCtrl)),
                  const SizedBox(width: 10),
                  Expanded(child: _field('Modèle', _vehicleModelCtrl)),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field('Immatricule', _vehicleRegistrationCtrl),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field(
                      'Année',
                      _vehicleYearCtrl,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field(
                      'Km Départ',
                      _vehicleKmDepartCtrl,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field('Lieu de Livraison', _deliveryLocationCtrl),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: _dateField(
                      'Date et Heure de Livraison *',
                      _deliveryDateTimeCtrl,
                      includeTime: true,
                      onPicked: _recalculateFromDates,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: _field(
                      'Nombre de Jours ⚡',
                      _rentalDaysCtrl,
                      keyboardType: TextInputType.number,
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Interactive Vehicle Diagram - Livraison
              VehicleDiagramInteractiveWidget(
                title: 'État du Véhicule - Livraison (Touchez pour marquer les dommages)',
                damages: _deliveryDamages,
                readOnly: _isReadOnly,
                onChanged: (list) => setState(() => _deliveryDamages = list),
              ),
              const SizedBox(height: 14),

              // Interactive Fuel Gauge - Livraison
              FuelGaugeInteractiveWidget(
                label: 'Niveau de carburant à la livraison',
                value: _deliveryFuelLevel,
                readOnly: _isReadOnly,
                onChanged: (v) => setState(() => _deliveryFuelLevel = v),
              ),
              const SizedBox(height: 14),

              _field(
                'Roues de secours et accessoires (Livraison)',
                _emergencyEquipmentDeliveryCtrl,
                maxLines: 2,
              ),
              const SizedBox(height: 10),
              _field(
                'Observations (Livraison)',
                _observationsDeliveryCtrl,
                maxLines: 2,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. Reprise du Véhicule
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    LucideIcons.rotateCcw,
                    size: 16,
                    color: AppColors2026.amberSolar,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'REPRISE DU VÉHICULE (RETOUR & PROLONGATION)',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: AppColors2026.amberSolar,
                      ),
                    ),
                  ),
                  if (_shouldAutoClose)
                    const NeonBadge(
                      label: 'CLÔTURE AUTO',
                      color: AppColors2026.emeraldNeon,
                    ),
                ],
              ),
              const Divider(height: 20, color: Colors.white12),
              Row(
                children: [
                  Expanded(
                    child: _dateField(
                      'Date et Heure de Récupération',
                      _returnDateTimeCtrl,
                      includeTime: true,
                      onPicked: _recalculateFromDates,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field('Lieu de Récupération', _returnLocationCtrl),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _dateField(
                      'Prolongation au',
                      _extensionUntilCtrl,
                      onPicked: () {
                        final orig = DateTime.tryParse(
                          _returnDateTimeCtrl.text.split('T').first,
                        );
                        final ext = DateTime.tryParse(
                          _extensionUntilCtrl.text.split('T').first,
                        );
                        if (orig != null && ext != null && ext.isAfter(orig)) {
                          setState(() {
                            _extendedDaysCtrl.text =
                                ext.difference(orig).inDays.toString();
                          });
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field(
                      'Km de Retour',
                      _vehicleKmReturnCtrl,
                      keyboardType: TextInputType.number,
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _field(
                'Nombre de Jour Prolongé',
                _extendedDaysCtrl,
                keyboardType: TextInputType.number,
                onChanged: (val) {
                  final extDays = int.tryParse(val.trim()) ?? 0;
                  final orig = DateTime.tryParse(
                    _returnDateTimeCtrl.text.split('T').first,
                  );
                  if (orig != null && extDays > 0) {
                    final target = orig.add(Duration(days: extDays));
                    _extensionUntilCtrl.text =
                        DateFormat('yyyy-MM-dd').format(target);
                  } else if (extDays == 0) {
                    _extensionUntilCtrl.text = '';
                  }
                  setState(() {});
                },
              ),
              const SizedBox(height: 16),

              // Interactive Vehicle Diagram - Retour
              VehicleDiagramInteractiveWidget(
                title: 'État du Véhicule - Retour (Touchez pour marquer les dommages)',
                damages: _returnDamages,
                readOnly: _isReadOnly,
                onChanged: (list) => setState(() => _returnDamages = list),
              ),
              const SizedBox(height: 14),

              // Interactive Fuel Gauge - Retour
              FuelGaugeInteractiveWidget(
                label: 'Niveau de carburant au retour',
                value: _returnFuelLevel,
                readOnly: _isReadOnly,
                onChanged: (v) => setState(() => _returnFuelLevel = v),
              ),
              const SizedBox(height: 14),

              _field(
                'Roues de secours et accessoires (Retour)',
                _emergencyEquipmentReturnCtrl,
                maxLines: 2,
              ),
              const SizedBox(height: 10),
              _field(
                'Observations (Retour)',
                _observationsReturnCtrl,
                maxLines: 2,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFacturationSection(NumberFormat fmt) {
    return SpatialGlassCard(
      padding: const EdgeInsets.all(16),
      borderColor: AppColors2026.amberSolar.withOpacity(0.35),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _field(
                  'Prix par Jour * (DH)',
                  _dailyPriceCtrl,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors2026.emeraldNeon.withOpacity(0.14),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors2026.emeraldNeon.withOpacity(0.45),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '📊 Durée de Location',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: AppColors2026.emeraldBright,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$_totalDuration jours',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: AppColors2026.emeraldBright,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _field(
                  'Avance Initiale (DH)',
                  _advanceCtrl,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _paymentMethod,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Mode de Règlement *',
                    isDense: true,
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'Espèces',
                      child: Text('Espèces', overflow: TextOverflow.ellipsis),
                    ),
                    DropdownMenuItem(
                      value: 'Virement',
                      child: Text('Virement', overflow: TextOverflow.ellipsis),
                    ),
                    DropdownMenuItem(
                      value: 'Chèque',
                      child: Text('Chèque', overflow: TextOverflow.ellipsis),
                    ),
                  ],
                  onChanged: _isReadOnly
                      ? null
                      : (v) => setState(() => _paymentMethod = v ?? 'Espèces'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Live Financial Summary Boxes (Total TTC & Reste à Payer)
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors2026.cyanNeon.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors2026.cyanNeon.withOpacity(0.35),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'PRIX TOTAL (TTC)',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: AppColors2026.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '${fmt.format(_totalPrice)} DH',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: AppColors2026.cyanBright,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: (_remaining > 0
                            ? AppColors2026.roseLaser
                            : AppColors2026.emeraldNeon)
                        .withOpacity(0.12),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: (_remaining > 0
                              ? AppColors2026.roseLaser
                              : AppColors2026.emeraldNeon)
                          .withOpacity(0.45),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'RESTE À PAYER 🚩',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: AppColors2026.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          _remaining <= 0
                              ? '0 DH (Soldé)'
                              : '${fmt.format(_remaining)} DH',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: _remaining > 0
                                ? AppColors2026.roseLaser
                                : AppColors2026.emeraldBright,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Statut du contrat selector
          DropdownButtonFormField<String>(
            value: ['ouvert', 'ferme', 'draft', 'signed'].contains(_status)
                ? _status
                : 'ouvert',
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Statut du Contrat',
              prefixIcon: Icon(LucideIcons.checkCircle2, size: 16),
              isDense: true,
            ),
            items: const [
              DropdownMenuItem(
                value: 'ouvert',
                child: Text('Ouvert (En circulation)', overflow: TextOverflow.ellipsis),
              ),
              DropdownMenuItem(
                value: 'ferme',
                child: Text('Fermé (Clôturé / Véhicule restitué)', overflow: TextOverflow.ellipsis),
              ),
              DropdownMenuItem(
                value: 'signed',
                child: Text('Signé électroniquement', overflow: TextOverflow.ellipsis),
              ),
              DropdownMenuItem(
                value: 'draft',
                child: Text('Brouillon / En attente', overflow: TextOverflow.ellipsis),
              ),
            ],
            onChanged: _isReadOnly
                ? null
                : (v) => setState(() => _status = v ?? 'ouvert'),
          ),
          const SizedBox(height: 14),

          // Official Legal Clause Box
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors2026.blueRoyal.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
              border: const Border(
                left: BorderSide(color: AppColors2026.blueRoyal, width: 4),
              ),
            ),
            child: Text(
              'Le locataire du véhicule ${SupabaseSyncService.currentCompanyName.isNotEmpty ? SupabaseSyncService.currentCompanyName : "BOUNATOURS"} reconnaît avoir lu et accepté les conditions générales stipulées au verso du présent contrat, il est le seul responsable en cas de violation du code de la route marocain.',
              style: const TextStyle(
                fontSize: 11,
                height: 1.4,
                color: Colors.white70,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSignaturesSection() {
    return Column(
      children: [
        // 1. Signatures à la livraison
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'SIGNATURES À LA LIVRAISON',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: AppColors2026.cyanBright,
                ),
              ),
              const SizedBox(height: 10),
              _dateField('Date (Livraison)', _deliveryDateCtrl),
              const SizedBox(height: 12),
              SignaturePadInteractiveWidget(
                title: "Lu et approuvé - Signature de l'agent à la livraison",
                initialBase64: _deliveryAgentSignature,
                readOnly: _isReadOnly,
                onChanged: (b64) =>
                    setState(() => _deliveryAgentSignature = b64),
              ),
              const SizedBox(height: 12),
              SignaturePadInteractiveWidget(
                title: 'Lu et approuvé - Signature du locataire à la livraison',
                initialBase64: _deliveryTenantSignature,
                readOnly: _isReadOnly,
                onChanged: (b64) =>
                    setState(() => _deliveryTenantSignature = b64),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. Signatures au retour
        SpatialGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'SIGNATURES AU RETOUR',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: AppColors2026.amberSolar,
                ),
              ),
              const SizedBox(height: 10),
              _dateField('Date (Retour)', _returnDateCtrl),
              const SizedBox(height: 12),
              SignaturePadInteractiveWidget(
                title: "Lu et approuvé - Signature de l'agent au retour",
                initialBase64: _returnAgentSignature,
                readOnly: _isReadOnly,
                onChanged: (b64) => setState(() => _returnAgentSignature = b64),
              ),
              const SizedBox(height: 12),
              SignaturePadInteractiveWidget(
                title: 'Lu et approuvé - Signature du locataire au retour',
                initialBase64: _returnTenantSignature,
                readOnly: _isReadOnly,
                onChanged: (b64) =>
                    setState(() => _returnTenantSignature = b64),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBottomActionBar() {
    return SpatialGlassCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _openPrintableContractPreview,
                  icon: const Icon(LucideIcons.fileText, size: 16),
                  label: const Text('Aperçu PDF / Contrat'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _shareViaWhatsApp,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors2026.emeraldNeon,
                    side: BorderSide(
                      color: AppColors2026.emeraldNeon.withOpacity(0.5),
                    ),
                  ),
                  icon: const Icon(LucideIcons.share2, size: 16),
                  label: const Text('Partager WhatsApp'),
                ),
              ),
            ],
          ),
          if (!_isReadOnly) ...[
            const SizedBox(height: 10),
            ElevatedButton.icon(
              onPressed: _isSaving ? null : _handleSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors2026.cyanNeon,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              icon: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.black,
                      ),
                    )
                  : const Icon(LucideIcons.checkCircle2, size: 18),
              label: Text(
                widget.mode == ContractFormMode.create
                    ? 'CRÉER LE CONTRAT (OUVERT)'
                    : 'ENREGISTRER LES MODIFICATIONS',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                  letterSpacing: 0.6,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _field(
    String label,
    TextEditingController ctrl, {
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
  }) {
    return TextField(
      controller: ctrl,
      readOnly: _isReadOnly,
      keyboardType: keyboardType,
      maxLines: maxLines,
      onChanged: onChanged,
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
      ),
    );
  }

  Widget _dateField(
    String label,
    TextEditingController ctrl, {
    bool includeTime = false,
    VoidCallback? onPicked,
  }) {
    return TextField(
      controller: ctrl,
      readOnly: true,
      onTap: () => _pickDateForField(
        ctrl,
        includeTime: includeTime,
        onPicked: onPicked,
      ),
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        suffixIcon: const Icon(LucideIcons.calendar, size: 15),
      ),
    );
  }
}

/// Interactive Vehicle Inspection Diagram (100% Matches Web `VehicleDiagram.tsx`)
class VehicleDiagramInteractiveWidget extends StatelessWidget {
  final String title;
  final List<DamagePointModel> damages;
  final bool readOnly;
  final ValueChanged<List<DamagePointModel>> onChanged;

  const VehicleDiagramInteractiveWidget({
    super.key,
    required this.title,
    required this.damages,
    required this.readOnly,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppColors2026.textSecondary,
                ),
              ),
            ),
            if (damages.isNotEmpty)
              NeonBadge(
                label: '${damages.length} dommage(s)',
                color: AppColors2026.roseLaser,
              ),
          ],
        ),
        const SizedBox(height: 8),
        LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            // The image original size is 243x219 -> Aspect ratio ~ 1.11
            final height = (width / 1.11).clamp(200.0, 320.0);

            return GestureDetector(
              onTapUp: readOnly
                  ? null
                  : (details) {
                      final local = details.localPosition;
                      final xPct = ((local.dx / width) * 100).clamp(1.0, 99.0);
                      final yPct = ((local.dy / height) * 100).clamp(1.0, 99.0);
                      final next = [
                        ...damages,
                        DamagePointModel(
                          id: 'damage_${DateTime.now().millisecondsSinceEpoch}_${damages.length}',
                          x: double.parse(xPct.toStringAsFixed(1)),
                          y: double.parse(yPct.toStringAsFixed(1)),
                        ),
                      ];
                      onChanged(next);
                    },
              child: Container(
                width: width,
                height: height,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors2026.cyanNeon.withOpacity(0.55),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors2026.cyanNeon.withOpacity(0.12),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(15),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      // Exact high-quality vehicle diagram from Web App
                      Image.asset(
                        'assets/images/vehicle_diagram.png',
                        fit: BoxFit.contain,
                        filterQuality: FilterQuality.high,
                      ),

                      // Interactive Damage Markers (Matching Web VehicleDiagram.tsx exactly)
                      ...damages.map((pt) {
                        return Positioned(
                          left: (pt.x / 100.0) * width - 10,
                          top: (pt.y / 100.0) * height - 10,
                          child: GestureDetector(
                            onTap: readOnly
                                ? null
                                : () {
                                    onChanged(
                                      damages
                                          .where((d) => d.id != pt.id)
                                          .toList(),
                                    );
                                  },
                            child: Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                color: const Color(0xFFEF4444),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x99EF4444),
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                              child: const Center(
                                child: Icon(
                                  LucideIcons.x,
                                  size: 10,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 6),
        const Center(
          child: Text(
            'Touchez le véhicule pour marquer un dommage • Touchez un point rouge pour le supprimer',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              color: AppColors2026.textMuted,
            ),
          ),
        ),
      ],
    );
  }
}

/// Interactive Fuel Gauge Widget (Matches Web `FuelGauge.tsx`)
class FuelGaugeInteractiveWidget extends StatelessWidget {
  final String label;
  final int value;
  final bool readOnly;
  final ValueChanged<int> onChanged;

  const FuelGaugeInteractiveWidget({
    super.key,
    required this.label,
    required this.value,
    required this.readOnly,
    required this.onChanged,
  });

  Color get _barColor {
    if (value <= 25) return AppColors2026.roseLaser;
    if (value <= 50) return AppColors2026.amberSolar;
    return AppColors2026.emeraldNeon;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(LucideIcons.fuel, size: 15, color: _barColor),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            NeonBadge(label: '$value%', color: _barColor),
          ],
        ),
        const SizedBox(height: 6),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: _barColor,
            thumbColor: _barColor,
            inactiveTrackColor: Colors.white12,
          ),
          child: Slider(
            value: value.clamp(0, 100).toDouble(),
            min: 0,
            max: 100,
            divisions: 20,
            onChanged: readOnly ? null : (v) => onChanged(v.round()),
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            for (final mark in const [
              (0, 'E (0%)'),
              (25, '1/4'),
              (50, '1/2'),
              (75, '3/4'),
              (100, 'F (100%)'),
            ])
              InkWell(
                onTap: readOnly ? null : () => onChanged(mark.$1),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  child: Text(
                    mark.$2,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: value == mark.$1
                          ? FontWeight.w900
                          : FontWeight.w600,
                      color: value == mark.$1
                          ? _barColor
                          : AppColors2026.textSecondary,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Interactive Touch Signature Pad (Matches Web `SignaturePadSimple.tsx` with Base64 PNG export/import)
class SignaturePadInteractiveWidget extends StatefulWidget {
  final String title;
  final String initialBase64;
  final bool readOnly;
  final ValueChanged<String> onChanged;

  const SignaturePadInteractiveWidget({
    super.key,
    required this.title,
    required this.initialBase64,
    required this.readOnly,
    required this.onChanged,
  });

  @override
  State<SignaturePadInteractiveWidget> createState() =>
      _SignaturePadInteractiveWidgetState();
}

class _SignaturePadInteractiveWidgetState
    extends State<SignaturePadInteractiveWidget> {
  final List<List<Offset>> _strokes = [];
  Uint8List? _decodedExistingBytes;

  @override
  void initState() {
    super.initState();
    _decodeExisting(widget.initialBase64);
  }

  void _decodeExisting(String raw) {
    if (raw.isEmpty) {
      _decodedExistingBytes = null;
      return;
    }
    try {
      final clean = raw.contains(',') ? raw.split(',').last : raw;
      _decodedExistingBytes = base64Decode(clean);
    } catch (_) {
      _decodedExistingBytes = null;
    }
  }

  Future<void> _exportStrokesToBase64(Size size) async {
    if (_strokes.isEmpty) {
      widget.onChanged('');
      return;
    }
    try {
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final bgPaint = Paint()..color = Colors.white;
      canvas.drawRect(Offset.zero & size, bgPaint);

      final pen = Paint()
        ..color = Colors.black
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 2.6
        ..style = PaintingStyle.stroke;

      for (final stroke in _strokes) {
        for (int i = 0; i < stroke.length - 1; i++) {
          canvas.drawLine(stroke[i], stroke[i + 1], pen);
        }
      }

      final picture = recorder.endRecording();
      final img =
          await picture.toImage(size.width.round(), size.height.round());
      final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final pngBytes = byteData.buffer.asUint8List();
        final b64 = 'data:image/png;base64,${base64Encode(pngBytes)}';
        widget.onChanged(b64);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                widget.title,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors2026.textSecondary,
                ),
              ),
            ),
            if (!widget.readOnly)
              TextButton.icon(
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  foregroundColor: AppColors2026.roseLaser,
                ),
                onPressed: () {
                  setState(() {
                    _strokes.clear();
                    _decodedExistingBytes = null;
                  });
                  widget.onChanged('');
                },
                icon: const Icon(LucideIcons.eraser, size: 13),
                label: const Text('Effacer', style: TextStyle(fontSize: 11)),
              ),
          ],
        ),
        const SizedBox(height: 4),
        LayoutBuilder(
          builder: (context, constraints) {
            final padSize = Size(constraints.maxWidth, 110);
            return GestureDetector(
              onPanStart: widget.readOnly
                  ? null
                  : (d) {
                      setState(() {
                        _decodedExistingBytes = null;
                        _strokes.add([d.localPosition]);
                      });
                    },
              onPanUpdate: widget.readOnly
                  ? null
                  : (d) {
                      if (_strokes.isNotEmpty) {
                        setState(() {
                          _strokes.last.add(d.localPosition);
                        });
                      }
                    },
              onPanEnd: widget.readOnly
                  ? null
                  : (_) => _exportStrokesToBase64(padSize),
              child: Container(
                width: padSize.width,
                height: padSize.height,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: AppColors2026.cyanNeon.withOpacity(0.45),
                    width: 1.4,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: Stack(
                    children: [
                      if (_decodedExistingBytes != null && _strokes.isEmpty)
                        Positioned.fill(
                          child: Image.memory(
                            _decodedExistingBytes!,
                            fit: BoxFit.contain,
                          ),
                        ),
                      Positioned.fill(
                        child: CustomPaint(
                          painter: _SignatureStrokesPainter(_strokes),
                        ),
                      ),
                      if (_strokes.isEmpty && _decodedExistingBytes == null)
                        const Center(
                          child: Text(
                            'Signez ici avec le doigt',
                            style: TextStyle(
                              color: Colors.black38,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _SignatureStrokesPainter extends CustomPainter {
  final List<List<Offset>> strokes;

  _SignatureStrokesPainter(this.strokes);

  @override
  void paint(Canvas canvas, Size size) {
    final pen = Paint()
      ..color = Colors.black
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 2.6
      ..style = PaintingStyle.stroke;

    for (final stroke in strokes) {
      for (int i = 0; i < stroke.length - 1; i++) {
        canvas.drawLine(stroke[i], stroke[i + 1], pen);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SignatureStrokesPainter oldDelegate) => true;
}

/// Official A4-Style Printable / Shareable Contract Preview Sheet
class OfficialContractPaperPreviewSheet extends StatelessWidget {
  final ContractModel contract;
  final VoidCallback onShare;

  const OfficialContractPaperPreviewSheet({
    super.key,
    required this.contract,
    required this.onShare,
  });

  @override
  Widget build(BuildContext context) {
    final d = contract.contractData;
    final fmt = NumberFormat('#,##0', 'fr_FR');

    Widget rowItem(String label, String val) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 135,
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.black54,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Expanded(
              child: Text(
                val.isEmpty ? '-' : val,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: Colors.black87,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      maxChildSize: 0.96,
      minChildSize: 0.6,
      builder: (context, scrollCtrl) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: ListView(
            controller: scrollCtrl,
            padding: const EdgeInsets.all(20),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      'APERÇU CONTRAT BONATOURS',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.black,
                        fontWeight: FontWeight.w900,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        tooltip: 'Télécharger / Imprimer PDF',
                        onPressed: () async {
                          final pdfBytes = await ContractPdfService.generateContractPdf(contract);
                          await WhatsAppHelper.printOrDownloadPdf(
                            bytes: pdfBytes,
                            filename: 'Contrat_${contract.contractNumber.replaceAll("/", "_")}',
                          );
                        },
                        icon: const Icon(LucideIcons.printer, color: Colors.black87, size: 18),
                      ),
                      ElevatedButton.icon(
                        onPressed: onShare,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                        icon: const Icon(LucideIcons.share2, size: 14),
                        label: const Text('Partager', style: TextStyle(fontSize: 12)),
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(LucideIcons.x, color: Colors.black),
                      ),
                    ],
                  ),
                ],
              ),
              const Divider(color: Colors.black26),
              const Center(
                child: Column(
                  children: [
                    Text(
                      'BONATOURS — LOCATION DE VOITURES',
                      style: TextStyle(
                        color: Colors.black,
                        fontWeight: FontWeight.w900,
                        fontSize: 17,
                      ),
                    ),
                    Text(
                      '10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc\n'
                      'Tél: 0522228704 • GSM: 06 62 59 63 07 • bonatours308@gmail.com',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.black54, fontSize: 10.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'CONTRAT DE LOCATION N° : ${contract.contractNumber}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                '1. LOCATAIRE PRINCIPAL & 2ÈME CONDUCTEUR',
                style: TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
              const Divider(color: Colors.black12),
              rowItem('Nom & Prénom :', contract.customerName),
              rowItem('Téléphone :', contract.customerPhone),
              rowItem('Adresse Maroc :', (d['customerAddressMorocco'] ?? '').toString()),
              rowItem('Adresse Étranger :', (d['customerAddressForeign'] ?? '').toString()),
              rowItem('C.I.N. N° :', '${contract.customerCin} (Délivré le: ${d['customerCinDelivered'] ?? '-'})'),
              rowItem('Permis N° :', '${d['customerLicenseNumber'] ?? '-'} (Délivré le: ${d['customerLicenseDelivered'] ?? '-'})'),
              rowItem('Passeport N° :', '${d['customerPassportNumber'] ?? '-'} (Délivré le: ${d['customerPassportDelivered'] ?? '-'})'),
              rowItem('Date Naissance :', (d['customerBirthDate'] ?? '').toString()),
              if ((d['secondDriverLastName'] ?? '').toString().isNotEmpty) ...[
                rowItem(
                  '2ème Conducteur :',
                  '${d['secondDriverFirstName'] ?? ''} ${d['secondDriverLastName'] ?? ''}',
                ),
                rowItem(
                  'CIN / Permis 2ème :',
                  'CIN: ${d['secondDriverCin'] ?? '-'} | Permis: ${d['secondDriverLicenseNumber'] ?? '-'}',
                ),
              ],
              const SizedBox(height: 12),
              const Text(
                '2. VÉHICULE (LIVRAISON & REPRISE)',
                style: TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
              const Divider(color: Colors.black12),
              rowItem('Véhicule :', contract.vehicle),
              rowItem('Immatricule :', (d['vehicleRegistration'] ?? '').toString()),
              rowItem('Km Départ / Retour :', '${d['vehicleKmDepart'] ?? '0'} km → ${d['vehicleKmReturn'] ?? '-'} km'),
              rowItem('Livraison :', '${d['deliveryDateTime'] ?? contract.startDate} (${d['deliveryLocation'] ?? 'Casablanca'})'),
              rowItem('Reprise :', '${d['returnDateTime'] ?? contract.endDate} (${d['returnLocation'] ?? '-'})'),
              rowItem('Carburant :', 'Livraison: ${contract.deliveryFuelLevel}% | Retour: ${contract.returnFuelLevel}%'),
              rowItem('Dommages marqués :', 'Livraison: ${contract.deliveryDamages.length} | Retour: ${contract.returnDamages.length}'),
              rowItem('Accessoires :', (d['emergencyEquipmentDelivery'] ?? '').toString()),
              rowItem('Observations :', contract.notes),
              const SizedBox(height: 12),
              const Text(
                '3. FACTURATION',
                style: TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
              const Divider(color: Colors.black12),
              rowItem('Prix par Jour :', '${fmt.format(contract.dailyRate)} DH'),
              rowItem('Durée Totale :', '${contract.durationDays} jour(s)'),
              rowItem('Total TTC :', '${fmt.format(contract.effectiveTotalAmount)} DH'),
              rowItem('Avance payée :', '${fmt.format(contract.advancePayment)} DH'),
              rowItem('Reste à payer :', '${fmt.format(contract.remainingAmount)} DH'),
              rowItem('Mode Règlement :', contract.paymentMethod),
            ],
          ),
        );
      },
    );
  }
}
