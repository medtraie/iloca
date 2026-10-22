import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../models/app_models.dart';

/// 100% Exact Replica of Web Contract PDF (`usePDFGeneration.ts` & `ContractFormPDF.tsx`)
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

  static pw.MemoryImage? _tryDecodeBase64(String raw) {
    if (raw.isEmpty) return null;
    try {
      String clean = raw.trim();
      if (clean.contains(',')) {
        clean = clean.split(',').last;
      }
      final bytes = base64Decode(clean);
      if (bytes.isNotEmpty) {
        return pw.MemoryImage(bytes);
      }
    } catch (_) {}
    return null;
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
    final paymentMethod = contract.paymentMethod.isNotEmpty ? contract.paymentMethod : 'Espèces';

    // Damage points
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
        margin: const pw.EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // -------------------------------------------------------------
              // 1. HEADER SECTION (Exact match to usePDFGeneration.ts)
              // -------------------------------------------------------------
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  // Company Title
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'SFTLOCATION',
                        style: pw.TextStyle(
                          fontSize: 14.5,
                          fontWeight: pw.FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                      pw.SizedBox(height: 1),
                      pw.Text(
                        'LOCATION DE VOITURES',
                        style: pw.TextStyle(
                          fontSize: 9.5,
                          fontWeight: pw.FontWeight.bold,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                  // Contact Details (Right-aligned, 4 lines)
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        '10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc',
                        style: const pw.TextStyle(fontSize: 6.8),
                      ),
                      pw.Text(
                        'Tél: 0522228704 - Fax: 05 22 47 17 80',
                        style: const pw.TextStyle(fontSize: 6.8),
                      ),
                      pw.Text(
                        'GSM: 06 62 59 63 07',
                        style: const pw.TextStyle(fontSize: 6.8),
                      ),
                      pw.Text(
                        'E-mail: bonatours308@gmail.com',
                        style: const pw.TextStyle(fontSize: 6.8),
                      ),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 2),

              // Center text: Courte et longue durée 7/7 + Badge CONTRAT DE LOCATION + N°
              pw.Stack(
                alignment: pw.Alignment.center,
                children: [
                  pw.Column(
                    children: [
                      pw.Text(
                        'Courte et longue durée 7/7',
                        style: pw.TextStyle(
                          fontSize: 8.5,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Container(
                        color: PdfColors.black,
                        padding: const pw.EdgeInsets.symmetric(horizontal: 20, vertical: 3),
                        child: pw.Text(
                          'CONTRAT DE LOCATION',
                          style: pw.TextStyle(
                            color: PdfColors.white,
                            fontSize: 11,
                            fontWeight: pw.FontWeight.bold,
                            letterSpacing: 1.1,
                          ),
                        ),
                      ),
                    ],
                  ),
                  pw.Positioned(
                    right: 0,
                    bottom: 2,
                    child: pw.Text(
                      'N° : ${contract.contractNumber}',
                      style: pw.TextStyle(
                        fontSize: 10.5,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 5),

              // -------------------------------------------------------------
              // 2. LOCATAIRE SECTION (Exact match to usePDFGeneration.ts)
              // -------------------------------------------------------------
              _sectionHeader('LOCATAIRE'),
              pw.SizedBox(height: 2),
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Col 1: Locataire Principal
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _subSectionTitle('Locataire'),
                        _twoCols('Nom:', custLastName, 'Prénom:', custFirstName),
                        _twoCols('Tél:', custPhone, 'C.I.N. N°:', custCin),
                        _twoCols('Délivré le:', custCinDelivered, 'Permis N°:', custLicense),
                        _twoCols('Délivré le:', custLicenseDelivered, 'Passeport N°:', custPassport),
                        _singleField('Délivré le:', custPassportDelivered),
                        _singleField('Adresse au Maroc:', custAddressMorocco),
                        _singleField('Adresse à l\'Étranger:', custAddressForeign),
                        _singleField('Date de Naissance:', custBirthDate),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 8),
                  // Col 2: 2ème Conducteur
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _subSectionTitle('2ème Conducteur'),
                        _twoCols('Nom:', d2LastName, 'Prénom:', d2FirstName),
                        _twoCols('Tél:', d2Phone, 'C.I.N. N°:', d2Cin),
                        _twoCols('Délivré le:', d2CinDelivered, 'Permis N°:', d2License),
                        _twoCols('Délivré le:', d2LicenseDelivered, 'Passeport N°:', d2Passport),
                        _singleField('Délivré le:', d2PassportDelivered),
                        _singleField('Adresse au Maroc:', d2AddressMorocco),
                        _singleField('Adresse à l\'Étranger:', d2AddressForeign),
                      ],
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 5),

              // -------------------------------------------------------------
              // 3. VÉHICULE SECTION (Exact match to usePDFGeneration.ts)
              // -------------------------------------------------------------
              _sectionHeader('VÉHICULE'),
              pw.SizedBox(height: 2),
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Col 1: Livraison du Véhicule
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _subSectionTitle('Livraison du Véhicule'),
                        _twoCols('Marque:', vBrand, 'Modèle:', vModel),
                        _twoCols('Immatricule:', vPlate, 'Année:', vYear),
                        _twoCols('Km Départ:', vKmDepart, 'Lieu:', deliveryLoc),
                        _twoCols('Date et Heure:', deliveryDateTime, 'Nombre de Jour:', rentalDays),
                        pw.SizedBox(height: 2),

                        // Vehicle Diagram Box - Livraison
                        _buildVehicleDiagramBox(
                          title: 'État du Véhicule - Livraison',
                          carImage: carImage,
                          damages: deliveryDamages,
                        ),
                        pw.SizedBox(height: 2),

                        // Fuel gauge
                        _buildFuelGauge(deliveryFuelNum),
                        pw.SizedBox(height: 1.5),

                        _singleField('Accessoires:', accessories),
                        _singleField('Observations:', observations),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 8),
                  // Col 2: Reprise du Véhicule
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _subSectionTitle('Reprise du Véhicule'),
                        _twoCols('Date:', returnDateTime, 'Lieu:', returnLoc),
                        _twoCols('Prolongation:', extensionUntil, 'Km Retour:', vKmReturn),
                        _singleField('Jours Prolongés:', extendedDays),
                        pw.SizedBox(height: 2),

                        // Vehicle Diagram Box - Retour
                        _buildVehicleDiagramBox(
                          title: 'État du Véhicule - Retour',
                          carImage: carImage,
                          damages: returnDamages,
                        ),
                        pw.SizedBox(height: 2),

                        // Fuel gauge
                        _buildFuelGauge(returnFuelNum),
                        pw.SizedBox(height: 1.5),

                        _singleField('Accessoires:', returnAccessories),
                        _singleField('Observations:', returnObservations),
                      ],
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 5),

              // -------------------------------------------------------------
              // 4. FACTURATION SECTION (Exact match to usePDFGeneration.ts)
              // -------------------------------------------------------------
              _sectionHeader('FACTURATION'),
              pw.SizedBox(height: 2),
              // 5-Column Row
              pw.Row(
                children: [
                  _factureColumn('Prix/Jour:', '${fmt.format(dailyRate)} DH'),
                  pw.SizedBox(width: 5),
                  _factureColumn('Durée:', '$rentalDays jour(s)'),
                  pw.SizedBox(width: 5),
                  _factureColumn('Prix total:', '${fmt.format(totalPrice)} DH'),
                  pw.SizedBox(width: 5),
                  _factureColumn('Avance:', '${fmt.format(advance)} DH'),
                  pw.SizedBox(width: 5),
                  _factureColumn('Reste:', '${fmt.format(remaining)} DH'),
                ],
              ),
              pw.SizedBox(height: 2),
              _singleField('Mode de Règlement:', paymentMethod),
              pw.SizedBox(height: 2),

              // Light blue terms disclaimer box with blue left border
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.symmetric(horizontal: 5, vertical: 3),
                decoration: pw.BoxDecoration(
                  color: PdfColor.fromHex('#F8FAFC'),
                  border: pw.Border(
                    left: pw.BorderSide(color: PdfColor.fromHex('#2563EB'), width: 2.5),
                  ),
                ),
                child: pw.RichText(
                  text: pw.TextSpan(
                    children: [
                      pw.TextSpan(
                        text: 'Le locataire du véhicule SFTLOCATION ',
                        style: pw.TextStyle(fontSize: 6.8, fontWeight: pw.FontWeight.bold),
                      ),
                      const pw.TextSpan(
                        text:
                            'reconnaît avoir lu et accepté les conditions générales stipulées au verso du présent contrat, il est le seul responsable en cas de violation de code de la route marocaine.',
                        style: pw.TextStyle(fontSize: 6.8),
                      ),
                    ],
                  ),
                ),
              ),

              pw.SizedBox(height: 5),

              // -------------------------------------------------------------
              // 5. SIGNATURES SECTION (Exact match to usePDFGeneration.ts)
              // -------------------------------------------------------------
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Livraison Signatures
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _subSectionTitle('Signatures à la livraison'),
                        pw.Row(
                          children: [
                            pw.Expanded(
                              child: _buildSignatureBox(
                                date: sigDeliveryDate,
                                label: "Lu et approuvé\nSignature de l'agent\nà la livraison",
                                signatureData: sigDeliveryAgent,
                              ),
                            ),
                            pw.SizedBox(width: 6),
                            pw.Expanded(
                              child: _buildSignatureBox(
                                date: sigDeliveryDate,
                                label: "Lu et approuvé\nSignature du locataire\nà la livraison",
                                signatureData: sigDeliveryTenant,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 8),
                  // Retour Signatures
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _subSectionTitle('Signatures au retour'),
                        pw.Row(
                          children: [
                            pw.Expanded(
                              child: _buildSignatureBox(
                                date: sigReturnDate,
                                label: "Lu et approuvé\nSignature de l'agent\nau retour",
                                signatureData: sigReturnAgent,
                              ),
                            ),
                            pw.SizedBox(width: 6),
                            pw.Expanded(
                              child: _buildSignatureBox(
                                date: sigReturnDate,
                                label: "Lu et approuvé\nSignature du locataire\nau retour",
                                signatureData: sigReturnTenant,
                              ),
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

    return pdf.save();
  }

  // =========================================================================
  // HELPER WIDGETS MATCHING WEB EXACTLY
  // =========================================================================

  /// Black banner header with white centered uppercase text
  static pw.Widget _sectionHeader(String title) {
    return pw.Container(
      width: double.infinity,
      color: PdfColors.black,
      padding: const pw.EdgeInsets.symmetric(vertical: 2.2),
      alignment: pw.Alignment.center,
      child: pw.Text(
        title,
        style: pw.TextStyle(
          color: PdfColors.white,
          fontSize: 9.5,
          fontWeight: pw.FontWeight.bold,
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  /// Subsection title with underline across the column
  static pw.Widget _subSectionTitle(String title) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.only(bottom: 1.5),
      margin: const pw.EdgeInsets.only(bottom: 2),
      decoration: const pw.BoxDecoration(
        border: pw.Border(
          bottom: pw.BorderSide(color: PdfColors.black, width: 0.8),
        ),
      ),
      alignment: pw.Alignment.center,
      child: pw.Text(
        title,
        style: pw.TextStyle(
          fontSize: 8.5,
          fontWeight: pw.FontWeight.bold,
        ),
      ),
    );
  }

  /// Two columns field on the same row with light grey bottom underline
  static pw.Widget _twoCols(String l1, String v1, String l2, String v2) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 1.5),
      child: pw.Row(
        children: [
          pw.Expanded(child: _fieldCell(l1, v1)),
          pw.SizedBox(width: 4),
          pw.Expanded(child: _fieldCell(l2, v2)),
        ],
      ),
    );
  }

  /// Single full-width field with label and underlined value
  static pw.Widget _singleField(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 1.5),
      child: _fieldCell(label, value),
    );
  }

  /// Cell with bold label and bottom border on value (exact web .field & .field-value)
  static pw.Widget _fieldCell(String label, String value) {
    final clean = value.trim();
    return pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.end,
      children: [
        pw.Text(
          label,
          style: pw.TextStyle(
            fontSize: 7.2,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
        pw.SizedBox(width: 2),
        pw.Expanded(
          child: pw.Container(
            padding: const pw.EdgeInsets.only(left: 2, right: 2, bottom: 0.5),
            decoration: pw.BoxDecoration(
              border: pw.Border(
                bottom: pw.BorderSide(color: PdfColor.fromHex('#CCCCCC'), width: 0.6),
              ),
            ),
            child: pw.Text(
              clean.isEmpty ? ' ' : clean,
              style: const pw.TextStyle(fontSize: 7.2),
              maxLines: 1,
            ),
          ),
        ),
      ],
    );
  }

  /// Facture item (stacked label above underlined value)
  static pw.Widget _factureColumn(String label, String value) {
    return pw.Expanded(
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            label,
            style: pw.TextStyle(
              fontSize: 7.2,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
          pw.Container(
            width: double.infinity,
            padding: const pw.EdgeInsets.only(top: 1, bottom: 1),
            decoration: pw.BoxDecoration(
              border: pw.Border(
                bottom: pw.BorderSide(color: PdfColor.fromHex('#CCCCCC'), width: 0.6),
              ),
            ),
            child: pw.Text(
              value,
              style: const pw.TextStyle(fontSize: 7.2),
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }

  /// Vehicle Diagram Box matching Web .vehicle-diagram
  static pw.Widget _buildVehicleDiagramBox({
    required String title,
    required pw.MemoryImage? carImage,
    required List<DamagePointModel> damages,
  }) {
    const double w = 135;
    const double h = 62;

    return pw.Container(
      width: double.infinity,
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: PdfColors.black, width: 0.7),
      ),
      padding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 2),
      child: pw.Column(
        mainAxisSize: pw.MainAxisSize.min,
        children: [
          pw.Text(
            title,
            style: pw.TextStyle(fontSize: 6.8, fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 1),
          pw.SizedBox(
            width: w,
            height: h,
            child: pw.Stack(
              alignment: pw.Alignment.center,
              children: [
                if (carImage != null)
                  pw.Image(
                    carImage,
                    width: w,
                    height: h,
                    fit: pw.BoxFit.contain,
                  )
                else
                  pw.Center(
                    child: pw.Text(
                      'Schéma véhicule',
                      style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey600),
                    ),
                  ),
                // Damage dots
                ...damages.map((d) {
                  final posX = ((d.x / 100.0) * w).clamp(0.0, w - 4);
                  final posY = ((d.y / 100.0) * h).clamp(0.0, h - 4);
                  return pw.Positioned(
                    left: posX,
                    top: posY,
                    child: pw.Container(
                      width: 4,
                      height: 4,
                      decoration: pw.BoxDecoration(
                        color: PdfColors.red,
                        shape: pw.BoxShape.circle,
                        border: pw.Border.all(color: PdfColors.white, width: 0.5),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Fuel gauge matching Web .fuel-gauge
  static pw.Widget _buildFuelGauge(int level) {
    const double barWidth = 65.0;
    const double barHeight = 6.5;
    final fillW = (barWidth * (level.clamp(0, 100) / 100.0));

    return pw.Row(
      children: [
        pw.Text(
          'Carburant: ',
          style: pw.TextStyle(fontSize: 6.8, fontWeight: pw.FontWeight.bold),
        ),
        pw.Container(
          width: barWidth,
          height: barHeight,
          decoration: pw.BoxDecoration(
            border: pw.Border.all(color: PdfColors.black, width: 0.7),
          ),
          alignment: pw.Alignment.centerLeft,
          child: pw.Container(
            width: fillW,
            height: barHeight,
            color: PdfColors.black,
          ),
        ),
        pw.SizedBox(width: 4),
        pw.Text('$level%', style: const pw.TextStyle(fontSize: 6.8)),
      ],
    );
  }

  /// Signature box matching Web .signature-box
  static pw.Widget _buildSignatureBox({
    required String date,
    required String label,
    required String signatureData,
  }) {
    final sigImg = _tryDecodeBase64(signatureData);

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'Date: $date',
          style: const pw.TextStyle(fontSize: 6.8),
        ),
        pw.SizedBox(height: 1),
        pw.Container(
          height: 38,
          width: double.infinity,
          decoration: pw.BoxDecoration(
            border: pw.Border.all(color: PdfColors.black, width: 0.7),
          ),
          alignment: pw.Alignment.center,
          padding: const pw.EdgeInsets.all(1.5),
          child: sigImg != null
              ? pw.Image(sigImg, fit: pw.BoxFit.contain)
              : pw.Text(
                  label,
                  textAlign: pw.TextAlign.center,
                  style: const pw.TextStyle(
                    fontSize: 6.0,
                    lineSpacing: 1.1,
                  ),
                ),
        ),
      ],
    );
  }
}
