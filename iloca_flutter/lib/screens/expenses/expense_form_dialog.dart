import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';

class ExpenseFormDialog extends StatefulWidget {
  final AppStateProvider appState;
  final ExpenseModel? expense;

  const ExpenseFormDialog({
    super.key,
    required this.appState,
    this.expense,
  });

  @override
  State<ExpenseFormDialog> createState() => _ExpenseFormDialogState();
}

class _ExpenseFormDialogState extends State<ExpenseFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _costCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _tagsCtrl = TextEditingController();

  String? _selectedVehicleId;
  String _selectedType = 'assurance';
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now().add(const Duration(days: 365));
  bool _recurringEnabled = false;
  String _recurringFrequency = 'yearly';
  bool _isSaving = false;

  final DateFormat _dateFormat = DateFormat('yyyy-MM-dd');
  final DateFormat _displayFormat = DateFormat('dd/MM/yyyy');

  static const List<Map<String, dynamic>> _typeOptions = [
    {
      'id': 'vignette',
      'label': 'Vignette Fiscale',
      'icon': LucideIcons.stamp,
      'color': AppColors2026.amberSolar,
    },
    {
      'id': 'assurance',
      'label': 'Assurance Flotte',
      'icon': LucideIcons.shieldCheck,
      'color': AppColors2026.cyanNeon,
    },
    {
      'id': 'visite_technique',
      'label': 'Visite Technique',
      'icon': LucideIcons.wrench,
      'color': AppColors2026.violetElectric,
    },
    {
      'id': 'gps',
      'label': 'Traceur & GPS',
      'icon': LucideIcons.radio,
      'color': AppColors2026.emeraldNeon,
    },
    {
      'id': 'credit',
      'label': 'Crédit / Leasing',
      'icon': LucideIcons.creditCard,
      'color': AppColors2026.blueRoyal,
    },
    {
      'id': 'reparation',
      'label': 'Entretien & Réparation',
      'icon': LucideIcons.hammer,
      'color': AppColors2026.roseLaser,
    },
  ];

  @override
  void initState() {
    super.initState();
    final exp = widget.expense;
    if (exp != null) {
      _selectedVehicleId = exp.vehicleId.isNotEmpty ? exp.vehicleId : null;
      _selectedType = exp.type;
      _costCtrl.text = exp.totalCost.toStringAsFixed(exp.totalCost.truncateToDouble() == exp.totalCost ? 0 : 2);
      _notesCtrl.text = exp.notes ?? '';
      _tagsCtrl.text = exp.tags.join(', ');
      _recurringEnabled = exp.recurringEnabled;
      _recurringFrequency = exp.recurringFrequency;
      if (exp.startDate.isNotEmpty) {
        _startDate = DateTime.tryParse(exp.startDate) ?? DateTime.now();
      }
      if (exp.endDate.isNotEmpty) {
        _endDate = DateTime.tryParse(exp.endDate) ?? DateTime.now().add(const Duration(days: 365));
      }
    } else {
      if (widget.appState.vehicles.isNotEmpty) {
        _selectedVehicleId = widget.appState.vehicles.first.id;
      }
    }
  }

  @override
  void dispose() {
    _costCtrl.dispose();
    _notesCtrl.dispose();
    _tagsCtrl.dispose();
    super.dispose();
  }

  int get _computedPeriodMonths {
    final diffDays = _endDate.difference(_startDate).inDays;
    final months = (diffDays / 30.44).ceil();
    return months < 1 ? 1 : months;
  }

  double get _computedMonthlyCost {
    final cost = double.tryParse(_costCtrl.text.trim()) ?? 0.0;
    final months = _computedPeriodMonths;
    return months > 0 ? (cost / months) : cost;
  }

  Future<void> _pickDate({required bool isStart}) async {
    final initialDate = isStart ? _startDate : _endDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors2026.amberSolar,
              onPrimary: Colors.black,
              surface: AppColors2026.obsidianSurface,
              onSurface: Colors.white,
            ),
            dialogBackgroundColor: AppColors2026.obsidianSurface,
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate.isBefore(_startDate)) {
            _endDate = _startDate.add(const Duration(days: 365));
          }
        } else {
          _endDate = picked;
          if (_endDate.isBefore(_startDate)) {
            _startDate = _endDate.subtract(const Duration(days: 30));
          }
        }
      });
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedVehicleId == null || _selectedVehicleId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner un véhicule de la flotte.'),
          backgroundColor: AppColors2026.roseLaser,
        ),
      );
      return;
    }

    final total = double.tryParse(_costCtrl.text.trim()) ?? 0.0;
    if (total <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Le montant total doit être supérieur à 0 MAD.'),
          backgroundColor: AppColors2026.roseLaser,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final tags = _tagsCtrl.text
          .split(',')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();

      final months = _computedPeriodMonths;
      final monthly = months > 0 ? (total / months) : total;

      final expenseModel = ExpenseModel(
        id: widget.expense?.id ?? '',
        vehicleId: _selectedVehicleId!,
        type: _selectedType,
        totalCost: total,
        startDate: _dateFormat.format(_startDate),
        endDate: _dateFormat.format(_endDate),
        periodMonths: months,
        monthlyCost: monthly,
        notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
        tags: tags,
        recurringEnabled: _recurringEnabled,
        recurringFrequency: _recurringFrequency,
        archived: widget.expense?.archived ?? false,
        parentExpenseId: widget.expense?.parentExpenseId,
        nextDueDate: _dateFormat.format(_endDate),
        createdAt: widget.expense?.createdAt ?? DateTime.now().toIso8601String(),
        updatedAt: DateTime.now().toIso8601String(),
      );

      await widget.appState.saveExpense(
        expenseModel,
        isEdit: widget.expense != null,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.expense != null
                  ? 'Dépense mise à jour avec succès.'
                  : 'Nouvelle dépense enregistrée avec succès.',
            ),
            backgroundColor: AppColors2026.emeraldNeon,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors de l\'enregistrement : $e'),
            backgroundColor: AppColors2026.roseLaser,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final vehicles = widget.appState.vehicles;
    final isEdit = widget.expense != null;
    final activeTypeMeta = _typeOptions.firstWhere(
      (opt) => opt['id'] == _selectedType,
      orElse: () => _typeOptions.first,
    );

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 580),
        child: SpatialGlassCard(
          glowColor: activeTypeMeta['color'] as Color,
          padding: const EdgeInsets.all(22),
          child: SingleChildScrollView(
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Dialog Header
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: (activeTypeMeta['color'] as Color).withOpacity(0.18),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: (activeTypeMeta['color'] as Color).withOpacity(0.5),
                          ),
                        ),
                        child: Icon(
                          activeTypeMeta['icon'] as IconData,
                          color: activeTypeMeta['color'] as Color,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isEdit ? 'Modifier la Charge' : 'Nouvelle Charge Flotte',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              'Gestion des coûts récurrents & entretien BonaTours',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors2026.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(LucideIcons.x, size: 20),
                        color: AppColors2026.textMuted,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Divider(color: Colors.white12, height: 1),
                  const SizedBox(height: 18),

                  // Vehicle Selector
                  const Text(
                    'VÉHICULE ASSOCIÉ *',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                      color: AppColors2026.cyanNeon,
                    ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedVehicleId,
                    isExpanded: true,
                    dropdownColor: AppColors2026.obsidianSurface,
                    decoration: InputDecoration(
                      prefixIcon: const Icon(LucideIcons.car, size: 18),
                      hintText: 'Sélectionner un véhicule',
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.04),
                    ),
                    items: vehicles.map((v) {
                      return DropdownMenuItem<String>(
                        value: v.id,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              v.fullName,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                v.registration,
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors2026.amberSolar,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedVehicleId = val),
                    validator: (val) => val == null ? 'Champ requis' : null,
                  ),
                  const SizedBox(height: 18),

                  // Expense Type Grid / Pills
                  const Text(
                    'TYPE DE DÉPENSE *',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                      color: AppColors2026.cyanNeon,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _typeOptions.map((opt) {
                      final isSelected = opt['id'] == _selectedType;
                      final col = opt['color'] as Color;
                      return InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => setState(() => _selectedType = opt['id'] as String),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                          decoration: BoxDecoration(
                            color: isSelected ? col.withOpacity(0.2) : Colors.white.withOpacity(0.03),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? col : Colors.white.withOpacity(0.1),
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                opt['icon'] as IconData,
                                size: 16,
                                color: isSelected ? col : AppColors2026.textMuted,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                opt['label'] as String,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                                  color: isSelected ? Colors.white : AppColors2026.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 18),

                  // Amount TTC
                  const Text(
                    'MONTANT TOTAL (MAD TTC) *',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                      color: AppColors2026.cyanNeon,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _costCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      prefixIcon: Icon(LucideIcons.banknote, size: 18),
                      suffixText: 'MAD',
                      hintText: 'Ex: 2400',
                      filled: true,
                    ),
                    onChanged: (_) => setState(() {}),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) return 'Montant obligatoire';
                      final num = double.tryParse(val.trim());
                      if (num == null || num <= 0) return 'Montant invalide';
                      return null;
                    },
                  ),
                  const SizedBox(height: 18),

                  // Dates: Du / Au
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'DATE DÉBUT *',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.6,
                                color: AppColors2026.cyanNeon,
                              ),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => _pickDate(isStart: true),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.04),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(LucideIcons.calendar, size: 16, color: AppColors2026.cyanNeon),
                                    const SizedBox(width: 10),
                                    Text(
                                      _displayFormat.format(_startDate),
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'DATE FIN / ÉCHÉANCE *',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.6,
                                color: AppColors2026.cyanNeon,
                              ),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => _pickDate(isStart: false),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.04),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(LucideIcons.calendarCheck, size: 16, color: AppColors2026.amberSolar),
                                    const SizedBox(width: 10),
                                    Text(
                                      _displayFormat.format(_endDate),
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Dynamic Cost Breakdown Preview
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors2026.obsidianElevated.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.06)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(LucideIcons.calculator, size: 16, color: AppColors2026.cyanBright),
                            const SizedBox(width: 8),
                            Text(
                              'Période : $_computedPeriodMonths mois',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors2026.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          '${_computedMonthlyCost.toStringAsFixed(1)} MAD / mois',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: AppColors2026.emeraldNeon,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Recurring Toggle
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.03),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.06)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(LucideIcons.repeat, size: 18, color: AppColors2026.violetElectric),
                            SizedBox(width: 10),
                            Text(
                              'Renouvellement automatique',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        Switch(
                          value: _recurringEnabled,
                          activeColor: AppColors2026.violetElectric,
                          onChanged: (val) => setState(() => _recurringEnabled = val),
                        ),
                      ],
                    ),
                  ),
                  if (_recurringEnabled) ...[
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: _recurringFrequency,
                      dropdownColor: AppColors2026.obsidianSurface,
                      decoration: const InputDecoration(
                        labelText: 'Fréquence de renouvellement',
                        prefixIcon: Icon(LucideIcons.clock, size: 18),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'monthly', child: Text('Mensuel')),
                        DropdownMenuItem(value: 'quarterly', child: Text('Trimestriel')),
                        DropdownMenuItem(value: 'yearly', child: Text('Annuel')),
                      ],
                      onChanged: (val) => setState(() => _recurringFrequency = val ?? 'yearly'),
                    ),
                  ],
                  const SizedBox(height: 18),

                  // Notes / Remarques
                  TextFormField(
                    controller: _notesCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Notes ou Référence facture / police (Optionnel)',
                      prefixIcon: Icon(LucideIcons.stickyNote, size: 18),
                      hintText: 'Ex: Compagnie RMA, Police N° 987654321',
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Action Buttons (Save / Cancel)
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _isSaving ? null : () => Navigator.of(context).pop(),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: BorderSide(color: Colors.white.withOpacity(0.2)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: const Text('Annuler', style: TextStyle(color: Colors.white)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: activeTypeMeta['color'] as Color,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 4,
                          ),
                          icon: _isSaving
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                                )
                              : Icon(isEdit ? LucideIcons.save : LucideIcons.plus, size: 18),
                          label: Text(
                            isEdit ? 'METTRE À JOUR' : 'ENREGISTRER LA CHARGE',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.5),
                          ),
                          onPressed: _isSaving ? null : _handleSave,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
