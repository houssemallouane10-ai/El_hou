/// An auth error with a message ready to show the student.
class AuthFailure implements Exception {
  const AuthFailure(this.message);

  final String message;

  /// Maps Firebase Auth error codes to Arabic messages.
  factory AuthFailure.fromCode(String code) {
    return AuthFailure(switch (code) {
      'invalid-email' => 'البريد الإلكتروني غير صحيح',
      'user-disabled' => 'هذا الحساب موقوف',
      'user-not-found' ||
      'wrong-password' ||
      'invalid-credential' => 'البريد الإلكتروني أو كلمة السر غير صحيحة',
      'email-already-in-use' => 'يوجد حساب مسجّل بهذا البريد',
      'weak-password' => 'كلمة السر ضعيفة، اختر كلمة أطول',
      'too-many-requests' => 'محاولات كثيرة، أعد المحاولة بعد قليل',
      'network-request-failed' => 'تحقق من اتصالك بالإنترنت',
      _ => 'حدث خطأ غير متوقع، أعد المحاولة',
    });
  }

  @override
  String toString() => message;
}
