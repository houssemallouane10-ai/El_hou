import 'curriculum.dart';
import 'progress.dart';

class PlannedLesson {
  const PlannedLesson(this.lesson, this.status, this.reason);

  final Lesson lesson;
  final LessonStatus status;

  /// A short Arabic explanation shown under the lesson.
  final String reason;
}

class StudyPlan {
  const StudyPlan({
    required this.lessons,
    required this.daysLeft,
    required this.remaining,
  });

  final List<PlannedLesson> lessons;
  final int daysLeft;

  /// Lessons not yet mastered across all subjects.
  final int remaining;
}

/// Picks today's lessons: enough to finish the programme two weeks before
/// the exam (kept for general revision), favouring heavy coefficients,
/// lessons the student marked as hard, and subjects where the AI grader
/// gave low marks ([weakSubjects]: subjectId → 0..1 weakness).
StudyPlan buildDailyPlan({
  required List<Subject> subjects,
  required StudyProgress progress,
  required DateTime examDate,
  required DateTime today,
  Map<String, double> weakSubjects = const {},
  int maxPerSubject = 2,
}) {
  final day = DateTime(today.year, today.month, today.day);
  final daysLeft = examDate.difference(day).inDays;

  final candidates = <(Lesson, LessonStatus, double)>[];
  for (final subject in subjects) {
    final weakness = weakSubjects[subject.id] ?? 0;
    for (final lesson in subject.lessons) {
      final status = progress.statusOf(lesson.id);
      if (status == LessonStatus.mastered) continue;
      final statusFactor = switch (status) {
        LessonStatus.struggling => 3.0,
        LessonStatus.learning => 2.0,
        _ => 1.0,
      };
      candidates.add((
        lesson,
        status,
        subject.coefficient * statusFactor * (1 + weakness),
      ));
    }
  }

  final remaining = candidates.length;
  final studyDays = (daysLeft - 14).clamp(1, 1 << 30);
  // At least two a day while lessons remain, so the programme ends early
  // and leaves time for past papers; at most five.
  final perDay = (remaining / studyDays).ceil().clamp(remaining.clamp(0, 2), 5);

  // Stable order: by priority, then by curriculum order within a subject so
  // lessons come up in the order they are taught.
  final order = {for (final (i, c) in candidates.indexed) c.$1.id: i};
  candidates.sort((a, b) {
    final byPriority = b.$3.compareTo(a.$3);
    return byPriority != 0
        ? byPriority
        : order[a.$1.id]!.compareTo(order[b.$1.id]!);
  });

  final picked = <PlannedLesson>[];
  final perSubject = <String, int>{};
  for (final (lesson, status, _) in candidates) {
    if (picked.length >= perDay) break;
    final count = perSubject[lesson.subjectId] ?? 0;
    if (count >= maxPerSubject) continue;
    perSubject[lesson.subjectId] = count + 1;
    final weak = (weakSubjects[lesson.subjectId] ?? 0) >= 0.3;
    picked.add(
      PlannedLesson(lesson, status, switch (status) {
        LessonStatus.struggling => 'علّمته صعباً عليك',
        LessonStatus.learning => 'أكمل ما بدأته',
        _ when weak => 'علاماتك في هذه المادة تحتاج دعماً',
        _ => 'درس جديد في مادة معاملها ${_coef(lesson, subjects)}',
      }),
    );
  }
  return StudyPlan(lessons: picked, daysLeft: daysLeft, remaining: remaining);
}

int _coef(Lesson lesson, List<Subject> subjects) =>
    subjects.firstWhere((s) => s.id == lesson.subjectId).coefficient;
