import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// Màu / ảnh theo từng vai trò cho màn giải đấu công khai.
class TournamentViewTheme {
  const TournamentViewTheme({
    required this.appBarColor,
    required this.accentColor,
    required this.backgroundColor,
    required this.primaryButtonColor,
    required this.badgeColor,
    required this.badgeTextColor,
    required this.headerImageAsset,
    required this.cardImageAsset,
    required this.headerGradientTop,
    required this.headerGradientBottom,
  });

  final Color appBarColor;
  final Color accentColor;
  final Color backgroundColor;
  final Color primaryButtonColor;
  final Color badgeColor;
  final Color badgeTextColor;
  final String headerImageAsset;
  final String cardImageAsset;
  final Color headerGradientTop;
  final Color headerGradientBottom;

  static const horseOwner = TournamentViewTheme(
    appBarColor: AppColors.ownerDeep,
    accentColor: AppColors.ownerTeal,
    backgroundColor: AppColors.ownerMuted,
    primaryButtonColor: AppColors.ownerPrimary,
    badgeColor: AppColors.ownerGold,
    badgeTextColor: AppColors.ownerDeep,
    headerImageAsset: 'assets/images/anh-dua-ngua-7.jpg',
    cardImageAsset: 'assets/images/horse-racing-hero.jpg',
    headerGradientTop: Color(0x660C2340),
    headerGradientBottom: Color(0xD90C2340),
  );

  static const jockey = TournamentViewTheme(
    appBarColor: AppColors.jockeyDeep,
    accentColor: AppColors.jockeyPrimary,
    backgroundColor: AppColors.jockeyMuted,
    primaryButtonColor: AppColors.jockeyPrimary,
    badgeColor: AppColors.jockeyAccent,
    badgeTextColor: AppColors.jockeyDeep,
    headerImageAsset: 'assets/images/jockey-hero.jpg',
    cardImageAsset: 'assets/images/jockey-hero.jpg',
    headerGradientTop: Color(0x663B0F1A),
    headerGradientBottom: Color(0xD93B0F1A),
  );

  static const spectator = TournamentViewTheme(
    appBarColor: AppColors.greenDeep,
    accentColor: AppColors.green,
    backgroundColor: Color(0xFFF4F7F5),
    primaryButtonColor: AppColors.green,
    badgeColor: AppColors.gold,
    badgeTextColor: AppColors.greenDeep,
    headerImageAsset: 'assets/images/spectator-hero.jpg',
    cardImageAsset: 'assets/images/spectator-hero.jpg',
    headerGradientTop: Color(0x66052E16),
    headerGradientBottom: Color(0xD9052E16),
  );
}
