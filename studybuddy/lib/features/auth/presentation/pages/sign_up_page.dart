import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_links.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/utils/open_link.dart';
import '../../../../core/utils/validators.dart';
import '../bloc/credentials_cubit.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/brand_header.dart';
import '../widgets/credentials_listener.dart';
import '../widgets/password_field.dart';
import '../widgets/submit_button.dart';

class SignUpPage extends StatefulWidget {
  const SignUpPage({super.key, required this.onSignIn});

  final VoidCallback onSignIn;

  @override
  State<SignUpPage> createState() => _SignUpPageState();
}

class _SignUpPageState extends State<SignUpPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<CredentialsCubit>().signUp(
      _name.text,
      _email.text,
      _password.text,
    );
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
                title: 'أنشئ حسابك',
                subtitle: 'خطة مراجعة على مقاسك، من الـ BEM إلى الجامعة',
              ),
              const SizedBox(height: 28),
              TextFormField(
                controller: _name,
                validator: Validators.fullName,
                textInputAction: TextInputAction.next,
                textCapitalization: TextCapitalization.words,
                autofillHints: const [AutofillHints.name],
                decoration: const InputDecoration(
                  labelText: AppStrings.fullName,
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 14),
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
                validator: Validators.password,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.newPassword],
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _confirm,
                label: AppStrings.confirmPassword,
                validator: (v) =>
                    v != _password.text ? 'كلمتا السر غير متطابقتين' : null,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _submit(),
              ),
              const SizedBox(height: 22),
              SubmitButton(
                label: AppStrings.signUp,
                loading: loading,
                onPressed: _submit,
              ),
              const SizedBox(height: 8),
              const _Consent(),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(AppStrings.haveAccount),
                  TextButton(
                    onPressed: loading ? null : widget.onSignIn,
                    child: const Text(AppStrings.signIn),
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

/// Creating an account accepts the terms, which also cover the videos and
/// reports students share.
class _Consent extends StatelessWidget {
  const _Consent();

  @override
  Widget build(BuildContext context) {
    final small = Theme.of(context).textTheme.bodySmall;
    final link = TextButton.styleFrom(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      minimumSize: const Size(0, 32),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      textStyle: small?.copyWith(fontWeight: FontWeight.w700),
    );
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text('بإنشاء حساب، أنت توافق على', style: small),
        TextButton(
          style: link,
          onPressed: () => openExternal(context, AppLinks.terms),
          child: const Text('شروط الاستخدام'),
        ),
        Text('و', style: small),
        TextButton(
          style: link,
          onPressed: () => openExternal(context, AppLinks.privacy),
          child: const Text('سياسة الخصوصية'),
        ),
      ],
    );
  }
}
