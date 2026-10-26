import 'dart:typed_data';

import 'package:dz_studybuddy/core/ai/ai_client.dart';
import 'package:dz_studybuddy/features/grader/data/ai_homework_grader.dart';
import 'package:dz_studybuddy/features/grader/data/grading_history_repositories.dart';
import 'package:dz_studybuddy/features/grader/domain/grader_repositories.dart';
import 'package:dz_studybuddy/features/grader/domain/grading.dart';
import 'package:dz_studybuddy/features/grader/presentation/bloc/grader_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers.dart';

final page = AiImage(Uint8List.fromList([1, 2, 3]));
final question = AiImage(Uint8List.fromList([9]), mimeType: 'image/png');

void main() {
  test('results are clamped to the scale and rounded to quarter points', () {
    final r = GradingResult.fromJson(sampleGrading);
    expect(r.estimatedMark, 1.5);
    expect(r.maxMark, 3);
    expect(r.markLabel, '1.5 / 3');
    expect(r.steps.last.verdict, StepVerdict.wrong);

    final over = GradingResult.fromJson({...sampleGrading, 'estimatedMark': 7});
    expect(over.estimatedMark, 3);
    final noScale = GradingResult.fromJson({...sampleGrading, 'maxMark': 0});
    expect(noScale.maxMark, 20);
    expect(GradingResult.fromJson(r.toJson()), r);
  });

  test(
    'the grader sends the exercise first and keeps the stated scale',
    () async {
      final ai = FakeAiClient();
      final grader = AiHomeworkGrader(ai);
      final result = await grader.grade(
        GradingRequest(
          answerPages: [page],
          questionImage: question,
          subjectName: 'العلوم الفيزيائية',
          levelLabel: 'شهادة البكالوريا',
          lessonTitle: 'التحولات النووية',
          maxMark: 6,
        ),
      );
      final call = ai.calls.single;
      expect(call.images, [question, page]);
      expect(call.prompt, contains('العلامة القصوى للسؤال: 6'));
      expect(call.prompt, contains('الصورة الأولى هي نص التمرين'));
      expect(call.system, contains('Algerian Ministry of Education Examiner'));
      // 1.5 / 3 on the model's scale is 3 / 6 on the student's.
      expect(result.markLabel, '3 / 6');
    },
  );

  test('weakness is one minus the average ratio per subject', () {
    GradingRecord rec(String subject, double mark, {bool readable = true}) =>
        GradingRecord(
          id: '$subject$mark',
          subjectId: subject,
          subjectName: subject,
          createdAt: DateTime(2027),
          result: GradingResult(
            readable: readable,
            estimatedMark: mark,
            maxMark: 4,
            methodology: '',
            steps: const [],
            correctSolution: '',
            tip: '',
          ),
        );
    expect(
      weaknessBySubject([
        rec('math', 1),
        rec('math', 3),
        rec('svt', 4),
        rec('svt', 0, readable: false),
      ]),
      {'math': 0.5, 'svt': 0.0},
    );
  });

  group('GraderCubit', () {
    test('grades, then saves the verdict to the history', () async {
      final history = InMemoryGradingHistoryRepository();
      final cubit = GraderCubit(
        uid: 'u1',
        grader: AiHomeworkGrader(FakeAiClient()),
        history: history,
        initialSubjectId: 'physics',
      );
      expect(cubit.state.canGrade, isFalse);
      cubit
        ..addPage(page)
        ..maxMarkChanged('3,5');
      expect(cubit.state.parsedMaxMark, 3.5);
      expect(cubit.state.canGrade, isTrue);

      await cubit.grade(subjectName: 'الفيزياء', levelLabel: 'BAC');
      expect(cubit.state.status, GraderStatus.done);
      expect(cubit.state.result!.maxMark, 3.5);
      final saved = await history.watch('u1').first;
      expect(saved.single.subjectId, 'physics');

      cubit.reset();
      expect(cubit.state.pages, isEmpty);
      expect(cubit.state.subjectId, 'physics');
      await cubit.close();
    });

    test('errors return to the form with a message', () async {
      final cubit = GraderCubit(
        uid: 'u1',
        grader: AiHomeworkGrader(FakeAiClient(available: false)),
        history: InMemoryGradingHistoryRepository(),
        initialSubjectId: 'math',
      )..addPage(page);
      await cubit.grade(subjectName: 'الرياضيات', levelLabel: 'BAC');
      expect(cubit.state.status, GraderStatus.editing);
      expect(cubit.state.error, isNotNull);
      expect(cubit.state.pages, hasLength(1));
      await cubit.close();
    });

    test('at most four answer pages', () {
      final cubit = GraderCubit(
        uid: 'u1',
        grader: AiHomeworkGrader(FakeAiClient()),
        history: InMemoryGradingHistoryRepository(),
      );
      for (var i = 0; i < 6; i++) {
        cubit.addPage(page);
      }
      expect(cubit.state.pages, hasLength(GraderState.maxPages));
    });
  });
}
