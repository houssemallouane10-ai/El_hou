import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/app_user.dart';
import '../../domain/auth_repository.dart';
import '../../domain/student_profile.dart';

enum AuthStatus {
  unknown,
  unauthenticated,
  needsOnboarding,
  authenticated,
  profileError,
}

class AuthState extends Equatable {
  const AuthState._(this.status, {this.user, this.profile});

  const AuthState.unknown() : this._(AuthStatus.unknown);
  const AuthState.unauthenticated() : this._(AuthStatus.unauthenticated);
  const AuthState.needsOnboarding(AppUser user)
    : this._(AuthStatus.needsOnboarding, user: user);
  const AuthState.authenticated(AppUser user, StudentProfile profile)
    : this._(AuthStatus.authenticated, user: user, profile: profile);
  const AuthState.profileError(AppUser user)
    : this._(AuthStatus.profileError, user: user);

  final AuthStatus status;
  final AppUser? user;
  final StudentProfile? profile;

  @override
  List<Object?> get props => [status, user, profile];
}

sealed class AuthEvent {
  const AuthEvent();
}

final class _UserChanged extends AuthEvent {
  const _UserChanged(this.user);
  final AppUser? user;
}

final class AuthProfileCompleted extends AuthEvent {
  const AuthProfileCompleted(this.profile);
  final StudentProfile profile;
}

final class AuthProfileRetryRequested extends AuthEvent {
  const AuthProfileRetryRequested();
}

final class AuthSignOutRequested extends AuthEvent {
  const AuthSignOutRequested();
}

/// Owns the session: who is signed in and whether their profile is complete.
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({
    required AuthRepository authRepository,
    required ProfileRepository profileRepository,
  }) : _auth = authRepository,
       _profiles = profileRepository,
       super(const AuthState.unknown()) {
    on<_UserChanged>((event, emit) => _resolve(event.user, emit));
    on<AuthProfileRetryRequested>(
      (event, emit) => _resolve(_auth.currentUser, emit),
    );
    on<AuthProfileCompleted>((event, emit) {
      final user = state.user;
      if (user != null && user.uid == event.profile.uid) {
        emit(AuthState.authenticated(user, event.profile));
      }
    });
    on<AuthSignOutRequested>((event, emit) => _auth.signOut());

    _subscription = _auth.userChanges.listen((u) => add(_UserChanged(u)));
  }

  final AuthRepository _auth;
  final ProfileRepository _profiles;
  late final StreamSubscription<AppUser?> _subscription;

  Future<void> _resolve(AppUser? user, Emitter<AuthState> emit) async {
    if (user == null) {
      emit(const AuthState.unauthenticated());
      return;
    }
    emit(const AuthState.unknown());
    try {
      final profile = await _profiles.fetch(user.uid);
      // A sign-out may have happened while the profile was loading.
      if (_auth.currentUser?.uid != user.uid) return;
      emit(
        profile == null
            ? AuthState.needsOnboarding(user)
            : AuthState.authenticated(user, profile),
      );
    } catch (_) {
      emit(AuthState.profileError(user));
    }
  }

  @override
  Future<void> close() {
    _subscription.cancel();
    return super.close();
  }
}
