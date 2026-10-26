import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../auth/domain/student_profile.dart';
import '../../domain/curriculum.dart';
import '../../domain/progress.dart';
import '../../domain/repositories.dart';

class StudyState extends Equatable {
  const StudyState({
    this.loading = true,
    this.subjects = const [],
    this.progress = const StudyProgress(),
    this.curriculum,
    this.error,
  });

  final bool loading;
  final List<Subject> subjects;
  final StudyProgress progress;
  final Curriculum? curriculum;
  final String? error;

  double subjectCompletion(Subject subject) =>
      progress.completion(subject.lessons.map((l) => l.id));

  double get overallCompletion {
    // Weighted by coefficient, like the exam average.
    var weight = 0;
    var total = 0.0;
    for (final s in subjects) {
      weight += s.coefficient;
      total += s.coefficient * subjectCompletion(s);
    }
    return weight == 0 ? 0 : total / weight;
  }

  StudyState copyWith({
    bool? loading,
    List<Subject>? subjects,
    StudyProgress? progress,
    Curriculum? curriculum,
    String? error,
  }) {
    return StudyState(
      loading: loading ?? this.loading,
      subjects: subjects ?? this.subjects,
      progress: progress ?? this.progress,
      curriculum: curriculum ?? this.curriculum,
      error: error,
    );
  }

  @override
  List<Object?> get props => [loading, subjects, progress, curriculum, error];
}

/// The student's programme and progress, shared by every tab.
class StudyCubit extends Cubit<StudyState> {
  StudyCubit({
    required this.profile,
    required this._progress,
    required Future<Curriculum> Function() loadCurriculum,
  }) : super(const StudyState()) {
    _start(loadCurriculum);
  }

  final StudentProfile profile;
  final ProgressRepository _progress;
  StreamSubscription<StudyProgress>? _subscription;

  String? get trackKey => Curriculum.trackKey(profile.level, profile.streamId);

  DateTime examDate(DateTime now) =>
      state.progress.examDate ?? defaultExamDate(profile.level, now);

  Future<void> _start(Future<Curriculum> Function() load) async {
    try {
      final curriculum = await load();
      if (isClosed) return;
      emit(
        state.copyWith(
          curriculum: curriculum,
          subjects: curriculum.subjectsFor(trackKey),
        ),
      );
    } catch (_) {
      if (!isClosed) {
        emit(state.copyWith(loading: false, error: 'تعذّر تحميل المنهاج'));
      }
      return;
    }
    _subscription = _progress
        .watch(profile.uid)
        .listen(
          (p) => emit(state.copyWith(loading: false, progress: p)),
          onError: (_) => emit(
            state.copyWith(
              loading: false,
              error: 'تعذّر تحميل تقدّمك، تحقق من الاتصال',
            ),
          ),
        );
  }

  Future<void> setStatus(String lessonId, LessonStatus status) async {
    // Optimistic: the bar moves at once, the stream confirms it.
    emit(state.copyWith(progress: state.progress.withStatus(lessonId, status)));
    try {
      await _progress.setStatus(profile.uid, lessonId, status);
    } catch (_) {
      if (!isClosed) {
        emit(state.copyWith(error: 'لم يُحفظ التغيير، تحقق من الاتصال'));
      }
    }
  }

  Future<void> setExamDate(DateTime date) async {
    emit(state.copyWith(progress: state.progress.withExamDate(date)));
    await _progress.setExamDate(profile.uid, date);
  }

  @override
  Future<void> close() {
    _subscription?.cancel();
    return super.close();
  }
}
