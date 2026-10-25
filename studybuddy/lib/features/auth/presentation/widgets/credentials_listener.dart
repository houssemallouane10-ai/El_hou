import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_strings.dart';
import '../bloc/credentials_cubit.dart';

/// Shows auth errors and the password-reset confirmation as snack bars.
class CredentialsListener extends StatelessWidget {
  const CredentialsListener({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return BlocListener<CredentialsCubit, CredentialsState>(
      listenWhen: (a, b) => a.status != b.status,
      listener: (context, state) {
        final message = switch (state.status) {
          CredentialsStatus.failure => state.message,
          CredentialsStatus.resetSent => AppStrings.resetSent,
          _ => null,
        };
        if (message == null) return;
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(message)));
      },
      child: child,
    );
  }
}
