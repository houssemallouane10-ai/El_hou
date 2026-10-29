import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/algeria_data.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/utils/validators.dart';
import '../../domain/app_user.dart';
import '../../domain/auth_repository.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/onboarding_cubit.dart';
import '../widgets/choice_tile.dart';
import '../widgets/submit_button.dart';

class OnboardingPage extends StatelessWidget {
  const OnboardingPage({super.key, required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) =>
          OnboardingCubit(context.read<ProfileRepository>(), user: user),
      child: const _OnboardingView(),
    );
  }
}

class _OnboardingView extends StatelessWidget {
  const _OnboardingView();

  Future<void> _next(BuildContext context) async {
    final profile = await context.read<OnboardingCubit>().next();
    if (profile != null && context.mounted) {
      context.read<AuthBloc>().add(AuthProfileCompleted(profile));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<OnboardingCubit, OnboardingState>(
      listenWhen: (a, b) => b.error != null && a.error != b.error,
      listener: (context, state) =>
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.error!))),
      builder: (context, state) {
        final index = state.steps.indexOf(state.step);
        final cubit = context.read<OnboardingCubit>();
        return PopScope(
          canPop: index == 0,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) cubit.back();
          },
          child: Scaffold(
            appBar: AppBar(
              leading: index > 0
                  ? IconButton(
                      tooltip: AppStrings.back,
                      icon: const Icon(Icons.arrow_back),
                      onPressed: state.isSaving ? null : cubit.back,
                    )
                  : IconButton(
                      tooltip: AppStrings.signOut,
                      icon: const Icon(Icons.logout),
                      onPressed: () => context.read<AuthBloc>().add(
                        const AuthSignOutRequested(),
                      ),
                    ),
              title: Text('الخطوة ${index + 1} من ${state.steps.length}'),
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(4),
                child: TweenAnimationBuilder<double>(
                  tween: Tween(end: (index + 1) / state.steps.length),
                  duration: const Duration(milliseconds: 300),
                  builder: (context, value, _) => LinearProgressIndicator(
                    value: value,
                    backgroundColor: AppColors.emerald.withValues(alpha: 0.12),
                  ),
                ),
              ),
            ),
            body: SafeArea(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: Column(
                    children: [
                      Expanded(
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 250),
                          child: switch (state.step) {
                            OnboardingStep.identity => const _IdentityStep(
                              key: ValueKey('identity'),
                            ),
                            OnboardingStep.level => const _LevelStep(
                              key: ValueKey('level'),
                            ),
                            OnboardingStep.stream => const _StreamStep(
                              key: ValueKey('stream'),
                            ),
                          },
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                        child: SubmitButton(
                          label: state.isLastStep
                              ? AppStrings.finish
                              : AppStrings.next,
                          loading: state.isSaving,
                          onPressed: state.canContinue
                              ? () => _next(context)
                              : null,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _StepBody extends StatelessWidget {
  const _StepBody({required this.title, this.subtitle, required this.children});

  final String title;
  final String? subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      children: [
        Text(
          title,
          style: text.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            style: text.bodyMedium?.copyWith(color: Colors.grey.shade700),
          ),
        ],
        const SizedBox(height: 20),
        ...children,
      ],
    );
  }
}

class _IdentityStep extends StatefulWidget {
  const _IdentityStep({super.key});

  @override
  State<_IdentityStep> createState() => _IdentityStepState();
}

class _IdentityStepState extends State<_IdentityStep> {
  late final TextEditingController _name;
  late final TextEditingController _phone;

  @override
  void initState() {
    super.initState();
    final state = context.read<OnboardingCubit>().state;
    _name = TextEditingController(text: state.fullName);
    _phone = TextEditingController(text: state.phone);
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<OnboardingCubit>();
    final wilayaCode = context.select(
      (OnboardingCubit c) => c.state.wilayaCode,
    );
    return _StepBody(
      title: AppStrings.onboardingStep1,
      subtitle: 'نستعمل ولايتك لربطك بطلبة يراجعون معك في غرف التركيز',
      children: [
        TextFormField(
          controller: _name,
          onChanged: cubit.fullNameChanged,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          validator: Validators.fullName,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: AppStrings.fullName,
            prefixIcon: Icon(Icons.person_outline),
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _phone,
          onChanged: cubit.phoneChanged,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          validator: Validators.phone,
          keyboardType: TextInputType.phone,
          textDirection: TextDirection.ltr,
          autofillHints: const [AutofillHints.telephoneNumber],
          decoration: const InputDecoration(
            labelText: AppStrings.phone,
            hintText: AppStrings.phoneHint,
            prefixIcon: Icon(Icons.phone_iphone),
          ),
        ),
        const SizedBox(height: 14),
        LayoutBuilder(
          builder: (context, constraints) => DropdownMenu<int>(
            width: constraints.maxWidth,
            initialSelection: wilayaCode,
            enableFilter: true,
            requestFocusOnTap: true,
            menuHeight: 320,
            label: const Text(AppStrings.wilaya),
            leadingIcon: const Icon(Icons.location_on_outlined),
            onSelected: (code) {
              if (code != null) cubit.wilayaSelected(code);
            },
            dropdownMenuEntries: [
              for (final w in wilayas)
                DropdownMenuEntry(value: w.code, label: w.label),
            ],
          ),
        ),
      ],
    );
  }
}

class _LevelStep extends StatelessWidget {
  const _LevelStep({super.key});

  static const _icons = {
    EducationLevel.bem: Icons.menu_book_rounded,
    EducationLevel.bac: Icons.workspace_premium_rounded,
    EducationLevel.university: Icons.account_balance_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final selected = context.select((OnboardingCubit c) => c.state.level);
    return _StepBody(
      title: AppStrings.onboardingStep2,
      subtitle: 'نرتّب لك المنهاج الرسمي والحوليات حسب مستواك',
      children: [
        for (final level in EducationLevel.values)
          ChoiceTile(
            title: level.label,
            subtitle: level.subtitle,
            icon: _icons[level],
            selected: level == selected,
            onTap: () => context.read<OnboardingCubit>().levelSelected(level),
          ),
      ],
    );
  }
}

class _StreamStep extends StatelessWidget {
  const _StreamStep({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<OnboardingCubit>().state;
    final level = state.level!;
    return _StepBody(
      title: level == EducationLevel.university
          ? 'اختر ميدانك'
          : AppStrings.onboardingStep3,
      subtitle: level == EducationLevel.university
          ? AppStrings.speciality
          : 'نعرض لك المواد ومعاملاتها حسب شعبتك',
      children: [
        for (final stream in level.streams)
          ChoiceTile(
            title: stream.name,
            selected: stream.id == state.streamId,
            onTap: () =>
                context.read<OnboardingCubit>().streamSelected(stream.id),
          ),
      ],
    );
  }
}
