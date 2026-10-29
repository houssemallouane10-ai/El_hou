import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_strings.dart';
import '../../../../core/utils/validators.dart';
import '../bloc/credentials_cubit.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/brand_header.dart';
import '../widgets/credentials_listener.dart';
import '../widgets/password_field.dart';
import '../widgets/submit_button.dart';

class SignInPage extends StatefulWidget {
  const SignInPage({super.key, required this.onSignUp});

  final VoidCallback onSignUp;

  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<CredentialsCubit>().signIn(_email.text, _password.text);
  }

  void _resetPassword() {
    final error = Validators.email(_email.text);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error لإرسال رابط إعادة التعيين')),
      );
      return;
    }
    context.read<CredentialsCubit>().sendPasswordReset(_email.text);
  }

  @override
  Widget build(BuildContext context) {
    final loading = context.select(
      (CredentialsCubit c) => c.state.isSubmitting,
    );
    return CredentialsListener(
      child: AuthScaffold(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const BrandHeader(
                title: 'مرحباً بعودتك',
                subtitle: AppStrings.tagline,
              ),
              const SizedBox(height: 28),
              TextFormField(
                controller: _email,
                validator: Validators.email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                textDirection: TextDirection.ltr,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(
                  labelText: AppStrings.email,
                  prefixIcon: Icon(Icons.alternate_email),
                ),
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _password,
                label: AppStrings.password,
                validator: (v) =>
                    (v ?? '').isEmpty ? 'أدخل ${AppStrings.password}' : null,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _submit(),
                autofillHints: const [AutofillHints.password],
              ),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton(
                  onPressed: loading ? null : _resetPassword,
                  child: const Text(AppStrings.forgotPassword),
                ),
              ),
              const SizedBox(height: 8),
              SubmitButton(
                label: AppStrings.signIn,
                loading: loading,
                onPressed: _submit,
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(AppStrings.noAccount),
                  TextButton(
                    onPressed: loading ? null : widget.onSignUp,
                    child: const Text(AppStrings.signUp),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
