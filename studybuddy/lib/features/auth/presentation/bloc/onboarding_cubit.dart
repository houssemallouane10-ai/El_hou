import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/algeria_data.dart';
import '../../../../core/utils/validators.dart';
import '../../domain/app_user.dart';
import '../../domain/auth_repository.dart';
import '../../domain/student_profile.dart';

enum OnboardingStep { identity, level, stream }

class OnboardingState extends Equatable {
  const OnboardingState({
    this.step = OnboardingStep.identity,
    this.fullName = '',
    this.phone = '',
    this.wilayaCode,
    this.level,
    this.streamId,
    this.isSaving = false,
    this.error,
  });

  final OnboardingStep step;
  final String fullName;
  final String phone;
  final int? wilayaCode;
  final EducationLevel? level;
  final String? streamId;
  final bool isSaving;
  final String? error;

  /// BEM students finish after choosing their level.
  List<OnboardingStep> get steps => level?.hasStreams == false
      ? const [OnboardingStep.identity, OnboardingStep.level]
      : OnboardingStep.values;

  bool get isLastStep => step == steps.last;

  bool get canContinue => switch (step) {
    OnboardingStep.identity =>
      Validators.fullName(fullName) == null &&
          Validators.phone(phone) == null &&
          wilayaCode != null,
    OnboardingStep.level => level != null,
    OnboardingStep.stream =>
      streamId != null && streamById(streamId)?.level == level,
  };

  OnboardingState copyWith({
    OnboardingStep? step,
    String? fullName,
    String? phone,
    int? wilayaCode,
    EducationLevel? level,
    String? Function()? streamId,
    bool? isSaving,
    String? Function()? error,
  }) {
    return OnboardingState(
      step: step ?? this.step,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      wilayaCode: wilayaCode ?? this.wilayaCode,
      level: level ?? this.level,
      streamId: streamId != null ? streamId() : this.streamId,
      isSaving: isSaving ?? this.isSaving,
      error: error != null ? error() : this.error,
    );
  }

  @override
  List<Object?> get props => [
    step,
    fullName,
    phone,
    wilayaCode,
    level,
    streamId,
    isSaving,
    error,
  ];
}

class OnboardingCubit extends Cubit<OnboardingState> {
  OnboardingCubit(this._profiles, {required this.user})
    : super(OnboardingState(fullName: user.displayName ?? ''));

  final AppUser user;
  final ProfileRepository _profiles;

  void fullNameChanged(String value) => emit(state.copyWith(fullName: value));

  void phoneChanged(String value) => emit(state.copyWith(phone: value));

  void wilayaSelected(int code) => emit(state.copyWith(wilayaCode: code));

  void levelSelected(EducationLevel level) {
    if (level == state.level) return;
    emit(state.copyWith(level: level, streamId: () => null));
  }

  void streamSelected(String id) => emit(state.copyWith(streamId: () => id));

  void back() {
    final i = state.steps.indexOf(state.step);
    if (i > 0) emit(state.copyWith(step: state.steps[i - 1]));
  }

  /// Moves to the next step, or saves the profile on the last one and
  /// returns it.
  Future<StudentProfile?> next() async {
    if (!state.canContinue || state.isSaving) return null;
    if (!state.isLastStep) {
      final i = state.steps.indexOf(state.step);
      emit(state.copyWith(step: state.steps[i + 1]));
      return null;
    }
    final profile = StudentProfile(
      uid: user.uid,
      fullName: state.fullName.trim(),
      email: user.email,
      phone: Validators.normalizePhone(state.phone)!,
      wilayaCode: state.wilayaCode!,
      level: state.level!,
      streamId: state.level!.hasStreams ? state.streamId : null,
    );
    emit(state.copyWith(isSaving: true, error: () => null));
    try {
      await _profiles.save(profile);
      return profile;
    } catch (_) {
      emit(
        state.copyWith(
          isSaving: false,
          error: () => 'تعذّر حفظ ملفك، تحقق من الاتصال وأعد المحاولة',
        ),
      );
      return null;
    }
  }
}
