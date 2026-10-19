import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// 2026 Spatial Cyber-Glass Design Tokens & Theme Engine
class AppColors2026 {
  // Deep Spatial Obsidian Backgrounds
  static const Color abyss = Color(0xFF050811);
  static const Color obsidian = Color(0xFF0A0F1E);
  static const Color slate900 = Color(0xFF0F172A);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color surfaceGlass = Color(0xCC111827);

  // 2026 Luminous Neon Accents
  static const Color cyanNeon = Color(0xFF06B6D4);
  static const Color cyanBright = Color(0xFF22D3EE);
  static const Color emeraldNeon = Color(0xFF10B981);
  static const Color emeraldBright = Color(0xFF34D399);
  static const Color violetElectric = Color(0xFF8B5CF6);
  static const Color indigoGlow = Color(0xFF6366F1);
  static const Color amberSolar = Color(0xFFF59E0B);
  static const Color roseLaser = Color(0xFFF43F5E);
  static const Color blueRoyal = Color(0xFF3B82F6);

  // Text Hierarchy
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  // Traceur Customizer Palette
  static const List<TracerColorPreset> tracerColors = [
    TracerColorPreset(id: 'cyan', label: 'Cyan Laser', color: cyanNeon),
    TracerColorPreset(id: 'emerald', label: 'Émeraude', color: emeraldNeon),
    TracerColorPreset(id: 'blue', label: 'Bleu Royal', color: blueRoyal),
    TracerColorPreset(id: 'violet', label: 'Violet Néon', color: violetElectric),
    TracerColorPreset(id: 'amber', label: 'Or Solaire', color: amberSolar),
    TracerColorPreset(id: 'rose', label: 'Rose Laser', color: roseLaser),
    TracerColorPreset(id: 'white', label: 'Blanc Pur', color: Colors.white),
  ];

  // Signature 2026 Gradients
  static const LinearGradient spatialHeroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF0D1528),
      Color(0xFF091020),
      Color(0xFF050811),
    ],
  );

  static const LinearGradient cyanEmeraldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [cyanNeon, emeraldNeon],
  );

  static const LinearGradient violetCyanGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [violetElectric, cyanNeon],
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
  static ThemeData get darkSpatialTheme {
    final baseTextTheme = GoogleFonts.plusJakartaSansTextTheme(
      ThemeData.dark().textTheme,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors2026.abyss,
      primaryColor: AppColors2026.cyanNeon,
      colorScheme: const ColorScheme.dark(
        primary: AppColors2026.cyanNeon,
        secondary: AppColors2026.emeraldNeon,
        tertiary: AppColors2026.violetElectric,
        surface: AppColors2026.obsidian,
        error: AppColors2026.roseLaser,
        onPrimary: Color(0xFF020617),
        onSecondary: Color(0xFF020617),
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
      cardTheme: CardTheme(
        color: AppColors2026.obsidian.withOpacity(0.82),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppColors2026.textMuted, fontSize: 13),
        labelStyle: const TextStyle(color: AppColors2026.textSecondary, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.12)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.12)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors2026.cyanNeon, width: 1.6),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors2026.cyanNeon,
          foregroundColor: AppColors2026.abyss,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 13,
            letterSpacing: 0.3,
          ),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Color(0xFF0B1120),
        modalBackgroundColor: Color(0xFF0B1120),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
      ),
    );
  }

  static ThemeData get lightPearlTheme {
    final baseTextTheme = GoogleFonts.plusJakartaSansTextTheme(
      ThemeData.light().textTheme,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF1F5F9),
      primaryColor: AppColors2026.cyanNeon,
      colorScheme: const ColorScheme.light(
        primary: Color(0xFF0891B2),
        secondary: Color(0xFF059669),
        tertiary: Color(0xFF7C3AED),
        surface: Colors.white,
        error: AppColors2026.roseLaser,
      ),
      textTheme: baseTextTheme,
    );
  }
}
