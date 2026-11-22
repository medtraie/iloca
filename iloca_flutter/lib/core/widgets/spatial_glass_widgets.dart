import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme_2026.dart';
import '../config/app_config.dart';

/// 2026 Luxury Obsidian & Gold Card (Matches `.luxury-card` & `.luxury-card-subtle`)
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
  final bool subtle;

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
    this.blurSigma = 14,
    this.subtle = false,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBorder = borderColor ??
        (subtle
            ? Colors.white.withOpacity(0.07)
            : AppColors2026.gold.withOpacity(0.22));

    final decoration = BoxDecoration(
      color: backgroundColor,
      gradient: backgroundColor == null
          ? (subtle
              ? AppColors2026.luxurySubtleGradient
              : AppColors2026.luxuryCardGradient)
          : null,
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(color: effectiveBorder, width: 1.05),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.75),
          blurRadius: subtle ? 24 : 36,
          offset: const Offset(0, 14),
        ),
        if (glowColor != null)
          BoxShadow(
            color: glowColor!.withOpacity(0.14),
            blurRadius: 24,
            spreadRadius: 0.5,
          ),
      ],
    );

    // High-performance Obsidian card without per-frame GPU BackdropFilter blur
    final content = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Container(
        padding: padding,
        decoration: decoration,
        child: child,
      ),
    );

    if (onTap != null) {
      return Padding(
        padding: margin ?? EdgeInsets.zero,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(borderRadius),
            splashColor: AppColors2026.gold.withOpacity(0.12),
            highlightColor: AppColors2026.gold.withOpacity(0.06),
            child: content,
          ),
        ),
      );
    }

    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: content,
    );
  }
}

/// Primary Gold Gradient CTA Button matching `.gold-gradient` + `.gold-glow-shadow`
class GoldGradientButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final double fontSize;
  final bool loading;

  const GoldGradientButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    this.borderRadius = 16,
    this.fontSize = 12.5,
    this.loading = false,
  });

  @override
  State<GoldGradientButton> createState() => _GoldGradientButtonState();
}

class _GoldGradientButtonState extends State<GoldGradientButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) {
        if (widget.onPressed != null) setState(() => _pressed = true);
      },
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.loading ? null : widget.onPressed,
      child: AnimatedScale(
        scale: _pressed ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 110),
        child: Container(
          padding: widget.padding,
          decoration: BoxDecoration(
            gradient: widget.onPressed == null
                ? LinearGradient(
                    colors: [
                      AppColors2026.goldDark.withOpacity(0.5),
                      AppColors2026.goldDarkDeep.withOpacity(0.5),
                    ],
                  )
                : AppColors2026.goldGradient,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            border: Border.all(
              color: Colors.white.withOpacity(0.38),
              width: 0.7,
            ),
            boxShadow: widget.onPressed == null
                ? []
                : [
                    BoxShadow(
                      color: AppColors2026.gold.withOpacity(0.38),
                      blurRadius: 22,
                      offset: const Offset(0, 8),
                    ),
                  ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.loading) ...[
                const SizedBox(
                  width: 15,
                  height: 15,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors2026.obsidian,
                  ),
                ),
                const SizedBox(width: 8),
              ] else if (widget.icon != null) ...[
                Icon(widget.icon, size: 16, color: AppColors2026.obsidian),
                const SizedBox(width: 7),
              ],
              Flexible(
                child: Text(
                  widget.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors2026.obsidian,
                    fontSize: widget.fontSize,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.15,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Secondary Dark Luxury Button (`#141722` with `gold/30` border)
class DarkLuxuryButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final double fontSize;
  final Color? accentColor;

  const DarkLuxuryButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    this.borderRadius = 16,
    this.fontSize = 12.5,
    this.accentColor,
  });

  @override
  State<DarkLuxuryButton> createState() => _DarkLuxuryButtonState();
}

class _DarkLuxuryButtonState extends State<DarkLuxuryButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final accent = widget.accentColor ?? AppColors2026.goldLight;
    return GestureDetector(
      onTapDown: (_) {
        if (widget.onPressed != null) setState(() => _pressed = true);
      },
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onPressed,
      child: AnimatedScale(
        scale: _pressed ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 110),
        child: Container(
          padding: widget.padding,
          decoration: BoxDecoration(
            color: AppColors2026.surfaceSub,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            border: Border.all(
              color: (widget.accentColor ?? AppColors2026.gold).withOpacity(0.32),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.5),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.icon != null) ...[
                Icon(widget.icon, size: 16, color: accent),
                const SizedBox(width: 7),
              ],
              Flexible(
                child: Text(
                  widget.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: widget.fontSize,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Custom Luxury Winged Emerald & Gold Crest Emblem matching Canvas Header SVG
class LuxuryCrestEmblem extends StatelessWidget {
  final double size;

  const LuxuryCrestEmblem({super.key, this.size = 44});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.1),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1B201E),
            Color(0xFF0E1117),
            Color(0xFF08090D),
          ],
        ),
        borderRadius: BorderRadius.circular(size * 0.36),
        border: Border.all(
          color: AppColors2026.gold.withOpacity(0.48),
          width: 1.1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors2026.gold.withOpacity(0.28),
            blurRadius: 18,
            spreadRadius: 0.5,
          ),
        ],
      ),
      child: CustomPaint(
        painter: _LuxuryCrestPainter(),
      ),
    );
  }
}

class _LuxuryCrestPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 120.0;
    final sy = size.height / 96.0;
    canvas.save();
    canvas.scale(sx, sy);

    final goldPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFFF3B8), Color(0xFFD4AF37), Color(0xFF8A6414)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(const Rect.fromLTWH(10, 10, 100, 76))
      ..style = PaintingStyle.fill;

    final emeraldPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF34D399), Color(0xFF059669), Color(0xFF064E3B)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(const Rect.fromLTWH(12, 12, 85, 70))
      ..style = PaintingStyle.fill;

    final goldStroke = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFFF3B8), Color(0xFFD4AF37), Color(0xFF8A6414)],
      ).createShader(const Rect.fromLTWH(10, 10, 100, 76))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    // Speed wing rays (top left)
    final ray1 = Path()
      ..moveTo(26, 22)
      ..quadraticBezierTo(48, 14, 70, 16)
      ..quadraticBezierTo(48, 19, 26, 22)
      ..close();
    canvas.drawPath(ray1, goldPaint);

    final ray2 = Path()
      ..moveTo(18, 32)
      ..quadraticBezierTo(43, 20, 69, 21)
      ..quadraticBezierTo(43, 26, 18, 32)
      ..close();
    canvas.drawPath(ray2, goldPaint);

    final wing1 = Path()
      ..moveTo(11, 45)
      ..quadraticBezierTo(38, 25, 68, 25)
      ..quadraticBezierTo(40, 34, 11, 45)
      ..close();
    canvas.drawPath(wing1, emeraldPaint);
    canvas.drawPath(wing1, goldStroke);

    final wing2 = Path()
      ..moveTo(7, 59)
      ..quadraticBezierTo(34, 34, 63, 31)
      ..quadraticBezierTo(36, 43, 7, 59)
      ..close();
    canvas.drawPath(wing2, emeraldPaint);
    canvas.drawPath(wing2, goldStroke);

    final wing3 = Path()
      ..moveTo(14, 71)
      ..quadraticBezierTo(34, 48, 55, 41)
      ..quadraticBezierTo(36, 56, 22, 72)
      ..close();
    canvas.drawPath(wing3, emeraldPaint);
    canvas.drawPath(wing3, goldStroke);

    // Highway ribbon & arc
    final ribbon = Path()
      ..moveTo(47, 47)
      ..quadraticBezierTo(62, 54, 75, 74)
      ..lineTo(68, 77)
      ..quadraticBezierTo(56, 60, 41, 53)
      ..close();
    canvas.drawPath(ribbon, emeraldPaint);
    canvas.drawPath(ribbon, goldStroke);

    final arc = Path()
      ..moveTo(89, 27)
      ..quadraticBezierTo(99, 48, 88, 74)
      ..lineTo(81, 71)
      ..quadraticBezierTo(90, 50, 84, 31)
      ..close();
    canvas.drawPath(arc, emeraldPaint);
    canvas.drawPath(arc, goldStroke);

    // Lower ornamental base
    final baseArc = Path()
      ..moveTo(10, 76)
      ..quadraticBezierTo(30, 81, 48, 76)
      ..lineTo(74, 76)
      ..quadraticBezierTo(92, 81, 110, 75)
      ..quadraticBezierTo(92, 84, 72, 80)
      ..lineTo(49, 80)
      ..quadraticBezierTo(29, 84, 10, 76)
      ..close();
    canvas.drawPath(baseArc, goldPaint);

    // Top-right Luxury GPS Location Pin
    final pin = Path()
      ..moveTo(78, 7)
      ..cubicTo(69.5, 7, 63, 13.5, 63, 21.8)
      ..cubicTo(63, 31.5, 78, 44, 78, 44)
      ..cubicTo(78, 44, 93, 31.5, 93, 21.8)
      ..cubicTo(93, 13.5, 86.5, 7, 78, 7)
      ..close();
    canvas.drawPath(pin, emeraldPaint);
    canvas.drawPath(
      pin,
      goldStroke..strokeWidth = 2.2,
    );

    final pinCorePaint = Paint()
      ..shader = const RadialGradient(
        colors: [Color(0xFFFFFBEB), Color(0xFFD4AF37), Color(0xFF78530A)],
      ).createShader(Rect.fromCircle(center: const Offset(78, 21.5), radius: 8));
    canvas.drawCircle(const Offset(78, 21.5), 7.5, pinCorePaint);
    canvas.drawCircle(
      const Offset(78, 21.5),
      7.5,
      Paint()
        ..color = const Color(0xFFFFFBEB)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.1,
    );
    canvas.drawCircle(
      const Offset(76, 19.5),
      2.2,
      Paint()..color = Colors.white.withOpacity(0.75),
    );

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Executive Tile Card with Isometric Gradient Orb & Badge (Matches `.exec-3d-tile` & `.exec-3d-orb`)
class Executive3DTile extends StatefulWidget {
  final String label;
  final String? subtitle;
  final String? badgeText;
  final Color badgeColor;
  final Color orbTopColor;
  final Color orbBorderColor;
  final IconData icon;
  final List<Color> iconGradient;
  final bool pulseBadge;
  final VoidCallback onTap;

  const Executive3DTile({
    super.key,
    required this.label,
    this.subtitle,
    this.badgeText,
    this.badgeColor = AppColors2026.goldLight,
    required this.orbTopColor,
    required this.orbBorderColor,
    required this.icon,
    required this.iconGradient,
    this.pulseBadge = false,
    required this.onTap,
  });

  @override
  State<Executive3DTile> createState() => _Executive3DTileState();
}

class _Executive3DTileState extends State<Executive3DTile> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _pressed ? 0.95 : 1.0,
        duration: const Duration(milliseconds: 130),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xF51C202E),
                Color(0xFC0D0F16),
              ],
            ),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: AppColors2026.gold.withOpacity(_pressed ? 0.55 : 0.25),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.85),
                blurRadius: 18,
                offset: const Offset(0, 10),
              ),
              BoxShadow(
                color: widget.orbBorderColor.withOpacity(0.08),
                blurRadius: 16,
              ),
            ],
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              if (widget.badgeText != null)
                Positioned(
                  top: -4,
                  right: -2,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: widget.badgeColor.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: widget.badgeColor.withOpacity(0.42),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (widget.pulseBadge) ...[
                          AnimatedPulseDot(color: widget.badgeColor, size: 5),
                          const SizedBox(width: 4),
                        ],
                        Text(
                          widget.badgeText!,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            color: widget.badgeColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 3D Orb Medallion
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            widget.orbTopColor,
                            const Color(0xFF11131B),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: widget.orbBorderColor.withOpacity(0.45)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.8),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Center(
                        child: ShaderMask(
                          shaderCallback: (bounds) => LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: widget.iconGradient,
                          ).createShader(bounds),
                          child: Icon(
                            widget.icon,
                            size: 24,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Flexible(
                      child: Text(
                        widget.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ),
                    if (widget.subtitle != null) ...[
                      const SizedBox(height: 2),
                      Flexible(
                        child: Text(
                          widget.subtitle!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 9,
                            color: AppColors2026.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 2026 Bento Metric Tile with Gold/Semantic Halo & Delta Pill
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
      subtle: true,
      glowColor: accentColor,
      borderColor: accentColor.withOpacity(0.28),
      padding: const EdgeInsets.all(13),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: accentColor.withOpacity(0.35)),
                ),
                child: Icon(icon, size: 17, color: accentColor),
              ),
              if (badgeText != null)
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: accentColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: accentColor.withOpacity(0.35)),
                    ),
                    child: Text(
                      badgeText!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: accentColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                maxLines: 1,
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.4,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(height: 2),
          Flexible(
            child: Text(
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
          ),
          Flexible(
            child: Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                color: accentColor.withOpacity(0.95),
              ),
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
    this.size = 8,
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
                spreadRadius: _controller.value * 2.2,
              ),
            ],
          ),
        );
      },
    );
  }
}

/// 2026 Luxury Pill Badge
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
        color: color.withOpacity(0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.38)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (pulsing) ...[
            AnimatedPulseDot(color: color, size: 6.5),
            const SizedBox(width: 6),
          ] else if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.4,
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
    return Container(
      decoration: BoxDecoration(
        color: AppColors2026.modalSheet,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: AppColors2026.gold.withOpacity(0.3)),
        ),
      ),
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
                color: AppColors2026.gold.withOpacity(0.45),
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
                      color: selectedColor.withOpacity(0.18),
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
                          fontSize: 14,
                          letterSpacing: 0.4,
                          color: AppColors2026.goldLight,
                        ),
                      ),
                      Text(
                        'Personnaliser couleur, taille et halo GPS',
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
              color: AppColors2026.goldLight,
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
                        : AppColors2026.surfaceInput,
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
              'Effet Halo Lumineux & Pulsation 2026',
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

/// Shared Modal Sheet for Switching Google Maps / Satellite Dark Layers
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
    return Container(
      decoration: BoxDecoration(
        color: AppColors2026.modalSheet,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: AppColors2026.gold.withOpacity(0.3)),
        ),
      ),
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
                color: AppColors2026.gold.withOpacity(0.45),
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
                  Icon(LucideIcons.layers, color: AppColors2026.goldLight, size: 20),
                  SizedBox(width: 10),
                  Text(
                    'CARTOGRAPHIE SATELLITE 2026',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      color: AppColors2026.goldLight,
                    ),
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
                        ? AppColors2026.gold
                        : Colors.white.withOpacity(0.08),
                    width: selected ? 1.5 : 1,
                  ),
                ),
                tileColor: selected
                    ? AppColors2026.gold.withOpacity(0.14)
                    : AppColors2026.surfaceInput,
                leading: Icon(
                  style.id.contains('satellite') || style.id.contains('hybrid')
                      ? LucideIcons.globe
                      : style.id.contains('traffic')
                          ? LucideIcons.activity
                          : LucideIcons.map,
                  color: selected ? AppColors2026.goldLight : Colors.white70,
                ),
                title: Text(
                  style.label,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: selected ? AppColors2026.goldLight : Colors.white,
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
                      : AppColors2026.gold,
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
