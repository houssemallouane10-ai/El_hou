import 'dart:async';

import '../domain/app_user.dart';
import '../domain/auth_failure.dart';
import '../domain/auth_repository.dart';
import '../domain/student_profile.dart';

/// Device-only stand-ins used when Firebase is not configured (demo mode)
/// and in tests. Accounts last until the app is closed.
class InMemoryAuthRepository implements AuthRepository {
  final _accounts = <String, ({String password, AppUser user})>{};
  final _controller = StreamController<AppUser?>.broadcast();
  AppUser? _current;

  @override
  AppUser? get currentUser => _current;

  @override
  Stream<AppUser?> get userChanges async* {
    yield _current;
    yield* _controller.stream;
  }

  @override
  Future<void> signIn({required String email, required String password}) async {
    final account = _accounts[email.trim().toLowerCase()];
    if (account == null || account.password != password) {
      throw AuthFailure.fromCode('invalid-credential');
    }
    _emit(account.user);
  }

  @override
  Future<void> signUp({
    required String fullName,
    required String email,
    required String password,
  }) async {
    final key = email.trim().toLowerCase();
    if (_accounts.containsKey(key)) {
      throw AuthFailure.fromCode('email-already-in-use');
    }
    final user = AppUser(
      uid: 'local-${_accounts.length + 1}',
      email: email.trim(),
      displayName: fullName.trim(),
    );
    _accounts[key] = (password: password, user: user);
    _emit(user);
  }

  @override
  Future<void> sendPasswordReset(String email) async {}

  @override
  Future<void> signOut() async => _emit(null);

  void _emit(AppUser? user) {
    _current = user;
    _controller.add(user);
  }
}

class InMemoryProfileRepository implements ProfileRepository {
  final _profiles = <String, StudentProfile>{};

  @override
  Future<StudentProfile?> fetch(String uid) async => _profiles[uid];

  @override
  Future<void> save(StudentProfile profile) async =>
      _profiles[profile.uid] = profile;
}
