import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/auth_failure.dart';
import '../../domain/auth_repository.dart';

enum CredentialsStatus { idle, submitting, failure, resetSent }

class CredentialsState extends Equatable {
  const CredentialsState({this.status = CredentialsStatus.idle, this.message});

  final CredentialsStatus status;
  final String? message;

  bool get isSubmitting => status == CredentialsStatus.submitting;

  @override
  List<Object?> get props => [status, message];
}

/// Submits the sign-in and sign-up forms. Success shows up as a new user on
/// [AuthRepository.userChanges], which the AuthBloc routes from.
class CredentialsCubit extends Cubit<CredentialsState> {
  CredentialsCubit(this._auth) : super(const CredentialsState());

  final AuthRepository _auth;

  Future<void> signIn(String email, String password) =>
      _run(() => _auth.signIn(email: email, password: password));

  Future<void> signUp(String fullName, String email, String password) => _run(
    () => _auth.signUp(fullName: fullName, email: email, password: password),
  );

  Future<void> sendPasswordReset(String email) => _run(
    () => _auth.sendPasswordReset(email),
    onSuccess: CredentialsStatus.resetSent,
  );

  Future<void> _run(
    Future<void> Function() action, {
    CredentialsStatus onSuccess = CredentialsStatus.idle,
  }) async {
    if (state.isSubmitting) return;
    emit(const CredentialsState(status: CredentialsStatus.submitting));
    try {
      await action();
      if (!isClosed) emit(CredentialsState(status: onSuccess));
    } on AuthFailure catch (e) {
      if (!isClosed) {
        emit(
          CredentialsState(
            status: CredentialsStatus.failure,
            message: e.message,
          ),
        );
      }
    }
  }
}
