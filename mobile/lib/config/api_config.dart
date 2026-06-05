import 'dart:io';

/// Base URL backend — đổi theo môi trường chạy app.
class ApiConfig {
  ApiConfig._();

  /// Android emulator: 10.0.2.2 → localhost máy host.
  /// iOS simulator / desktop: localhost.
  /// Điện thoại thật: thay bằng IP LAN máy chạy backend (vd. 192.168.1.10).
  static String get baseUrl {
    const override = String.fromEnvironment('API_BASE_URL');
    if (override.isNotEmpty) return override;

    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  static Uri uri(String path) => Uri.parse('$baseUrl$path');
}
