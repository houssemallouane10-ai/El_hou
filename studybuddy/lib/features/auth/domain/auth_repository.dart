import 'app_user.dart';
import 'student_profile.dart';

abstract interface class AuthRepository {
  /// Emits the current user on listen, then on every sign-in and sign-out.
  Stream<AppUser?> get userChanges;

  AppUser? get currentUser;

  /// Throws [AuthFailure].
  Future<void> signIn({required String email, required String password});

  /// Throws [AuthFailure].
  Future<void> signUp({
    required String fullName,
    required String email,
    required String password,
  });

  /// Throws [AuthFailure].
  Future<void> sendPasswordReset(String email);

  Future<void> signOut();
}

abstract interface class ProfileRepository {
  /// Returns null when the student has not finished onboarding.
  Future<StudentProfile?> fetch(String uid);

  Future<void> save(StudentProfile profile);
}
