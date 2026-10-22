import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/utils/number_to_words.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

/// 100% Web Parity Invoice Form (Matching Factures.tsx + InvoiceForm.tsx)
class InvoiceFormDialog extends StatefulWidget {
  final AppStateProvider appState;
  final InvoiceModel? existingInvoice;

  const InvoiceFormDialog({
    super.key,
    required this.appState,
    this.existingInvoice,
  });

  @override
  State<InvoiceFormDialog> createState() => _InvoiceFormDialogState();
}

class _InvoiceFormDialogState extends State<InvoiceFormDialog> {
  bool _isSaving = false;

  late final TextEditingController _companyNameCtrl;
  late final TextEditingController _invoiceTypeCtrl;
  late final TextEditingController _invoiceNumberCtrl;
  late final TextEditingController _invoiceDateCtrl;
  late final TextEditingController _customerNumberCtrl;
  late final TextEditingController _beneficiaryNameCtrl;
  late final TextEditingController _beneficiaryIceCtrl;

  late final TextEditingController _quantityCtrl;
  late final TextEditingController _unitCtrl;
  late final TextEditingController _descriptionCtrl;
  late final TextEditingController _unitPriceCtrl;

  String _paymentMethod = 'CHEQUE';
  String _status = 'pending';

  @override
  void initState() {
    super.initState();
    final inv = widget.existingInvoice;
    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);

    _companyNameCtrl = TextEditingController(text: 'BONA TOURS SARL');
    _invoiceTypeCtrl = TextEditingController(text: 'FACTURE');
    _invoiceNumberCtrl = TextEditingController(
      text: inv?.invoiceNumber.isNotEmpty == true
          ? inv!.invoiceNumber
          : _computeNextInvoiceNumber(),
    );
    _invoiceDateCtrl = TextEditingController(text: inv?.invoiceDate ?? todayStr);
    _customerNumberCtrl = TextEditingController(text: '419');
    _beneficiaryNameCtrl =
        TextEditingController(text: inv?.customerName ?? 'ASSURANCE ATLANTIQUE SUD');
    _beneficiaryIceCtrl =
        TextEditingController(text: inv?.customerICE ?? '001642233600044');

    _quantityCtrl = TextEditingController(
      text: inv != null ? inv.quantity.toStringAsFixed(0) : '1',
    );
    _unitCtrl = TextEditingController(text: inv?.unit ?? 'J');
    _descriptionCtrl = TextEditingController(
      text: inv?.description ??
          'LOCATION COURTE DUREE\nPERIODE DU ${DateFormat("dd/MM/yyyy").format(now)} AU ${DateFormat("dd/MM/yyyy").format(now.add(const Duration(days: 1)))}',
    );
    _unitPriceCtrl = TextEditingController(
      text: inv != null ? inv.unitPrice.toStringAsFixed(2) : '1000.00',
    );

    _paymentMethod = inv?.paymentMethod ?? 'CHEQUE';
    _status = inv?.status ?? 'pending';

    _quantityCtrl.addListener(() => setState(() {}));
    _unitPriceCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _companyNameCtrl.dispose();
    _invoiceTypeCtrl.dispose();
    _invoiceNumberCtrl.dispose();
    _invoiceDateCtrl.dispose();
    _customerNumberCtrl.dispose();
    _beneficiaryNameCtrl.dispose();
    _beneficiaryIceCtrl.dispose();
    _quantityCtrl.dispose();
    _unitCtrl.dispose();
    _descriptionCtrl.dispose();
    _unitPriceCtrl.dispose();
    super.dispose();
  }

  String _computeNextInvoiceNumber() {
    final year = DateTime.now().year;
    final count = widget.appState.invoices.length + 1;
    final padded = count.toString().padLeft(4, '0');
    return '$padded/$year';
  }

  double get _quantity {
    final clean = _quantityCtrl.text.replaceAll(',', '.').trim();
    return double.tryParse(clean) ?? 1;
  }

  double get _unitPrice {
    final clean = _unitPriceCtrl.text.replaceAll(',', '.').trim();
    return double.tryParse(clean) ?? 0;
  }

  double get _totalHT => _quantity * _unitPrice;
  double get _tva => _totalHT * 0.20;
  double get _totalTTC => _totalHT + _tva;

  String get _totalWords => NumberToFrenchWords.convert(_totalTTC);

  Future<void> _selectDate() async {
    final current = DateTime.tryParse(_invoiceDateCtrl.text) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors2026.cyanNeon,
              surface: AppColors2026.obsidianSurface,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      _invoiceDateCtrl.text = DateFormat('yyyy-MM-dd').format(picked);
      setState(() {});
    }
  }

  void _showClientPicker() {
    final clients = widget.appState.clients;
    if (clients.isEmpty) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors2026.obsidianSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const Padding(
                padding: EdgeInsets.all(12),
                child: Text(
                  'Sélectionner un Client (Bénéficiaire)',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ),
              const Divider(color: Colors.white10),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: clients.length,
                  itemBuilder: (ctx, i) {
                    final c = clients[i];
                    return ListTile(
                      title: Text(c.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('CIN: ${c.cin} • Tél: ${c.phone}'),
                      onTap: () {
                        setState(() {
                          _beneficiaryNameCtrl.text = c.fullName.toUpperCase();
                          if (c.cin.isNotEmpty) {
                            _customerNumberCtrl.text = c.cin;
                          }
                        });
                        Navigator.pop(ctx);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showVehiclePicker() {
    final vehicles = widget.appState.vehicles;
    if (vehicles.isEmpty) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors2026.obsidianSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const Padding(
                padding: EdgeInsets.all(12),
                child: Text(
                  'Sélectionner un Véhicule pour la Désignation',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ),
              const Divider(color: Colors.white10),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: vehicles.length,
                  itemBuilder: (ctx, i) {
                    final v = vehicles[i];
                    return ListTile(
                      title: Text(v.fullName.toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('Immat: ${v.registration} • Prix: ${v.dailyRate} DH/j'),
                      onTap: () {
                        setState(() {
                          _descriptionCtrl.text =
                              'LOCATION COURTE DUREE ${v.fullName.toUpperCase()}\nIMMATRICULATION: ${v.registration}';
                          if (v.dailyRate > 0) {
                            _unitPriceCtrl.text = v.dailyRate.toStringAsFixed(2);
                          }
                        });
                        Navigator.pop(ctx);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _handleSave() async {
    final invNum = _invoiceNumberCtrl.text.trim();
    final clientName = _beneficiaryNameCtrl.text.trim();

    if (invNum.isEmpty || clientName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors2026.roseLaser,
          content: Text('Veuillez renseigner le numéro de facture et le client bénéficiaire.'),
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    final nowIso = DateTime.now().toIso8601String();

    try {
      final invoice = InvoiceModel(
        id: widget.existingInvoice?.id ?? '',
        invoiceNumber: invNum,
        customerName: clientName,
        customerICE: _beneficiaryIceCtrl.text.trim(),
        invoiceDate: _invoiceDateCtrl.text.trim(),
        description: _descriptionCtrl.text.trim(),
        quantity: _quantity,
        unit: _unitCtrl.text.trim(),
        unitPrice: _unitPrice,
        totalHT: _totalHT,
        tva: _tva,
        taxRate: 20,
        totalTTC: _totalTTC,
        paymentMethod: _paymentMethod,
        status: _status,
        createdAt: widget.existingInvoice?.createdAt ?? nowIso,
        updatedAt: nowIso,
      );

      await widget.appState.saveInvoice(
        invoice,
        isEdit: widget.existingInvoice != null,
      );

      if (!mounted) return;
      Navigator.pop(context, invoice);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors2026.emeraldNeon,
          content: Text(
            widget.existingInvoice != null
                ? 'Facture #$invNum mise à jour avec succès et synchronisée !'
                : 'Facture #$invNum créée et synchronisée avec le Web !',
            style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
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

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.existingInvoice != null;
    final currencyFmt = NumberFormat('#,##0.00', 'fr_FR');

    return Scaffold(
      backgroundColor: AppColors2026.abyss,
      appBar: AppBar(
        backgroundColor: AppColors2026.obsidianSurface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.x, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors2026.cyanNeon.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors2026.cyanNeon.withOpacity(0.5)),
                  ),
                  child: const Text(
                    'BONATOURS FACTURATION 2026',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: AppColors2026.cyanNeon,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  isEdit ? 'Modifier Facture' : 'Nouvelle Facture',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                ),
              ],
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              onPressed: _isSaving ? null : _handleSave,
              style: TextButton.styleFrom(
                backgroundColor: AppColors2026.cyanNeon,
                foregroundColor: AppColors2026.abyss,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: _isSaving
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                    )
                  : const Icon(LucideIcons.check, size: 16),
              label: Text(
                _isSaving ? 'Sync...' : 'Enregistrer',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. INVOICE HEADER (Société & Bénéficiaire / ICE)
            SpatialGlassCard(
              padding: const EdgeInsets.all(16),
              borderColor: AppColors2026.cyanNeon.withOpacity(0.35),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(LucideIcons.building2, size: 16, color: AppColors2026.cyanBright),
                          SizedBox(width: 8),
                          Text(
                            'ÉMETTEUR & INFORMATIONS FACTURE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _invoiceTypeCtrl.text,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppColors2026.cyanNeon,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Société Name
                  TextFormField(
                    controller: _companyNameCtrl,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                    decoration: InputDecoration(
                      labelText: 'Société Émettrice',
                      labelStyle: const TextStyle(fontSize: 12),
                      prefixIcon: const Icon(LucideIcons.landmark, size: 16),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.03),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Numéro + Date + N° Client
                  Row(
                    children: [
                      Expanded(
                        flex: 4,
                        child: TextFormField(
                          controller: _invoiceNumberCtrl,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            labelText: 'N° Facture',
                            prefixIcon: const Icon(LucideIcons.hash, size: 14),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 4,
                        child: InkWell(
                          onTap: _selectDate,
                          child: IgnorePointer(
                            child: TextFormField(
                              controller: _invoiceDateCtrl,
                              style: const TextStyle(fontSize: 13),
                              decoration: InputDecoration(
                                labelText: 'Date',
                                prefixIcon: const Icon(LucideIcons.calendar, size: 14),
                                contentPadding:
                                    const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 3,
                        child: TextFormField(
                          controller: _customerNumberCtrl,
                          style: const TextStyle(fontSize: 13),
                          decoration: InputDecoration(
                            labelText: 'Réf Client',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Bénéficiaire / Client
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Bénéficiaire (Client Facturé)',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors2026.textSecondary),
                      ),
                      TextButton.icon(
                        onPressed: _showClientPicker,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        icon: const Icon(LucideIcons.users, size: 12),
                        label: const Text('Choisir Client', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _beneficiaryNameCtrl,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      hintText: 'Nom du client ou de la société...',
                      prefixIcon: const Icon(LucideIcons.userCheck, size: 16),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _beneficiaryIceCtrl,
                    style: const TextStyle(fontSize: 13, letterSpacing: 0.5),
                    decoration: InputDecoration(
                      labelText: 'ICE (Identifiant Commun de l\'Entreprise)',
                      prefixIcon: const Icon(LucideIcons.creditCard, size: 16),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 2. INVOICE TABLE / PRESTATION
            SpatialGlassCard(
              padding: const EdgeInsets.all(16),
              borderColor: AppColors2026.violetElectric.withOpacity(0.35),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(LucideIcons.table2, size: 16, color: AppColors2026.violetElectric),
                          SizedBox(width: 8),
                          Text(
                            'LIGNE DE PRESTATION & TARIF',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        onPressed: _showVehiclePicker,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        icon: const Icon(LucideIcons.car, size: 12),
                        label: const Text('Remplir Véhicule', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Quantité + Unité + Prix unitaire HT
                  Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: TextFormField(
                          controller: _quantityCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            labelText: 'Quantité',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          controller: _unitCtrl,
                          style: const TextStyle(fontSize: 13),
                          decoration: InputDecoration(
                            labelText: 'UDM',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 4,
                        child: TextFormField(
                          controller: _unitPriceCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            labelText: 'Prix Unit. HT (DH)',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Description / Désignation
                  TextFormField(
                    controller: _descriptionCtrl,
                    maxLines: 3,
                    style: const TextStyle(fontSize: 12.5),
                    decoration: InputDecoration(
                      labelText: 'Désignation de la prestation',
                      alignLabelWithHint: true,
                      contentPadding: const EdgeInsets.all(12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Auto Calculated Totals Box
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Column(
                      children: [
                        _TotalRow(
                          label: 'Total HT :',
                          amount: '${currencyFmt.format(_totalHT)} DH',
                          color: Colors.white,
                        ),
                        const SizedBox(height: 6),
                        _TotalRow(
                          label: 'TVA (20%) :',
                          amount: '${currencyFmt.format(_tva)} DH',
                          color: AppColors2026.textSecondary,
                        ),
                        const Divider(height: 16, color: Colors.white12),
                        _TotalRow(
                          label: 'TOTAL TTC :',
                          amount: '${currencyFmt.format(_totalTTC)} DH',
                          color: AppColors2026.cyanBright,
                          isBold: true,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 3. FOOTER (Montant en lettres & Modalité de Paiement)
            SpatialGlassCard(
              padding: const EdgeInsets.all(16),
              borderColor: AppColors2026.amberSolar.withOpacity(0.35),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(LucideIcons.fileSignature, size: 16, color: AppColors2026.amberSolar),
                      SizedBox(width: 8),
                      Text(
                        'ARRÊTÉE EN LETTRES & RÈGLEMENT',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Words Box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.03),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Arrêtée la présente facture à la somme de :',
                          style: TextStyle(fontSize: 10, color: AppColors2026.textMuted),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _totalWords,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: AppColors2026.amberSolar,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Payment Method & Status
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Mode de Règlement',
                              style: TextStyle(fontSize: 11, color: AppColors2026.textSecondary),
                            ),
                            const SizedBox(height: 6),
                            DropdownButtonFormField<String>(
                              value: _paymentMethod,
                              decoration: InputDecoration(
                                contentPadding:
                                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              items: const [
                                DropdownMenuItem(value: 'CHEQUE', child: Text('CHÈQUE')),
                                DropdownMenuItem(value: 'VIREMENT', child: Text('VIREMENT')),
                                DropdownMenuItem(value: 'ESPECES', child: Text('ESPÈCES')),
                                DropdownMenuItem(value: 'CARTE', child: Text('CARTE BANCAIRE')),
                                DropdownMenuItem(value: 'AUTRE', child: Text('AUTRE')),
                              ],
                              onChanged: (v) {
                                if (v != null) setState(() => _paymentMethod = v);
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Statut Facture',
                              style: TextStyle(fontSize: 11, color: AppColors2026.textSecondary),
                            ),
                            const SizedBox(height: 6),
                            DropdownButtonFormField<String>(
                              value: _status,
                              decoration: InputDecoration(
                                contentPadding:
                                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              items: const [
                                DropdownMenuItem(value: 'pending', child: Text('En attente')),
                                DropdownMenuItem(value: 'paid', child: Text('Payée')),
                                DropdownMenuItem(value: 'overdue', child: Text('En retard')),
                              ],
                              onChanged: (v) {
                                if (v != null) setState(() => _status = v);
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Big Action Save Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors2026.cyanNeon,
                        foregroundColor: AppColors2026.abyss,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: _isSaving ? null : _handleSave,
                      icon: _isSaving
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                            )
                          : const Icon(LucideIcons.fileCheck2, size: 18),
                      label: Text(
                        _isSaving
                            ? 'Enregistrement en cours...'
                            : (isEdit
                                ? 'Enregistrer les Modifications'
                                : 'Émettre & Synchroniser la Facture'),
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String amount;
  final Color color;
  final bool isBold;

  const _TotalRow({
    required this.label,
    required this.amount,
    required this.color,
    this.isBold = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isBold ? 13 : 11.5,
            fontWeight: isBold ? FontWeight.w900 : FontWeight.w600,
            color: isBold ? Colors.white : AppColors2026.textSecondary,
          ),
        ),
        Text(
          amount,
          style: TextStyle(
            fontSize: isBold ? 15 : 12.5,
            fontWeight: FontWeight.w900,
            color: color,
          ),
        ),
      ],
    );
  }
}
