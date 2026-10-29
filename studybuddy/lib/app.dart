import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/constants/app_colors.dart';
import 'core/constants/app_strings.dart';
import 'core/constants/app_theme.dart';
import 'core/audio/playback_cubit.dart';
import 'core/di/app_dependencies.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/auth/presentation/pages/onboarding_page.dart';
import 'features/auth/presentation/pages/welcome_flow.dart';
import 'features/home/home_shell.dart';

class StudyBuddyApp extends StatelessWidget {
  const StudyBuddyApp({
    super.key,
    required this.deps,
    this.useGoogleFonts = true,
  });

  final AppDependencies deps;
  final bool useGoogleFonts;

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: deps),
        RepositoryProvider.value(value: deps.auth),
        RepositoryProvider.value(value: deps.profiles),
        RepositoryProvider.value(value: deps.lessonContent),
        RepositoryProvider.value(value: deps.summaries),
        RepositoryProvider.value(value: deps.grader),
        RepositoryProvider.value(value: deps.gradingHistory),
        RepositoryProvider.value(value: deps.presence),
        RepositoryProvider.value(value: deps.audioLibrary),
        RepositoryProvider.value(value: deps.reports),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (_) => AuthBloc(
              authRepository: deps.auth,
              profileRepository: deps.profiles,
            ),
          ),
          BlocProvider(create: (_) => PlaybackCubit(deps.playback)),
        ],
        child: MaterialApp(
          title: AppStrings.appName,
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(useGoogleFonts: useGoogleFonts),
          locale: const Locale('ar', 'DZ'),
          supportedLocales: const [Locale('ar', 'DZ'), Locale('fr', 'DZ')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          builder: (context, child) =>
              deps.demoMode ? _DemoNotice(child: child!) : child!,
          home: const AuthGate(),
        ),
      ),
    );
  }
}

/// Picks the root screen from the session state.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) => switch (state.status) {
        AuthStatus.unknown => const _Splash(),
        AuthStatus.unauthenticated => const WelcomeFlow(),
        AuthStatus.needsOnboarding => OnboardingPage(
          key: ValueKey(state.user!.uid),
          user: state.user!,
        ),
        AuthStatus.authenticated => HomeShell(
          key: ValueKey(state.profile!.uid),
          profile: state.profile!,
        ),
        AuthStatus.profileError => const _ProfileError(),
      },
    );
  }
}

/// A thin strip under every screen telling testers nothing is saved online.
class _DemoNotice extends StatelessWidget {
  const _DemoNotice({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(child: child),
        Material(
          color: AppColors.gold,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: SizedBox(
                width: double.infinity,
                child: Text(
                  AppStrings.demoMode,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class _ProfileError extends StatelessWidget {
  const _ProfileError();

  @override
  Widget build(BuildContext context) {
    final bloc = context.read<AuthBloc>();
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 56, color: Colors.grey),
              const SizedBox(height: 12),
              const Text(
                'تعذّر تحميل ملفك. تحقق من اتصالك بالإنترنت.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => bloc.add(const AuthProfileRetryRequested()),
                child: const Text('إعادة المحاولة'),
              ),
              TextButton(
                onPressed: () => bloc.add(const AuthSignOutRequested()),
                child: const Text(AppStrings.signOut),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
