import 'package:dz_studybuddy/core/constants/algeria_data.dart';
import 'package:dz_studybuddy/features/syllabus/domain/curriculum.dart';
import 'package:dz_studybuddy/features/syllabus/domain/progress.dart';
import 'package:dz_studybuddy/features/syllabus/domain/study_plan.dart';
import 'package:flutter_test/flutter_test.dart';

Subject subject(String id, int coef, int lessons) => Subject(
  id: id,
  name: id,
  icon: 'math',
  coefficient: coef,
  units: [
    CurriculumUnit('u', [
      for (var i = 1; i <= lessons; i++)
        Lesson(
          id: '${id}_$i',
          title: '$id $i',
          unitTitle: 'u',
          subjectId: id,
          subjectName: id,
        ),
    ]),
  ],
);

void main() {
  final today = DateTime(2027, 1, 10);
  final subjects = [subject('math', 7, 10), subject('svt', 2, 10)];

  test('spreads the remaining lessons over the days before revision', () {
    // 20 lessons, 24 days left, 10 of them for study: 2 a day.
    final plan = buildDailyPlan(
      subjects: subjects,
      progress: const StudyProgress(),
      examDate: today.add(const Duration(days: 24)),
      today: today,
    );
    expect(plan.daysLeft, 24);
    expect(plan.remaining, 20);
    expect(plan.lessons, hasLength(2));
    // Heavy coefficient first, in curriculum order.
    expect(plan.lessons.map((l) => l.lesson.id), ['math_1', 'math_2']);
  });

  test('hard lessons and weak subjects come first; mastered ones never', () {
    final progress = const StudyProgress()
        .withStatus('math_1', LessonStatus.mastered)
        .withStatus('svt_5', LessonStatus.struggling);
    final plan = buildDailyPlan(
      subjects: subjects,
      progress: progress,
      examDate: today.add(const Duration(days: 10)),
      today: today,
      weakSubjects: {'svt': 0.6},
    );
    expect(plan.remaining, 19);
    expect(plan.lessons, hasLength(4));
    final ids = plan.lessons.map((l) => l.lesson.id).toList();
    expect(ids.first, 'svt_5');
    expect(ids, isNot(contains('math_1')));
    expect(plan.lessons.first.reason, 'علّمته صعباً عليك');
    // At most two per subject.
    expect(ids.where((id) => id.startsWith('math')).length, 2);
  });

  test('at least two lessons a day, even far from the exam', () {
    final plan = buildDailyPlan(
      subjects: subjects,
      progress: const StudyProgress(),
      examDate: today.add(const Duration(days: 300)),
      today: today,
    );
    expect(plan.lessons, hasLength(2));
  });

  test('nothing left means an empty plan', () {
    var progress = const StudyProgress();
    for (final s in subjects) {
      for (final l in s.lessons) {
        progress = progress.withStatus(l.id, LessonStatus.mastered);
      }
    }
    final plan = buildDailyPlan(
      subjects: subjects,
      progress: progress,
      examDate: today.add(const Duration(days: 30)),
      today: today,
    );
    expect(plan.lessons, isEmpty);
    expect(plan.remaining, 0);
  });

  test('completion weights statuses', () {
    final progress = const StudyProgress()
        .withStatus('a', LessonStatus.mastered)
        .withStatus('b', LessonStatus.learning);
    expect(progress.completion(['a', 'b', 'c', 'd']), (1 + 0.5) / 4);
    expect(progress.withStatus('a', LessonStatus.todo).statuses, {
      'b': LessonStatus.learning,
    });
  });

  test('default exam dates', () {
    expect(
      defaultExamDate(EducationLevel.bac, DateTime(2026, 10, 25)),
      DateTime(2027, 6, 14),
    );
    expect(
      defaultExamDate(EducationLevel.bac, DateTime(2027, 3, 1)),
      DateTime(2027, 6, 14),
    );
    expect(
      defaultExamDate(EducationLevel.university, DateTime(2026, 10, 25)),
      DateTime(2027, 1, 15),
    );
    expect(
      defaultExamDate(EducationLevel.university, DateTime(2027, 2, 1)),
      DateTime(2027, 6, 1),
    );
  });
}
