import 'dart:convert';
import 'dart:io';

import 'package:dz_studybuddy/core/constants/algeria_data.dart';
import 'package:dz_studybuddy/features/syllabus/domain/curriculum.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Curriculum curriculum;

  setUpAll(() {
    final raw = File(Curriculum.assetPath).readAsStringSync();
    curriculum = Curriculum.fromJson(jsonDecode(raw) as Map<String, Object?>);
  });

  test('every stream of the onboarding, and BEM, has a programme', () {
    final keys = {for (final s in studyStreams) s.id, 'bem'};
    expect(curriculum.trackKeys.toSet(), keys);
    for (final key in keys) {
      final subjects = curriculum.subjectsFor(key);
      expect(subjects, isNotEmpty, reason: key);
      for (final s in subjects) {
        expect(s.coefficient, greaterThan(0), reason: '$key/${s.id}');
        expect(s.lessons, isNotEmpty, reason: '$key/${s.id}');
      }
      final ids = [for (final s in subjects) ...s.lessons.map((l) => l.id)];
      expect(ids.toSet().length, ids.length, reason: 'duplicate ids in $key');
    }
  });

  test('subjects come sorted by coefficient', () {
    final sciences = curriculum.subjectsFor('sciences');
    expect(sciences.first.id, 'svt');
    expect(sciences.first.coefficient, 6);
    final math = curriculum.subjectsFor('math');
    expect(math.first.id, 'math');
    expect(math.first.coefficient, 7);
  });

  test('stream-specific lessons', () {
    List<String> titles(String track, String subject) => curriculum
        .subjectsFor(track)
        .firstWhere((s) => s.id == subject)
        .lessons
        .map((l) => l.title)
        .toList();

    expect(titles('math', 'math'), contains('الموافقات في Z'));
    expect(titles('sciences', 'math'), isNot(contains('الموافقات في Z')));
    expect(
      titles('sciences', 'svt'),
      contains('دور البروتينات في الاتصال العصبي: المنعكس العضلي'),
    );
  });

  test('a lesson taught in two streams keeps one id', () {
    String idOf(String track, String title) => curriculum
        .subjectsFor(track)
        .expand((s) => s.lessons)
        .firstWhere((l) => l.title == title)
        .id;
    expect(
      idOf('sciences', 'الأعداد المركبة'),
      idOf('math', 'الأعداد المركبة'),
    );
  });

  test('trackKey uses the BEM programme for BEM students', () {
    expect(Curriculum.trackKey(EducationLevel.bem, null), 'bem');
    expect(Curriculum.trackKey(EducationLevel.bac, 'math'), 'math');
  });
}
