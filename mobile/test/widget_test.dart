import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('App launches login screen', (tester) async {
    await tester.pumpWidget(const HorseRacingApp());
    expect(find.text('Đăng nhập'), findsOneWidget);
  });
}
