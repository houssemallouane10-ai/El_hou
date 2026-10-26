import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../auth/domain/auth_failure.dart';
import '../../auth/domain/auth_repository.dart';
import '../../grader/domain/grader_repositories.dart';
import '../../syllabus/domain/repositories.dart';

class AccountDeletionState extends Equatable {
  const AccountDeletionState({this.working = false, this.error});

  final bool working;
  final String? error;

  @override
  List<Object?> get props => [working, error];
}

/// Deletes the student's account and everything stored under it: gradings,
/// lesson progress, profile, then the sign-in account itself. Videos they
/// suggested stay, with no name attached.
class AccountDeletionCubit extends Cubit<AccountDeletionState> {
  AccountDeletionCubit({
    required this.uid,
    required this._auth,
    required this._profiles,
    required this._progress,
    required this._gradings,
  }) : super(const AccountDeletionState());

  final String uid;
  final AuthRepository _auth;
  final ProfileRepository _profiles;
  final ProgressRepository _progress;
  final GradingHistoryRepository _gradings;

  /// Returns true once the account is gone.
  Future<bool> delete(String password) async {
    if (state.working) return false;
    emit(const AccountDeletionState(working: true));
    try {
      // Checked first, so a wrong password deletes nothing.
      await _auth.reauthenticate(password);
      await _gradings.deleteAll(uid);
      await _progress.deleteAll(uid);
      await _profiles.delete(uid);
      await _auth.deleteAccount();
      return true;
    } on AuthFailure catch (e) {
      _fail(e.message);
    } catch (_) {
      _fail('تعذّر حذف الحساب، تحقق من اتصالك وأعد المحاولة');
    }
    return false;
  }

  void _fail(String message) {
    if (!isClosed) emit(AccountDeletionState(error: message));
  }
}
