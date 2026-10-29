import 'package:dz_studybuddy/core/constants/algeria_data.dart';
import 'package:dz_studybuddy/features/auth/data/in_memory_repositories.dart';
import 'package:dz_studybuddy/features/auth/domain/app_user.dart';
import 'package:dz_studybuddy/features/auth/presentation/bloc/onboarding_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const user = AppUser(uid: 'u1', email: 'a@b.dz', displayName: 'يوسف قاسمي');
  late InMemoryProfileRepository profiles;
  late OnboardingCubit cubit;

  setUp(() {
    profiles = InMemoryProfileRepository();
    cubit = OnboardingCubit(profiles, user: user);
  });

  tearDown(() => cubit.close());

  void fillIdentity() {
    cubit
      ..phoneChanged('0661 23 45 67')
      ..wilayaSelected(16);
  }

  test('prefills the name and blocks the first step until it is valid', () {
    expect(cubit.state.fullName, 'يوسف قاسمي');
    expect(cubit.state.canContinue, isFalse);
    fillIdentity();
    expect(cubit.state.canContinue, isTrue);
  });

  test('a BAC student picks a stream and the profile is saved', () async {
    fillIdentity();
    await cubit.next();
    cubit.levelSelected(EducationLevel.bac);
    await cubit.next();
    expect(cubit.state.step, OnboardingStep.stream);
    expect(cubit.state.canContinue, isFalse);
    cubit.streamSelected('sciences');

    final profile = await cubit.next();
    expect(profile?.phone, '+213661234567');
    expect(profile?.streamId, 'sciences');
    expect(await profiles.fetch('u1'), profile);
  });

  test('a BEM student finishes after the level step', () async {
    fillIdentity();
    await cubit.next();
    cubit.levelSelected(EducationLevel.bem);
    expect(cubit.state.isLastStep, isTrue);
    final profile = await cubit.next();
    expect(profile?.level, EducationLevel.bem);
    expect(profile?.streamId, isNull);
  });

  test('changing level clears a stream from the old level', () async {
    fillIdentity();
    await cubit.next();
    cubit.levelSelected(EducationLevel.bac);
    await cubit.next();
    cubit.streamSelected('math');
    cubit.back();
    cubit.levelSelected(EducationLevel.university);
    expect(cubit.state.streamId, isNull);
  });
}
