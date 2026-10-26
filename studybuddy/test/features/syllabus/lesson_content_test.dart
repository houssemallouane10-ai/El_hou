import 'package:dz_studybuddy/features/syllabus/data/in_memory_syllabus_repositories.dart';
import 'package:dz_studybuddy/features/syllabus/domain/curriculum.dart';
import 'package:dz_studybuddy/features/syllabus/domain/lesson_content.dart';
import 'package:dz_studybuddy/features/syllabus/data/ai_summary_service.dart';
import 'package:dz_studybuddy/features/syllabus/presentation/bloc/lesson_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers.dart';

void main() {
  test('parseYoutubeId accepts the usual link forms', () {
    const id = 'dQw4w9WgXcQ';
    for (final url in [
      'https://www.youtube.com/watch?v=$id',
      'https://m.youtube.com/watch?v=$id&t=42s',
      'https://youtu.be/$id?si=abc',
      'https://www.youtube.com/shorts/$id',
      'https://youtube.com/embed/$id',
      'https://www.youtube.com/live/$id',
    ]) {
      expect(parseYoutubeId(url), id, reason: url);
    }
    for (final bad in [
      'https://vimeo.com/123',
      'youtube.com/watch?v=$id',
      'https://www.youtube.com/watch?v=short',
      'not a url',
    ]) {
      expect(parseYoutubeId(bad), isNull, reason: bad);
    }
  });

  test('LessonContent sorts past papers newest first and skips bad rows', () {
    final content = LessonContent.fromMap({
      'summary': 'سطر',
      'pastPapers': [
        {'year': 2015, 'title': 'الموضوع الأول'},
        {
          'year': 2022,
          'title': 'الموضوع الثاني',
          'solutionUrl': 'https://x.dz/s.pdf',
        },
        {'title': 'بلا سنة'},
      ],
    });
    expect(content.pastPapers.map((p) => p.year), [2022, 2015]);
    expect(
      content.pastPapers.first.solutionUrl,
      Uri.parse('https://x.dz/s.pdf'),
    );
  });

  group('LessonCubit', () {
    const lesson = Lesson(
      id: 'bac_math_arith_03',
      title: 'الموافقات في Z',
      unitTitle: 'الحسابيات',
      subjectId: 'math',
      subjectName: 'الرياضيات',
    );
    late InMemoryLessonContentRepository repo;
    late FakeAiClient ai;

    LessonCubit cubit({String uid = 'u1'}) => LessonCubit(
      lesson: lesson,
      uid: uid,
      levelLabel: 'شهادة البكالوريا، شعبة رياضيات',
      content: repo,
      summaries: AiSummaryService(ai),
    );

    setUp(() {
      useInMemoryPreferences();
      repo = InMemoryLessonContentRepository();
      ai = FakeAiClient();
    });

    test('suggesting a video upvotes it; duplicates are refused', () async {
      final a = cubit();
      await pumpEventQueue();
      expect(
        await a.addVideo(
          youtubeId: 'dQw4w9WgXcQ',
          title: 'شرح',
          channel: 'أستاذ',
        ),
        isNull,
      );
      await pumpEventQueue();
      expect(a.state.videos!.single.score, 1);
      expect(a.state.myVotes['dQw4w9WgXcQ'], 1);
      expect(
        await a.addVideo(youtubeId: 'dQw4w9WgXcQ', title: 'x', channel: 'y'),
        isNotNull,
      );
      await a.close();
    });

    test(
      'votes from several students; tapping your vote again withdraws it',
      () async {
        await repo.addVideo(
          lessonId: lesson.id,
          uid: 'u0',
          youtubeId: 'aaaaaaaaaaa',
          title: 'A',
          channel: '',
        );
        await repo.addVideo(
          lessonId: lesson.id,
          uid: 'u0',
          youtubeId: 'bbbbbbbbbbb',
          title: 'B',
          channel: '',
        );
        final s1 = cubit(uid: 's1');
        final s2 = cubit(uid: 's2');
        await pumpEventQueue();
        final b = s1.state.videos!.firstWhere((v) => v.id == 'bbbbbbbbbbb');
        final a = s1.state.videos!.firstWhere((v) => v.id == 'aaaaaaaaaaa');
        await s1.vote(b, 1);
        await s2.vote(b, 1);
        await s2.vote(a, -1);
        await pumpEventQueue();
        expect(s1.state.videos!.map((v) => (v.id, v.score)), [
          ('bbbbbbbbbbb', 2),
          ('aaaaaaaaaaa', -1),
        ]);
        await s1.vote(b, 1);
        await pumpEventQueue();
        expect(s1.state.myVotes['bbbbbbbbbbb'], 0);
        expect(s1.state.videos!.first.score, 1);
        await s1.close();
        await s2.close();
      },
    );

    test('the summary is generated once, then served from the cache', () async {
      final c = cubit();
      await c.summarize();
      expect(c.state.summary!.keyPoints, hasLength(2));
      expect(ai.calls.single.prompt, contains('الموافقات في Z'));
      expect(ai.calls.single.prompt, contains('شعبة رياضيات'));
      await c.close();

      final again = cubit();
      await again.summarize();
      expect(again.state.summary, c.state.summary);
      expect(ai.calls, hasLength(1));
      await again.summarize(refresh: true);
      expect(ai.calls, hasLength(2));
      await again.close();
    });

    test('an unavailable model shows an error instead of a summary', () async {
      ai = FakeAiClient(available: false);
      final c = cubit();
      expect(c.canSummarize, isFalse);
      await c.summarize();
      expect(c.state.summary, isNull);
      expect(c.state.summaryError, isNotNull);
      await c.close();
    });
  });
}
