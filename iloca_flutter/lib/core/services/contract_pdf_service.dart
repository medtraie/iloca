import 'dart:typed_data';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../models/app_models.dart';

class ContractPdfService {
  /// Generates the official contract PDF matching Web (`ContractFormPDF.tsx` & `ContractPDF.tsx`)
  static Future<Uint8List> generateContractPdf(ContractModel contract) async {
    final pdf = pw.Document();
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final cd = contract.contractData;

    final customerFirstName = (cd['customerFirstName'] ?? cd['first_name'] ?? '').toString();
    final customerLastName = (cd['customerLastName'] ?? cd['last_name'] ?? contract.customerName).toString();
    final customerAddress = (cd['customerAddressMorocco'] ?? cd['customerAddress'] ?? cd['address'] ?? '').toString();
    final customerForeignAddress = (cd['customerAddressForeign'] ?? '').toString();
    final customerPhone = (cd['customerPhone'] ?? contract.customerPhone).toString();
    final customerCin = (cd['customerCin'] ?? contract.customerCin).toString();
    final customerCinDelivered = (cd['customerCinDelivered'] ?? '').toString();
    final customerLicense = (cd['customerLicenseNumber'] ?? cd['license'] ?? '').toString();
    final customerLicenseDelivered = (cd['customerLicenseDelivered'] ?? '').toString();
    final customerPassport = (cd['customerPassportNumber'] ?? '').toString();
    final customerPassportDelivered = (cd['customerPassportDelivered'] ?? '').toString();
    final customerBirthDate = (cd['customerBirthDate'] ?? '').toString();

    // 2nd driver
    final d2LastName = (cd['secondDriverLastName'] ?? '').toString();
    final d2FirstName = (cd['secondDriverFirstName'] ?? '').toString();
    final d2Address = (cd['secondDriverAddressMorocco'] ?? '').toString();
    final d2Phone = (cd['secondDriverPhone'] ?? '').toString();
    final d2Cin = (cd['secondDriverCin'] ?? '').toString();
    final d2License = (cd['secondDriverLicenseNumber'] ?? '').toString();
    final d2Passport = (cd['secondDriverPassportNumber'] ?? '').toString();

    // Vehicle
    final vBrand = (cd['vehicleBrand'] ?? contract.vehicle).toString();
    final vModel = (cd['vehicleModel'] ?? '').toString();
    final vPlate = (cd['vehicleRegistration'] ?? cd['vehiclePlate'] ?? cd['plate'] ?? '').toString();
    final vYear = (cd['vehicleYear'] ?? '').toString();
    final vKmDepart = (cd['vehicleKmDepart'] ?? cd['startKm'] ?? '0').toString();
    final deliveryLocation = (cd['deliveryLocation'] ?? 'Agence Casablanca').toString();
    final deliveryDateTime = (cd['deliveryDateTime'] ?? contract.startDate).toString();
    final rentalDays = (cd['rentalDays'] ?? cd['rentalDuration'] ?? contract.durationDays).toString();
    final deliveryFuel = (cd['delivery_fuel_level'] ?? cd['deliveryFuelLevel'] ?? 50).toString();
    final emergencyEquipment = (cd['emergencyEquipmentDelivery'] ?? 'Roue de secours + Cric + Triangle').toString();
    final observations = (cd['observationsDelivery'] ?? 'Véhicule remis propre et en parfait état').toString();

    // Return
    final returnDateTime = (cd['returnDateTime'] ?? contract.effectiveEndDate).toString();
    final returnLocation = (cd['returnLocation'] ?? 'Agence Casablanca').toString();
    final vKmReturn = (cd['vehicleKmReturn'] ?? cd['endKm'] ?? '').toString();
    final returnFuel = (cd['return_fuel_level'] ?? cd['returnFuelLevel'] ?? 50).toString();

    // Finances
    final dailyRate = contract.dailyRate;
    final totalPrice = contract.effectiveTotalAmount;
    final advance = contract.advancePayment;
    final remaining = contract.remainingAmount;
    final paymentMethod = contract.paymentMethod;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.symmetric(horizontal: 28, vertical: 24),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // 1. Header (Company details & Contract Number)
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'BONA TOURS SARL',
                        style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold, letterSpacing: 1.2),
                      ),
                      pw.Text(
                        'LOCATION DE VOITURES',
                        style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, letterSpacing: 0.8),
                      ),
                      pw.Text(
                        'Courte et longue durée 7/7',
                        style: pw.TextStyle(fontSize: 9, fontStyle: pw.FontStyle.italic),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('10 Avenue des Far, Bureau N° 308 - Casablanca', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text('Tél: 05 22 22 87 04 - Fax: 05 22 47 17 80', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text('GSM: 06 62 59 63 07 - Email: bonatours308@gmail.com', style: const pw.TextStyle(fontSize: 8)),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 10),

              // Title Ribbon
              pw.Center(
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: PdfColors.black, width: 1.5),
                      ),
                      child: pw.Text(
                        'CONTRAT DE LOCATION',
                        style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, letterSpacing: 1.2),
                      ),
                    ),
                    pw.Text(
                      'N° : ${contract.contractNumber}',
                      style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 8),

              // 2. Section LOCATAIRE
              _sectionHeader('LOCATAIRE'),
              pw.Container(
                decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.black, width: 0.8)),
                padding: const pw.EdgeInsets.all(6),
                child: pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    // Main Driver
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _subHeader('Locataire Principal'),
                          _item2('Nom / Prénom:', '$customerLastName $customerFirstName'),
                          _item2('Adresse Maroc:', customerAddress),
                          if (customerForeignAddress.isNotEmpty) _item2('Adresse Étranger:', customerForeignAddress),
                          _item2('Téléphone:', customerPhone),
                          _item2('C.I.N. N°:', '$customerCin ${customerCinDelivered.isNotEmpty ? "délivré le $customerCinDelivered" : ""}'),
                          _item2('Permis N°:', '$customerLicense ${customerLicenseDelivered.isNotEmpty ? "délivré le $customerLicenseDelivered" : ""}'),
                          if (customerPassport.isNotEmpty) _item2('Passeport N°:', '$customerPassport ${customerPassportDelivered.isNotEmpty ? "délivré le $customerPassportDelivered" : ""}'),
                          if (customerBirthDate.isNotEmpty) _item2('Date Naissance:', customerBirthDate),
                        ],
                      ),
                    ),
                    pw.VerticalDivider(color: PdfColors.black, thickness: 0.8),
                    // 2nd Driver
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _subHeader('2ème Conducteur'),
                          _item2('Nom / Prénom:', '$d2LastName $d2FirstName'.trim().isNotEmpty ? '$d2LastName $d2FirstName'.trim() : 'Néant'),
                          _item2('Adresse:', d2Address.isNotEmpty ? d2Address : '-'),
                          _item2('Téléphone:', d2Phone.isNotEmpty ? d2Phone : '-'),
                          _item2('C.I.N. N°:', d2Cin.isNotEmpty ? d2Cin : '-'),
                          _item2('Permis N°:', d2License.isNotEmpty ? d2License : '-'),
                          _item2('Passeport N°:', d2Passport.isNotEmpty ? d2Passport : '-'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 6),

              // 3. Section VÉHICULE
              _sectionHeader('VÉHICULE'),
              pw.Container(
                decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.black, width: 0.8)),
                padding: const pw.EdgeInsets.all(6),
                child: pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    // Departure
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _subHeader('Livraison du Véhicule'),
                          _item2('Véhicule:', '$vBrand $vModel'.trim()),
                          _item2('Immatriculation:', vPlate),
                          if (vYear.isNotEmpty) _item2('Année:', vYear),
                          _item2('Km Départ:', '$vKmDepart km'),
                          _item2('Date & Heure:', deliveryDateTime),
                          _item2('Lieu Prise:', deliveryLocation),
                          _item2('Durée:', '$rentalDays jour(s)'),
                          _item2('Carburant:', '$deliveryFuel%'),
                          _item2('Accessoires:', emergencyEquipment),
                          _item2('Observations:', observations),
                        ],
                      ),
                    ),
                    pw.VerticalDivider(color: PdfColors.black, thickness: 0.8),
                    // Return
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _subHeader('Reprise du Véhicule'),
                          _item2('Date & Heure:', returnDateTime),
                          _item2('Lieu Restitution:', returnLocation),
                          _item2('Km Retour:', vKmReturn.isNotEmpty ? '$vKmReturn km' : '-'),
                          _item2('Carburant Retour:', '$returnFuel%'),
                          _item2('État Restitution:', 'Conforme à l\'état de départ'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 6),

              // 4. Section FACTURATION
              _sectionHeader('FACTURATION'),
              pw.Container(
                decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.black, width: 0.8)),
                padding: const pw.EdgeInsets.all(6),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        _finTile('Prix / Jour', '${fmt.format(dailyRate)} DH'),
                        _finTile('Durée', '$rentalDays j'),
                        _finTile('Total TTC', '${fmt.format(totalPrice)} DH', isBold: true),
                        _finTile('Avance versée', '${fmt.format(advance)} DH'),
                        _finTile('Reste à payer', '${fmt.format(remaining)} DH', isHighlight: true),
                      ],
                    ),
                    pw.SizedBox(height: 4),
                    pw.Row(
                      children: [
                        pw.Text('Mode de Règlement : ', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                        pw.Text(paymentMethod, style: const pw.TextStyle(fontSize: 8)),
                      ],
                    ),
                    pw.SizedBox(height: 4),
                    pw.Container(
                      padding: const pw.EdgeInsets.all(4),
                      decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                      child: pw.Text(
                        'Le locataire du véhicule BONATOURS SARL reconnaît avoir lu et accepté les conditions générales stipulées au présent contrat, il est le seul responsable en cas d\'infractions ou d\'accidents pendant toute la durée de la location.',
                        style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey900),
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 8),

              // 5. Section SIGNATURES
              pw.Row(
                children: [
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _subHeader('Signatures à la Livraison'),
                        pw.Row(
                          children: [
                            _sigBox('L\'Agent'),
                            pw.SizedBox(width: 6),
                            _sigBox('Le Locataire (Lu et Approuvé)'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 12),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _subHeader('Signatures à la Restitution'),
                        pw.Row(
                          children: [
                            _sigBox('L\'Agent'),
                            pw.SizedBox(width: 6),
                            _sigBox('Le Locataire'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              pw.Spacer(),

              // Footer
              pw.Divider(color: PdfColors.grey400, thickness: 0.5),
              pw.Center(
                child: pw.Text(
                  'BONA TOURS SARL • RC : 341955 • IF : 18734253 • Patente : 3515353P • CNSS : 9928112 • ICE : 00003111000011',
                  style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.grey700),
                ),
              ),
            ],
          );
        },
      ),
    );

    return await pdf.save();
  }

  static pw.Widget _sectionHeader(String title) {
    return pw.Container(
      width: double.infinity,
      color: PdfColors.black,
      padding: const pw.EdgeInsets.symmetric(vertical: 2.5, horizontal: 6),
      child: pw.Text(
        title,
        style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 8.5),
      ),
    );
  }

  static pw.Widget _subHeader(String title) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 3),
      child: pw.Text(
        title,
        style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, decoration: pw.TextDecoration.underline),
      ),
    );
  }

  static pw.Widget _item2(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.SizedBox(
            width: 78,
            child: pw.Text(label, style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold)),
          ),
          pw.Expanded(
            child: pw.Text(value, style: const pw.TextStyle(fontSize: 7.5)),
          ),
        ],
      ),
    );
  }

  static pw.Widget _finTile(String title, String val, {bool isBold = false, bool isHighlight = false}) {
    return pw.Container(
      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: pw.BoxDecoration(
        color: isHighlight ? PdfColors.grey200 : PdfColors.white,
        border: pw.Border.all(color: PdfColors.grey400, width: 0.5),
      ),
      child: pw.Column(
        children: [
          pw.Text(title, style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey800)),
          pw.SizedBox(height: 1),
          pw.Text(
            val,
            style: pw.TextStyle(
              fontSize: isBold ? 9 : 8,
              fontWeight: isBold || isHighlight ? pw.FontWeight.bold : pw.FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _sigBox(String label) {
    return pw.Expanded(
      child: pw.Container(
        height: 48,
        decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.black, width: 0.8)),
        padding: const pw.EdgeInsets.all(3),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text(label, style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey700)),
            pw.Align(
              alignment: pw.Alignment.bottomRight,
              child: pw.Text('Cachet & Signature', style: const pw.TextStyle(fontSize: 6, color: PdfColors.grey500)),
            ),
          ],
        ),
      ),
    );
  }
}
