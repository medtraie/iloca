import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// 2026 SFTM Luxury Obsidian & Gold Design System
/// Matches the Gemini Canvas "Luxury Fleet & Ops Live" Theme 100%
class AppColors2026 {
  // Deep Obsidian Surfaces
  static const Color abyss = Color(0xFF030406);
  static const Color obsidian = Color(0xFF06070A);
  static const Color obsidianSurface = Color(0xFF0D0F15); // card
  static const Color obsidianElevated = Color(0xFF131620); // cardAlt
  static const Color surfaceSub = Color(0xFF141722);
  static const Color surfaceInput = Color(0xFF161922);
  static const Color surfaceNav = Color(0xF2080A0F);
  static const Color surfaceHeader = Color(0xE607080C);
  static const Color modalSheet = Color(0xFF12141B);
  static const Color slate900 = Color(0xFF0D0F15);
  static const Color slate800 = Color(0xFF161922);
  static const Color surfaceGlass = Color(0xEE0D0F15);

  // Luxury Gold Accents
  static const Color gold = Color(0xFFD4AF37);
  static const Color goldLight = Color(0xFFF7DF8B);
  static const Color goldBright = Color(0xFFF9E396);
  static const Color goldDark = Color(0xFF8E6D19);
  static const Color goldDarkDeep = Color(0xFF9E781C);

  // Semantic Accents (Mapped so all existing screens adopt the Obsidian & Gold theme)
  static const Color cyanNeon = gold;
  static const Color cyanBright = goldLight;
  static const Color emeraldNeon = Color(0xFF10B981); // emeraldLive
  static const Color emeraldBright = Color(0xFF34D399);
  static const Color violetElectric = gold;
  static const Color indigoGlow = goldDark;
  static const Color amberSolar = Color(0xFFF59E0B);
  static const Color roseLaser = Color(0xFFEF4444); // crimsonAlert
  static const Color blueRoyal = Color(0xFF38BDF8); // skyInfo

  // Text Hierarchy
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  // Traceur Customizer Palette
  static const List<TracerColorPreset> tracerColors = [
    TracerColorPreset(id: 'gold', label: 'Or Impérial', color: gold),
    TracerColorPreset(id: 'emerald', label: 'Émeraude Live', color: emeraldNeon),
    TracerColorPreset(id: 'sky', label: 'Bleu Satellite', color: blueRoyal),
    TracerColorPreset(id: 'amber', label: 'Ambre Solaire', color: amberSolar),
    TracerColorPreset(id: 'crimson', label: 'Rouge Alerte', color: roseLaser),
    TracerColorPreset(id: 'goldLight', label: 'Champagne', color: goldLight),
    TracerColorPreset(id: 'white', label: 'Blanc Pur', color: Colors.white),
  ];

  // Luxury Gradients
  static const LinearGradient goldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFF9E396),
      Color(0xFFD4AF37),
      Color(0xFF9E781C),
    ],
    stops: [0.0, 0.5, 1.0],
  );

  static const LinearGradient luxuryCardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xF0161923),
      Color(0xFA0B0D13),
    ],
  );

  static const LinearGradient luxurySubtleGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xE612151E),
      Color(0xF50C0E14),
    ],
  );

  static const LinearGradient spatialHeroGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFF0D0B07),
      Color(0xFF06070A),
      Color(0xFF030406),
    ],
  );

  static const LinearGradient cyanEmeraldGradient = goldGradient;

  static const LinearGradient violetCyanGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [goldLight, goldDarkDeep],
  );
}

class TracerColorPreset {
  final String id;
  final String label;
  final Color color;

  const TracerColorPreset({
    required this.id,
    required this.label,
    required this.color,
  });
}

class AppTheme2026 {
  static TextStyle luxurySerif({
    double fontSize = 22,
    FontWeight fontWeight = FontWeight.w700,
    FontStyle fontStyle = FontStyle.normal,
    Color color = AppColors2026.textPrimary,
    double letterSpacing = -0.3,
    double height = 1.15,
  }) {
    try {
      return GoogleFonts.playfairDisplay(
        fontSize: fontSize,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );
    } catch (_) {
      return TextStyle(
        fontFamily: 'Georgia',
        fontSize: fontSize,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );
    }
  }

  static ThemeData get darkSpatialTheme {
    TextTheme baseTextTheme;
    try {
      baseTextTheme = GoogleFonts.plusJakartaSansTextTheme(
        ThemeData.dark().textTheme,
      );
    } catch (_) {
      baseTextTheme = ThemeData.dark().textTheme;
    }

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors2026.obsidian,
      primaryColor: AppColors2026.gold,
      colorScheme: const ColorScheme.dark(
        primary: AppColors2026.gold,
        secondary: AppColors2026.emeraldNeon,
        tertiary: AppColors2026.goldLight,
        surface: AppColors2026.obsidianSurface,
        error: AppColors2026.roseLaser,
        onPrimary: AppColors2026.obsidian,
        onSecondary: AppColors2026.obsidian,
        onSurface: AppColors2026.textPrimary,
      ),
      textTheme: baseTextTheme.apply(
        bodyColor: AppColors2026.textPrimary,
        displayColor: AppColors2026.textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: AppColors2026.obsidianSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: AppColors2026.gold.withOpacity(0.18)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors2026.surfaceInput,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppColors2026.textMuted, fontSize: 13),
        labelStyle: const TextStyle(color: AppColors2026.textSecondary, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.10)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.10)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors2026.gold.withOpacity(0.65), width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors2026.gold,
          foregroundColor: AppColors2026.obsidian,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 13,
            letterSpacing: 0.2,
          ),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors2026.modalSheet,
        modalBackgroundColor: AppColors2026.modalSheet,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors2026.modalSheet,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: AppColors2026.gold.withOpacity(0.25)),
        ),
      ),
    );
  }

  // Alias lightPearlTheme to dark luxury obsidian-gold theme as requested
  // ("تغير تصميم تطبيق بشكل جدري نفس تصميم نفس أزرار وأيقونات وخط ونفس ألوان")
  static ThemeData get lightPearlTheme => darkSpatialTheme;
}
