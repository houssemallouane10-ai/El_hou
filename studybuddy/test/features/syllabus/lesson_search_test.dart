import 'dart:convert';
import 'dart:io';

import 'package:dz_studybuddy/features/syllabus/domain/curriculum.dart';
import 'package:dz_studybuddy/features/syllabus/domain/lesson_search.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Curriculum curriculum;

  setUpAll(() {
    curriculum = Curriculum.fromJson(
      jsonDecode(File(Curriculum.assetPath).readAsStringSync())
          as Map<String, Object?>,
    );
  });

  List<LessonMatch> search(String q, {String track = 'sciences'}) =>
      searchLessons(curriculum: curriculum, query: q, defaultTrack: track);

  test('the example from the brief: another stream, asking for a summary', () {
    final results = search('أريد ملخص درس الموافقات شعبة رياضيات');
    expect(results.first.lesson.title, 'الموافقات في Z');
    expect(results.first.resource, LessonResource.summary);
    expect(results.first.trackKey, 'math');
  });

  test('finds lessons whatever the spelling of hamza and taa marbuta', () {
    expect(
      search('شرح المنعكس العضلى').first.lesson.title,
      contains('المنعكس العضلي'),
    );
    expect(search('الداله الاسيه').first.lesson.title, 'الدالة الأسية');
  });

  test('picks the resource the student asked for', () {
    expect(search('شرح المنعكس العضلي').first.resource, LessonResource.videos);
    expect(
      search('حوليات الدالة الأسية').first.resource,
      LessonResource.pastPapers,
    );
    expect(search('الدالة الأسية').first.resource, isNull);
  });

  test('every term must match', () {
    expect(search('الدالة الأسية الزلازل'), isEmpty);
    expect(search('ملخص'), isEmpty);
  });

  test('normalizeArabic', () {
    expect(normalizeArabic('إِنَّ الأُمَّةَ'), 'ان الامه');
    expect(normalizeArabic('مُسْتَشْفَى'), 'مستشفي');
  });
}
