import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/auth_repository.dart';
import '../bloc/credentials_cubit.dart';
import 'sign_in_page.dart';
import 'sign_up_page.dart';

/// Signed-out area: toggles between sign-in and sign-up in place, so a
/// successful sign-in leaves no stale routes behind.
class WelcomeFlow extends StatefulWidget {
  const WelcomeFlow({super.key});

  @override
  State<WelcomeFlow> createState() => _WelcomeFlowState();
}

class _WelcomeFlowState extends State<WelcomeFlow> {
  bool _signUp = false;

  void _toggle() => setState(() => _signUp = !_signUp);

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => CredentialsCubit(context.read<AuthRepository>()),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        child: _signUp
            ? SignUpPage(key: const ValueKey('sign-up'), onSignIn: _toggle)
            : SignInPage(key: const ValueKey('sign-in'), onSignUp: _toggle),
      ),
    );
  }
}
