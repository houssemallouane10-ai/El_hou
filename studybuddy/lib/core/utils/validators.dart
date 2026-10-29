import '../constants/app_strings.dart';

/// Form validators returning an Arabic error message, or null when valid.
abstract final class Validators {
  static final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
  static final _mobile = RegExp(r'^0[567]\d{8}$');

  static String? fullName(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'أدخل ${AppStrings.fullName}';
    if (v.length < 3) return 'الاسم قصير جداً';
    return null;
  }

  static String? email(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'أدخل ${AppStrings.email}';
    if (!_email.hasMatch(v)) return 'البريد الإلكتروني غير صحيح';
    return null;
  }

  static String? password(String? value) {
    final v = value ?? '';
    if (v.isEmpty) return 'أدخل ${AppStrings.password}';
    if (v.length < 8) return 'كلمة السر يجب أن تحتوي 8 أحرف على الأقل';
    return null;
  }

  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'أدخل ${AppStrings.phone}';
    }
    if (normalizePhone(value) == null) {
      return 'رقم هاتف جزائري غير صحيح (يبدأ بـ 05 أو 06 أو 07)';
    }
    return null;
  }

  /// Returns the number in international form (+213XXXXXXXXX), accepting
  /// 0XXXXXXXXX, 213XXXXXXXXX, +213XXXXXXXXX and 00213XXXXXXXXX with any
  /// spaces, dots or dashes. Returns null for anything that is not an
  /// Algerian mobile number.
  static String? normalizePhone(String raw) {
    var digits = raw.replaceAll(RegExp(r'[\s.\-()]'), '');
    if (digits.startsWith('+213')) {
      digits = '0${digits.substring(4)}';
    } else if (digits.startsWith('00213')) {
      digits = '0${digits.substring(5)}';
    } else if (digits.startsWith('213') && digits.length == 12) {
      digits = '0${digits.substring(3)}';
    }
    if (!_mobile.hasMatch(digits)) return null;
    return '+213${digits.substring(1)}';
  }
}
