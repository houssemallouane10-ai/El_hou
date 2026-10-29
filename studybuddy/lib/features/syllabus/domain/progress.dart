import 'package:equatable/equatable.dart';

import '../../../core/constants/algeria_data.dart';

enum LessonStatus {
  todo('لم أبدأ', 0),
  learning('أراجعه', 0.5),
  struggling('صعب عليّ', 0.25),
  mastered('أتقنته', 1);

  const LessonStatus(this.label, this.weight);

  final String label;

  /// Contribution to a subject's progress bar.
  final double weight;

  static LessonStatus fromName(String? name) =>
      values.firstWhere((s) => s.name == name, orElse: () => todo);
}

/// A student's lesson statuses and target exam date, stored at
/// `users/{uid}/meta/progress`.
class StudyProgress extends Equatable {
  const StudyProgress({this.statuses = const {}, this.examDate});

  final Map<String, LessonStatus> statuses;
  final DateTime? examDate;

  LessonStatus statusOf(String lessonId) =>
      statuses[lessonId] ?? LessonStatus.todo;

  /// 0..1 across [lessonIds].
  double completion(Iterable<String> lessonIds) {
    var total = 0;
    var done = 0.0;
    for (final id in lessonIds) {
      total++;
      done += statusOf(id).weight;
    }
    return total == 0 ? 0 : done / total;
  }

  StudyProgress withStatus(String lessonId, LessonStatus status) {
    final next = Map.of(statuses);
    if (status == LessonStatus.todo) {
      next.remove(lessonId);
    } else {
      next[lessonId] = status;
    }
    return StudyProgress(statuses: next, examDate: examDate);
  }

  StudyProgress withExamDate(DateTime date) =>
      StudyProgress(statuses: statuses, examDate: date);

  @override
  List<Object?> get props => [statuses, examDate];
}

/// The usual exam date when the student has not set one: BAC around mid
/// June, BEM early June, university semester exams in January or June.
DateTime defaultExamDate(EducationLevel level, DateTime now) {
  DateTime next(int month, int day) {
    final thisYear = DateTime(now.year, month, day);
    return thisYear.isAfter(now)
        ? thisYear
        : DateTime(now.year + 1, month, day);
  }

  return switch (level) {
    EducationLevel.bac => next(6, 14),
    EducationLevel.bem => next(6, 2),
    EducationLevel.university => [
      next(1, 15),
      next(6, 1),
    ].reduce((a, b) => a.isBefore(b) ? a : b),
  };
}
