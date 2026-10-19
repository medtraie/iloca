import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme_2026.dart';
import '../config/app_config.dart';

/// 2026 Spatial Frosted Glass Container with Subtle Neon Rim & Glow
class SpatialGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final Color? glowColor;
  final Color? borderColor;
  final Color? backgroundColor;
  final VoidCallback? onTap;
  final double blurSigma;

  const SpatialGlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.borderRadius = 24,
    this.glowColor,
    this.borderColor,
    this.backgroundColor,
    this.onTap,
    this.blurSigma = 18,
  });

  @override
  Widget build(BuildContext context) {
    final content = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          padding: padding,
          decoration: BoxDecoration(
            color: backgroundColor ?? AppColors2026.obsidian.withOpacity(0.76),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: borderColor ?? Colors.white.withOpacity(0.12),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.35),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
              if (glowColor != null)
                BoxShadow(
                  color: glowColor!.withOpacity(0.18),
                  blurRadius: 22,
                  spreadRadius: 1,
                ),
            ],
          ),
          child: child,
        ),
      ),
    );

    if (onTap != null) {
      return Padding(
        padding: margin ?? EdgeInsets.zero,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: content,
        ),
      );
    }

    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: content,
    );
  }
}

/// 2026 Bento Metric Tile with Icon Halo & Delta Pill
class BentoMetricTile extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color accentColor;
  final String? badgeText;
  final VoidCallback? onTap;

  const BentoMetricTile({
    super.key,
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.accentColor,
    this.badgeText,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SpatialGlassCard(
      onTap: onTap,
      glowColor: accentColor,
      borderColor: accentColor.withOpacity(0.28),
      padding: const EdgeInsets.all(15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: accentColor.withOpacity(0.35)),
                ),
                child: Icon(icon, size: 18, color: accentColor),
              ),
              if (badgeText != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: accentColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: accentColor.withOpacity(0.35)),
                  ),
                  child: Text(
                    badgeText!,
                    style: TextStyle(
                      color: accentColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: AppColors2026.textSecondary,
            ),
          ),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: accentColor.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }
}

/// Animated Pulsing Beacon Dot for Live Sync & Moving Vehicles
class AnimatedPulseDot extends StatefulWidget {
  final Color color;
  final double size;

  const AnimatedPulseDot({
    super.key,
    required this.color,
    this.size = 9,
  });

  @override
  State<AnimatedPulseDot> createState() => _AnimatedPulseDotState();
}

class _AnimatedPulseDotState extends State<AnimatedPulseDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: widget.color,
            boxShadow: [
              BoxShadow(
                color: widget.color.withOpacity(0.4 + (_controller.value * 0.5)),
                blurRadius: 6 + (_controller.value * 8),
                spreadRadius: _controller.value * 2.5,
              ),
            ],
          ),
        );
      },
    );
  }
}

/// 2026 Neon Pill Badge
class NeonBadge extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;
  final bool pulsing;

  const NeonBadge({
    super.key,
    required this.label,
    required this.color,
    this.icon,
    this.pulsing = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.16),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.42)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (pulsing) ...[
            AnimatedPulseDot(color: color, size: 7),
            const SizedBox(width: 6),
          ] else if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

/// Shared Modal Sheet for Customizing Traceur Color, Thickness, Size & Neon Glow
class TraceurCustomizerSheet extends StatelessWidget {
  final Color selectedColor;
  final double weight;
  final double markerSize;
  final bool glow;
  final ValueChanged<Color> onColorChanged;
  final ValueChanged<double> onWeightChanged;
  final ValueChanged<double> onSizeChanged;
  final ValueChanged<bool> onGlowChanged;

  const TraceurCustomizerSheet({
    super.key,
    required this.selectedColor,
    required this.weight,
    required this.markerSize,
    required this.glow,
    required this.onColorChanged,
    required this.onWeightChanged,
    required this.onSizeChanged,
    required this.onGlowChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: selectedColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: selectedColor.withOpacity(0.45)),
                    ),
                    child: Icon(LucideIcons.sparkles, color: selectedColor, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'STUDIO TRACEUR 2026',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                          letterSpacing: 0.4,
                        ),
                      ),
                      Text(
                        'Personnaliser couleur, taille et halo néon',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors2026.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(LucideIcons.x, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            'COULEUR DU TRACEUR & TRAJET',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: AppColors2026.textSecondary,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: AppColors2026.tracerColors.map((preset) {
              final isSelected = preset.color.value == selectedColor.value;
              return GestureDetector(
                onTap: () => onColorChanged(preset.color),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? preset.color.withOpacity(0.22)
                        : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? preset.color : Colors.white12,
                      width: isSelected ? 1.8 : 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: preset.color,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: preset.color.withOpacity(0.6),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 7),
                      Text(
                        preset.label,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'ÉPAISSEUR DE LA LIGNE',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppColors2026.textSecondary,
                ),
              ),
              Text(
                '${weight.round()} px',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: selectedColor,
                ),
              ),
            ],
          ),
          Slider(
            value: weight,
            min: 2,
            max: 12,
            divisions: 10,
            activeColor: selectedColor,
            onChanged: onWeightChanged,
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'TAILLE DU MARQUEUR TRACEUR',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppColors2026.textSecondary,
                ),
              ),
              Text(
                '${markerSize.round()} px',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: selectedColor,
                ),
              ),
            ],
          ),
          Slider(
            value: markerSize,
            min: 28,
            max: 64,
            divisions: 18,
            activeColor: selectedColor,
            onChanged: onSizeChanged,
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'Effet Halo Néon & Pulsation 2026',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            subtitle: const Text(
              'Double tracé lumineux autour du parcours',
              style: TextStyle(fontSize: 11, color: AppColors2026.textSecondary),
            ),
            activeColor: selectedColor,
            value: glow,
            onChanged: onGlowChanged,
          ),
        ],
      ),
    );
  }
}

/// Shared Modal Sheet for Switching Google Maps Layers
class MapLayerSwitcherSheet extends StatelessWidget {
  final String currentLayerId;
  final ValueChanged<String> onSelectLayer;

  const MapLayerSwitcherSheet({
    super.key,
    required this.currentLayerId,
    required this.onSelectLayer,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.layers, color: AppColors2026.cyanNeon, size: 20),
                  SizedBox(width: 10),
                  Text(
                    'CARTOGRAPHIE GOOGLE MAPS 2026',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                  ),
                ],
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(LucideIcons.x, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...AppConfig.mapTileStyles.values.map((style) {
            final selected = style.id == currentLayerId;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                onTap: () {
                  onSelectLayer(style.id);
                  Navigator.pop(context);
                },
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: selected
                        ? AppColors2026.cyanNeon
                        : Colors.white.withOpacity(0.1),
                    width: selected ? 1.6 : 1,
                  ),
                ),
                tileColor: selected
                    ? AppColors2026.cyanNeon.withOpacity(0.14)
                    : Colors.white.withOpacity(0.04),
                leading: Icon(
                  style.id.contains('satellite') || style.id.contains('hybrid')
                      ? LucideIcons.globe
                      : style.id.contains('traffic')
                          ? LucideIcons.activity
                          : LucideIcons.map,
                  color: selected ? AppColors2026.cyanNeon : Colors.white70,
                ),
                title: Text(
                  style.label,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: selected ? AppColors2026.cyanBright : Colors.white,
                  ),
                ),
                subtitle: Text(
                  style.description,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors2026.textSecondary,
                  ),
                ),
                trailing: NeonBadge(
                  label: style.badge,
                  color: selected
                      ? AppColors2026.emeraldNeon
                      : AppColors2026.cyanNeon,
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
