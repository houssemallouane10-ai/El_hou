import 'package:dz_studybuddy/core/utils/validators.dart';
import 'package:dz_studybuddy/features/auth/domain/auth_failure.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a project without email sign-up enabled says so', () {
    for (final code in ['configuration-not-found', 'operation-not-allowed']) {
      expect(AuthFailure.fromCode(code).message, contains('Email/Password'));
    }
  });

  group('normalizePhone', () {
    test('accepts Algerian mobile numbers in every common form', () {
      for (final raw in [
        '0550123456',
        '05 50 12 34 56',
        '055-012-3456',
        '+213550123456',
        '+213 550 12 34 56',
        '00213550123456',
        '213550123456',
      ]) {
        expect(Validators.normalizePhone(raw), '+213550123456', reason: raw);
      }
      expect(Validators.normalizePhone('0612345678'), '+213612345678');
      expect(Validators.normalizePhone('0712345678'), '+213712345678');
    });

    test('rejects landlines, short numbers and foreign numbers', () {
      for (final raw in [
        '021123456',
        '0412345678',
        '055012345',
        '05501234567',
        '+33612345678',
        'abc',
      ]) {
        expect(Validators.normalizePhone(raw), isNull, reason: raw);
      }
    });
  });

  test('email', () {
    expect(Validators.email('talib@example.dz'), isNull);
    expect(Validators.email('talib@'), isNotNull);
    expect(Validators.email(''), isNotNull);
  });

  test('password needs 8 characters', () {
    expect(Validators.password('1234567'), isNotNull);
    expect(Validators.password('12345678'), isNull);
  });
}
