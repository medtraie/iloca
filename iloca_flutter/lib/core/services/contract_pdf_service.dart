import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../models/app_models.dart';

/// 100% Exact Replica of Web Contract PDF (`ContractFormPDF.tsx` & `ContractPDF.tsx`)
class ContractPdfService {
  static String _fmtDate(dynamic val) {
    if (val == null) return '';
    final s = val.toString().trim();
    if (s.isEmpty || s == '-') return '';
    try {
      if (s.contains('T')) {
        final dt = DateTime.parse(s);
        return DateFormat('dd/MM/yyyy HH:mm').format(dt);
      }
      if (s.contains('-') && s.length == 10) {
        final dt = DateTime.parse(s);
        return DateFormat('dd/MM/yyyy').format(dt);
      }
    } catch (_) {}
    return s;
  }

  static String _fmtDateOnly(dynamic val) {
    if (val == null) return '';
    final s = val.toString().trim();
    if (s.isEmpty || s == '-') return '';
    try {
      if (s.contains('T')) {
        final dt = DateTime.parse(s);
        return DateFormat('dd/MM/yyyy').format(dt);
      }
      if (s.contains('-') && s.length == 10) {
        final dt = DateTime.parse(s);
        return DateFormat('dd/MM/yyyy').format(dt);
      }
    } catch (_) {}
    return s;
  }

  static Future<Uint8List> generateContractPdf(ContractModel contract) async {
    final pdf = pw.Document();
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final cd = contract.contractData;

    // Load car diagram image asset
    pw.MemoryImage? carImage;
    try {
      final imgBytes = await rootBundle.load('assets/images/vehicle_diagram.png');
      carImage = pw.MemoryImage(imgBytes.buffer.asUint8List());
    } catch (_) {}

    // Extract Locataire Data
    String custLastName = (cd['customerLastName'] ?? cd['last_name'] ?? '').toString().trim();
    String custFirstName = (cd['customerFirstName'] ?? cd['first_name'] ?? '').toString().trim();
    if (custLastName.isEmpty && custFirstName.isEmpty) {
      final parts = contract.customerName.trim().split(' ');
      custLastName = parts.first;
      custFirstName = parts.length > 1 ? parts.sublist(1).join(' ') : '';
    }

    final custPhone = (cd['customerPhone'] ?? contract.customerPhone).toString().trim();
    final custCin = (cd['customerCin'] ?? contract.customerCin).toString().trim();
    final custCinDelivered = _fmtDateOnly(cd['customerCinDelivered']);
    final custLicense = (cd['customerLicenseNumber'] ?? cd['license'] ?? '').toString().trim();
    final custLicenseDelivered = _fmtDateOnly(cd['customerLicenseDelivered']);
    final custPassport = (cd['customerPassportNumber'] ?? '').toString().trim();
    final custPassportDelivered = _fmtDateOnly(cd['customerPassportDelivered']);
    final custAddressMorocco = (cd['customerAddressMorocco'] ?? cd['customerAddress'] ?? cd['address'] ?? '').toString().trim();
    final custAddressForeign = (cd['customerAddressForeign'] ?? '').toString().trim();
    final custBirthDate = _fmtDateOnly(cd['customerBirthDate']);

    // 2nd Driver
    final d2LastName = (cd['secondDriverLastName'] ?? '').toString().trim();
    final d2FirstName = (cd['secondDriverFirstName'] ?? '').toString().trim();
    final d2Phone = (cd['secondDriverPhone'] ?? '').toString().trim();
    final d2Cin = (cd['secondDriverCin'] ?? '').toString().trim();
    final d2CinDelivered = _fmtDateOnly(cd['secondDriverCinDelivered']);
    final d2License = (cd['secondDriverLicenseNumber'] ?? '').toString().trim();
    final d2LicenseDelivered = _fmtDateOnly(cd['secondDriverLicenseDelivered']);
    final d2Passport = (cd['secondDriverPassportNumber'] ?? '').toString().trim();
    final d2PassportDelivered = _fmtDateOnly(cd['secondDriverPassportDelivered']);
    final d2AddressMorocco = (cd['secondDriverAddressMorocco'] ?? '').toString().trim();
    final d2AddressForeign = (cd['secondDriverAddressForeign'] ?? '').toString().trim();

    // Vehicle Delivery
    String vBrand = (cd['vehicleBrand'] ?? '').toString().trim();
    String vModel = (cd['vehicleModel'] ?? '').toString().trim();
    if (vBrand.isEmpty && vModel.isEmpty) {
      final vParts = contract.vehicle.split(' ');
      vBrand = vParts.first;
      vModel = vParts.length > 1 ? vParts.sublist(1).join(' ') : '';
    }
    final vPlate = (cd['vehicleRegistration'] ?? cd['vehiclePlate'] ?? cd['plate'] ?? '').toString().trim();
    final vYear = (cd['vehicleYear'] ?? '').toString().trim();
    final vKmDepart = (cd['vehicleKmDepart'] ?? cd['startKm'] ?? '0').toString().trim();
    final deliveryLoc = (cd['deliveryLocation'] ?? 'Casablanca').toString().trim();
    final deliveryDateTime = _fmtDate(cd['deliveryDateTime'] ?? contract.startDate);
    final rentalDays = (cd['rentalDays'] ?? cd['rentalDuration'] ?? contract.durationDays).toString().trim();
    final deliveryFuel = (cd['delivery_fuel_level'] ?? cd['deliveryFuelLevel'] ?? contract.deliveryFuelLevel).toString().trim();
    final deliveryFuelNum = int.tryParse(deliveryFuel) ?? 25;
    final accessories = (cd['emergencyEquipmentDelivery'] ?? 'Roue de secours, Cric, Triangle, Gilet').toString().trim();
    final observations = (cd['observationsDelivery'] ?? 'oui').toString().trim();

    // Vehicle Return
    final returnDateTime = _fmtDate(cd['returnDateTime'] ?? contract.effectiveEndDate);
    final returnLoc = (cd['returnLocation'] ?? '').toString().trim();
    final extensionUntil = _fmtDateOnly(cd['extensionUntil']);
    final vKmReturn = (cd['vehicleKmReturn'] ?? cd['endKm'] ?? '').toString().trim();
    final extendedDays = (cd['extendedDays'] ?? contract.extensionDays.toString()).toString().trim();
    final returnFuel = (cd['return_fuel_level'] ?? cd['returnFuelLevel'] ?? contract.returnFuelLevel).toString().trim();
    final returnFuelNum = int.tryParse(returnFuel) ?? 100;
    final returnAccessories = (cd['emergencyEquipmentReturn'] ?? '').toString().trim();
    final returnObservations = (cd['observationsReturn'] ?? '').toString().trim();

    // Financials
    final dailyRate = contract.dailyRate;
    final totalPrice = contract.effectiveTotalAmount;
    final advance = contract.advancePayment;
    final remaining = contract.remainingAmount;
    final paymentMethod = contract.paymentMethod;

    // Delivery & Return damage points
    final deliveryDamages = contract.deliveryDamages;
    final returnDamages = contract.returnDamages;

    // Signatures
    final sigDeliveryDate = _fmtDateOnly(cd['deliveryDate'] ?? cd['deliveryDateTime'] ?? contract.startDate);
    final sigReturnDate = _fmtDateOnly(cd['returnDate'] ?? cd['returnDateTime'] ?? contract.effectiveEndDate);
    final sigDeliveryAgent = (cd['delivery_agent_signature'] ?? '').toString();
    final sigDeliveryTenant = (cd['delivery_tenant_signature'] ?? '').toString();
    final sigReturnAgent = (cd['return_agent_signature'] ?? '').toString();
    final sigReturnTenant = (cd['return_tenant_signature'] ?? '').toString();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // ===============================================================
              // 1. TOP HEADER (Exact Web Layout)
              // ===============================================================
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  // Left: Company Name & Type
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'SFTLOCATION',
                        style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, letterSpacing: 0.5),
                      ),
                      pw.Text(
                        'LOCATION DE VOITURES',
                        style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, letterSpacing: 0.5),
                      ),
                    ],
                  ),

                  // Center: Subtitle & Black Box CONTRAT DE LOCATION
                  pw.Column(
                    children: [
                      pw.Text(
                        'Courte et longue durée 7/7',
                        style: pw.TextStyle(fontSize: 9, fontStyle: pw.FontStyle.italic),
                      ),
                      pw.SizedBox(height: 3),
                      pw.Container(
                        color: PdfColors.black,
                        padding: const pw.EdgeInsets.symmetric(horizontal: 22, vertical: 4),
                        child: pw.Text(
                          'CONTRAT DE LOCATION',
                          style: pw.TextStyle(
                            color: PdfColors.white,
                            fontSize: 11,
                            fontWeight: pw.FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Right: Address & Contact lines
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc', style: const pw.TextStyle(fontSize: 6.8)),
                      pw.Text('Tél: 0522228704 - Fax: 05 22 47 17 80', style: const pw.TextStyle(fontSize: 6.8)),
                      pw.Text('GSM: 06 62 59 63 07', style: const pw.TextStyle(fontSize: 6.8)),
                      pw.Text('E-mail: bonatours308@gmail.com', style: const pw.TextStyle(fontSize: 6.8)),
                    ],
                  ),
                ],
              ),

              pw.Align(
                alignment: pw.Alignment.centerRight,
                child: pw.Padding(
                  padding: const pw.EdgeInsets.only(top: 4, bottom: 4),
                  child: pw.Text(
                    'N° : ${contract.contractNumber}',
                    style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold),
                  ),
                ),
              ),

              // ===============================================================
              // 2. SECTION LOCATAIRE
              // ===============================================================
              _bannerHeader('LOCATAIRE'),
              pw.Container(
                decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.black, width: 0.8)),
                padding: const pw.EdgeInsets.all(6),
                child: pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    // Col 1: Locataire
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _columnTitle('Locataire'),
                          pw.SizedBox(height: 3),
                          _twoCols('Nom:', custLastName, 'Prénom:', custFirstName),
                          _twoCols('Tél:', custPhone, 'C.I.N. N°:', custCin),
                          _twoCols('Délivré le:', custCinDelivered, 'Permis N°:', custLicense),
                          _twoCols('Délivré le:', custLicenseDelivered, 'Passeport N°:', custPassport),
                          _singleItem('Délivré le:', custPassportDelivered),
                          _singleItem('Adresse au Maroc:', custAddressMorocco),
                          _singleItem('Adresse à l\'Étranger:', custAddressForeign),
                          _singleItem('Date de Naissance:', custBirthDate),
                        ],
                      ),
                    ),
                    pw.SizedBox(width: 8),
                    // Col 2: 2ème Conducteur
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _columnTitle('2ème Conducteur'),
                          pw.SizedBox(height: 3),
                          _twoCols('Nom:', d2LastName, 'Prénom:', d2FirstName),
                          _twoCols('Tél:', d2Phone, 'C.I.N. N°:', d2Cin),
                          _twoCols('Délivré le:', d2CinDelivered, 'Permis N°:', d2License),
                          _twoCols('Délivré le:', d2LicenseDelivered, 'Passeport N°:', d2Passport),
                          _singleItem('Délivré le:', d2PassportDelivered),
                          _singleItem('Adresse au Maroc:', d2AddressMorocco),
                          _singleItem('Adresse à l\'Étranger:', d2AddressForeign),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 5),

              // ===============================================================
              // 3. SECTION VÉHICULE
              // ===============================================================
              _bannerHeader('VÉHICULE'),
              pw.Container(
                decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.black, width: 0.8)),
                padding: const pw.EdgeInsets.all(6),
                child: pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    // Col 1: Livraison du Véhicule
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _columnTitle('Livraison du Véhicule'),
                          pw.SizedBox(height: 3),
                          _twoCols('Marque:', vBrand, 'Modèle:', vModel),
                          _twoCols('Immatricule:', vPlate, 'Année:', vYear),
                          _twoCols('Km Départ:', vKmDepart, 'Lieu:', deliveryLoc),
                          _twoCols('Date et Heure:', deliveryDateTime, 'Nombre de Jour:', rentalDays),
                          pw.SizedBox(height: 3),

                          // Car Diagram Box - Livraison
                          _buildVehicleDiagramBox(
                            title: 'Schéma véhicule - Livraison',
                            carImage: carImage,
                            damages: deliveryDamages,
                          ),
                          pw.SizedBox(height: 3),

                          // Fuel gauge
                          _buildFuelGauge(deliveryFuelNum),
                          pw.SizedBox(height: 2),

                          _singleItem('Accessoires:', accessories),
                          _singleItem('Observations:', observations),
                        ],
                      ),
                    ),
                    pw.SizedBox(width: 8),
                    // Col 2: Reprise du Véhicule
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _columnTitle('Reprise du Véhicule'),
                          pw.SizedBox(height: 3),
                          _twoCols('Date:', returnDateTime, 'Lieu:', returnLoc),
                          _twoCols('Prolongation:', extensionUntil, 'Km Retour:', vKmReturn),
                          _singleItem('Jours Prolongés:', extendedDays),
                          pw.SizedBox(height: 3),

                          // Car Diagram Box - Retour
                          _buildVehicleDiagramBox(
                            title: 'Schéma Véhicule - Retour',
                            carImage: carImage,
                            damages: returnDamages,
                          ),
                          pw.SizedBox(height: 3),

                          // Fuel gauge
                          _buildFuelGauge(returnFuelNum),
                          pw.SizedBox(height: 2),

                          _singleItem('Accessoires:', returnAccessories),
                          _singleItem('Observations:', returnObservations),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 5),

              // ===============================================================
              // 4. SECTION FACTURATION
              // ===============================================================
              _bannerHeader('FACTURATION'),
              pw.Container(
                decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.black, width: 0.8)),
                padding: const pw.EdgeInsets.all(6),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    // Row with 5 items
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        _factureItem('Prix/Jour :', '${fmt.format(dailyRate)} DH'),
                        _factureItem('Durée :', '$rentalDays jour(s)'),
                        _factureItem('Prix total :', '${fmt.format(totalPrice)} DH'),
                        _factureItem('Avance :', '${fmt.format(advance)} DH'),
                        _factureItem('Reste :', '${fmt.format(remaining)} DH'),
                      ],
                    ),
                    pw.SizedBox(height: 4),
                    pw.RichText(
                      text: pw.TextSpan(
                        children: [
                          pw.TextSpan(
                            text: 'Mode de Règlement : ',
                            style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold),
                          ),
                          pw.TextSpan(
                            text: paymentMethod,
                            style: const pw.TextStyle(fontSize: 7.5),
                          ),
                        ],
                      ),
                    ),
                    pw.SizedBox(height: 4),

                    // Blue Legal Box
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      decoration: pw.BoxDecoration(
                        color: PdfColor.fromHex('#EFF6FF'),
                        border: pw.Border(
                          left: pw.BorderSide(color: PdfColor.fromHex('#3B82F6'), width: 3),
                        ),
                      ),
                      child: pw.RichText(
                        text: pw.TextSpan(
                          children: [
                            pw.TextSpan(
                              text: 'Le locataire du véhicule SFTLOCATION ',
                              style: pw.TextStyle(fontSize: 7.2, fontWeight: pw.FontWeight.bold),
                            ),
                            const pw.TextSpan(
                              text: 'reconnaît avoir lu et accepté les conditions générales stipulées au verso du présent contrat, il est le seul responsable en cas de violation de code de la route marocaine.',
                              style: pw.TextStyle(fontSize: 7.2),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 6),

              // ===============================================================
              // 5. SECTION SIGNATURES
              // ===============================================================
              pw.Row(
                children: [
                  // Livraison Signatures
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Center(
                          child: pw.Text(
                            'Signatures à la livraison',
                            style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold),
                          ),
                        ),
                        pw.SizedBox(height: 2),
                        pw.Text('Date : $sigDeliveryDate', style: const pw.TextStyle(fontSize: 7.2)),
                        pw.SizedBox(height: 2),
                        pw.Row(
                          children: [
                            _buildSignatureBox(
                              label: "Lu et approuvé\nSignature de l'agent\nà la livraison",
                              signatureData: sigDeliveryAgent,
                            ),
                            pw.SizedBox(width: 6),
                            _buildSignatureBox(
                              label: "Lu et approuvé\nSignature du locataire\nà la livraison",
                              signatureData: sigDeliveryTenant,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 14),
                  // Retour Signatures
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Center(
                          child: pw.Text(
                            'Signatures au retour',
                            style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold),
                          ),
                        ),
                        pw.SizedBox(height: 2),
                        pw.Text('Date : $sigReturnDate', style: const pw.TextStyle(fontSize: 7.2)),
                        pw.SizedBox(height: 2),
                        pw.Row(
                          children: [
                            _buildSignatureBox(
                              label: "Lu et approuvé\nSignature agent\nretour",
                              signatureData: sigReturnAgent,
                            ),
                            pw.SizedBox(width: 6),
                            _buildSignatureBox(
                              label: "Lu et approuvé\nSignature locataire\nretour",
                              signatureData: sigReturnTenant,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    return await pdf.save();
  }

  // --- Helpers for Exact Styling ---

  static pw.Widget _bannerHeader(String title) {
    return pw.Container(
      width: double.infinity,
      color: PdfColors.black,
      padding: const pw.EdgeInsets.symmetric(vertical: 2.2),
      child: pw.Center(
        child: pw.Text(
          title,
          style: pw.TextStyle(
            color: PdfColors.white,
            fontWeight: pw.FontWeight.bold,
            fontSize: 9,
            letterSpacing: 0.8,
          ),
        ),
      ),
    );
  }

  static pw.Widget _columnTitle(String title) {
    return pw.Center(
      child: pw.Text(
        title,
        style: pw.TextStyle(
          fontSize: 8.5,
          fontWeight: pw.FontWeight.bold,
          decoration: pw.TextDecoration.underline,
        ),
      ),
    );
  }

  static pw.Widget _twoCols(String l1, String v1, String l2, String v2) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1),
      child: pw.Row(
        children: [
          pw.Expanded(
            child: pw.RichText(
              text: pw.TextSpan(
                children: [
                  pw.TextSpan(text: '$l1 ', style: pw.TextStyle(fontSize: 7.2, fontWeight: pw.FontWeight.bold)),
                  pw.TextSpan(text: v1, style: const pw.TextStyle(fontSize: 7.2)),
                ],
              ),
            ),
          ),
          pw.Expanded(
            child: pw.RichText(
              text: pw.TextSpan(
                children: [
                  pw.TextSpan(text: '$l2 ', style: pw.TextStyle(fontSize: 7.2, fontWeight: pw.FontWeight.bold)),
                  pw.TextSpan(text: v2, style: const pw.TextStyle(fontSize: 7.2)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _singleItem(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1),
      child: pw.RichText(
        text: pw.TextSpan(
          children: [
            pw.TextSpan(text: '$label ', style: pw.TextStyle(fontSize: 7.2, fontWeight: pw.FontWeight.bold)),
            pw.TextSpan(text: value, style: const pw.TextStyle(fontSize: 7.2)),
          ],
        ),
      ),
    );
  }

  static pw.Widget _buildVehicleDiagramBox({
    required String title,
    required pw.MemoryImage? carImage,
    required List<DamagePointModel> damages,
  }) {
    return pw.Container(
      height: 72,
      width: double.infinity,
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: PdfColors.black, width: 0.8),
      ),
      padding: const pw.EdgeInsets.all(2),
      child: pw.Column(
        children: [
          pw.Text(title, style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey800)),
          pw.Expanded(
            child: pw.Center(
              child: carImage != null
                  ? pw.Stack(
                      alignment: pw.Alignment.center,
                      children: [
                        pw.Image(carImage, width: 120, height: 50, fit: pw.BoxFit.contain),
                        ...damages.map((d) {
                          // Scale x and y (0..100) to the container dimensions (120x50)
                          final posX = (d.x.clamp(0, 100) / 100.0) * 120.0 - 2.5;
                          final posY = (d.y.clamp(0, 100) / 100.0) * 50.0 - 2.5;
                          return pw.Positioned(
                            left: posX,
                            top: posY,
                            child: pw.Container(
                              width: 5,
                              height: 5,
                              decoration: const pw.BoxDecoration(
                                color: PdfColors.red,
                                shape: pw.BoxShape.circle,
                              ),
                            ),
                          );
                        }),
                      ],
                    )
                  : pw.Text('Schéma Véhicule', style: const pw.TextStyle(fontSize: 7)),
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _buildFuelGauge(int level) {
    final pct = level.clamp(0, 100);
    return pw.Row(
      children: [
        pw.Text('Carburant: ', style: pw.TextStyle(fontSize: 7.2, fontWeight: pw.FontWeight.bold)),
        pw.Container(
          width: 50,
          height: 7,
          decoration: pw.BoxDecoration(
            border: pw.Border.all(color: PdfColors.black, width: 0.8),
          ),
          child: pw.Align(
            alignment: pw.Alignment.centerLeft,
            child: pw.Container(
              width: 50.0 * (pct / 100.0),
              height: 7,
              color: PdfColors.black,
            ),
          ),
        ),
        pw.SizedBox(width: 4),
        pw.Text('$pct%', style: const pw.TextStyle(fontSize: 7.2)),
      ],
    );
  }

  static pw.Widget _factureItem(String label, String value) {
    return pw.RichText(
      text: pw.TextSpan(
        children: [
          pw.TextSpan(text: '$label ', style: pw.TextStyle(fontSize: 7.2, fontWeight: pw.FontWeight.bold)),
          pw.TextSpan(text: value, style: const pw.TextStyle(fontSize: 7.2)),
        ],
      ),
    );
  }

  static pw.Widget _buildSignatureBox({
    required String label,
    required String signatureData,
  }) {
    pw.MemoryImage? memImage;
    if (signatureData.isNotEmpty && signatureData.length > 50) {
      try {
        String clean = signatureData;
        if (clean.contains(',')) {
          clean = clean.split(',').last;
        }
        final bytes = base64Decode(clean.trim());
        memImage = pw.MemoryImage(bytes);
      } catch (_) {}
    }

    return pw.Expanded(
      child: pw.Container(
        height: 38,
        decoration: pw.BoxDecoration(
          border: pw.Border.all(color: PdfColors.black, width: 0.8),
        ),
        padding: const pw.EdgeInsets.all(2),
        child: memImage != null
            ? pw.Center(child: pw.Image(memImage, fit: pw.BoxFit.contain))
            : pw.Center(
                child: pw.Text(
                  label,
                  textAlign: pw.TextAlign.center,
                  style: const pw.TextStyle(fontSize: 6, color: PdfColors.grey700),
                ),
              ),
      ),
    );
  }
}
