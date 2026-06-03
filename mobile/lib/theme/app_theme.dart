import 'package:flutter/material.dart';

class AppColors {
  static const greenDeep = Color(0xFF052E16);
  static const green = Color(0xFF14532D);
  static const gold = Color(0xFFC9A227);

  /// Jockey (khớp frontend JockeyHomePage.css)
  static const jockeyDeep = Color(0xFF3B0F1A);
  static const jockeyPrimary = Color(0xFF7F1D1D);
  static const jockeyAccent = Color(0xFFD4A574);
  static const jockeyMuted = Color(0xFFF5F0EB);

  /// Horse owner (khớp frontend HorseOwnerHomePage.css)
  static const ownerDeep = Color(0xFF0C2340);
  static const ownerPrimary = Color(0xFF1E3A5F);
  static const ownerTeal = Color(0xFF0F766E);
  static const ownerGold = Color(0xFFC9A227);
  static const ownerMuted = Color(0xFFEEF2F7);

  /// Admin dashboard
  static const adminDeep = Color(0xFF0F172A);
  static const adminPrimary = Color(0xFF1E293B);
  static const adminAccent = Color(0xFF6366F1);
  static const adminBg = Color(0xFFF1F5F9);

  static const panel = Color(0xFFFFFFFF);
  static const textMuted = Color(0xFF64748B);
  static const heading = Color(0xFF0F172A);
  static const border = Color(0xFFE2E8F0);
  static const errorBg = Color(0xFFFEF2F2);
  static const errorBorder = Color(0xFFFECACA);
  static const errorText = Color(0xFF991B1B);
}

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.green,
      primary: AppColors.green,
      secondary: AppColors.gold,
    ),
    scaffoldBackgroundColor: const Color(0xFFF4F7F5),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.green, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
