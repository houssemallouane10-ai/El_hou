import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/ai/ai_client.dart';
import '../../domain/grader_repositories.dart';
import '../../domain/grading.dart';

enum GraderStatus { editing, grading, done }

class GraderState extends Equatable {
  const GraderState({
    this.status = GraderStatus.editing,
    this.subjectId,
    this.lessonId,
    this.questionText = '',
    this.maxMark = '',
    this.questionImage,
    this.pages = const [],
    this.result,
    this.error,
  });

  final GraderStatus status;
  final String? subjectId;
  final String? lessonId;
  final String questionText;

  /// As typed, e.g. "3" or "1.5".
  final String maxMark;
  final AiImage? questionImage;
  final List<AiImage> pages;
  final GradingResult? result;
  final String? error;

  static const maxPages = 4;

  double? get parsedMaxMark {
    final v = double.tryParse(maxMark.replaceAll(',', '.').trim());
    return v != null && v > 0 && v <= 20 ? v : null;
  }

  bool get canGrade =>
      status == GraderStatus.editing && subjectId != null && pages.isNotEmpty;

  GraderState copyWith({
    GraderStatus? status,
    String? subjectId,
    String? Function()? lessonId,
    String? questionText,
    String? maxMark,
    AiImage? Function()? questionImage,
    List<AiImage>? pages,
    GradingResult? Function()? result,
    String? Function()? error,
  }) {
    return GraderState(
      status: status ?? this.status,
      subjectId: subjectId ?? this.subjectId,
      lessonId: lessonId != null ? lessonId() : this.lessonId,
      questionText: questionText ?? this.questionText,
      maxMark: maxMark ?? this.maxMark,
      questionImage: questionImage != null
          ? questionImage()
          : this.questionImage,
      pages: pages ?? this.pages,
      result: result != null ? result() : this.result,
      error: error != null ? error() : this.error,
    );
  }

  @override
  List<Object?> get props => [
    status,
    subjectId,
    lessonId,
    questionText,
    maxMark,
    questionImage,
    pages,
    result,
    error,
  ];
}

/// Collects the photos and context, sends them to the grader and saves the
/// verdict in the student's history.
class GraderCubit extends Cubit<GraderState> {
  GraderCubit({
    required this.uid,
    required this._grader,
    required this._history,
    String? initialSubjectId,
  }) : super(GraderState(subjectId: initialSubjectId));

  final String uid;
  final HomeworkGrader _grader;
  final GradingHistoryRepository _history;

  bool get isAvailable => _grader.isAvailable;

  void subjectSelected(String id) {
    if (id == state.subjectId) return;
    emit(state.copyWith(subjectId: id, lessonId: () => null));
  }

  void lessonSelected(String? id) => emit(state.copyWith(lessonId: () => id));
  void questionChanged(String text) => emit(state.copyWith(questionText: text));
  void maxMarkChanged(String text) => emit(state.copyWith(maxMark: text));

  void addPage(AiImage image) {
    if (state.pages.length >= GraderState.maxPages) return;
    emit(state.copyWith(pages: [...state.pages, image], error: () => null));
  }

  void removePage(int index) =>
      emit(state.copyWith(pages: [...state.pages]..removeAt(index)));

  void setQuestionImage(AiImage? image) =>
      emit(state.copyWith(questionImage: () => image));

  Future<void> grade({
    required String subjectName,
    required String levelLabel,
    String? lessonTitle,
  }) async {
    if (!state.canGrade) return;
    emit(state.copyWith(status: GraderStatus.grading, error: () => null));
    try {
      final result = await _grader.grade(
        GradingRequest(
          answerPages: state.pages,
          subjectName: subjectName,
          levelLabel: levelLabel,
          lessonTitle: lessonTitle,
          questionText: state.questionText,
          questionImage: state.questionImage,
          maxMark: state.parsedMaxMark,
        ),
      );
      if (isClosed) return;
      emit(state.copyWith(status: GraderStatus.done, result: () => result));
      if (result.readable) {
        // History is best-effort: the student already has the verdict.
        try {
          await _history.save(
            uid,
            GradingRecord(
              id: DateTime.now().microsecondsSinceEpoch.toString(),
              subjectId: state.subjectId!,
              subjectName: subjectName,
              lessonTitle: lessonTitle,
              createdAt: DateTime.now(),
              result: result,
            ),
          );
        } catch (_) {}
      }
    } on AiException catch (e) {
      if (!isClosed) {
        emit(
          state.copyWith(status: GraderStatus.editing, error: () => e.message),
        );
      }
    }
  }

  /// Starts a new grading, keeping the subject.
  void reset() => emit(GraderState(subjectId: state.subjectId));
}
