import 'package:equatable/equatable.dart';

/// The signed-in account, independent of the auth provider.
class AppUser extends Equatable {
  const AppUser({required this.uid, required this.email, this.displayName});

  final String uid;
  final String email;
  final String? displayName;

  @override
  List<Object?> get props => [uid, email, displayName];
}
