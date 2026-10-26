import '../../../core/constants/algeria_data.dart';
import 'curriculum.dart';

/// Which of the lesson's three resources the query asked for.
enum LessonResource { summary, videos, pastPapers }

class LessonMatch {
  const LessonMatch(this.lesson, this.score, {this.resource, this.trackKey});

  final Lesson lesson;
  final int score;

  /// Set when the query named a resource, e.g. "ملخص" or "حوليات".
  final LessonResource? resource;

  /// The stream the lesson was found in, when the query named another one.
  final String? trackKey;
}

/// Folds the spelling variants students type: diacritics, tatweel, hamza
/// forms, taa marbuta and alif maqsura.
String normalizeArabic(String input) => input
    .toLowerCase()
    .replaceAll(RegExp('[ً-ْٰـ]'), '')
    .replaceAll(RegExp('[أإآٱ]'), 'ا')
    .replaceAll('ة', 'ه')
    .replaceAll('ى', 'ي')
    .replaceAll('ؤ', 'و')
    .replaceAll('ئ', 'ي');

const _resourceWords = {
  'ملخص': LessonResource.summary,
  'تلخيص': LessonResource.summary,
  'فيديو': LessonResource.videos,
  'فيديوهات': LessonResource.videos,
  'شرح': LessonResource.videos,
  'يوتيوب': LessonResource.videos,
  'حوليات': LessonResource.pastPapers,
  'حوليه': LessonResource.pastPapers,
  'تمارين': LessonResource.pastPapers,
  'مواضيع': LessonResource.pastPapers,
};

const _stopWords = {
  'اريد',
  'ابغي',
  'نحب',
  'حاب',
  'من',
  'في',
  'على',
  'عن',
  'الى',
  'درس',
  'دروس',
  'ماده',
  'شعبه',
  'شعبة',
  'مستوى',
  'سنه',
  'ثالثه',
  'ثانوي',
  'لي',
  'افضل',
  'احسن',
  'و',
  'مع',
  'بكالوريا',
  'باك',
  'bac',
};

String _stem(String token) =>
    token.length > 4 && token.startsWith('ال') ? token.substring(2) : token;

/// Finds lessons for a free-text query like
/// "أريد ملخص درس الموافقات شعبة رياضيات". A stream named in the query
/// ("شعبة رياضيات") switches the search to that stream's programme.
List<LessonMatch> searchLessons({
  required Curriculum curriculum,
  required String query,
  required String? defaultTrack,
  int limit = 20,
}) {
  final tokens = normalizeArabic(query)
      .split(RegExp(r'[\s،,.؟?!:]+'))
      .where((t) => t.isNotEmpty)
      .toList();

  LessonResource? resource;
  String? track = defaultTrack;
  var namedTrack = false;
  final terms = <String>[];

  final normalizedQuery = normalizeArabic(query);
  for (final stream in studyStreams) {
    final name = normalizeArabic(
      stream.name.split(' · ').last.split(' (').first,
    );
    // "شعبة رياضيات" and "شعبة الرياضيات" both name the stream.
    if (normalizedQuery.contains('شعبه $name') ||
        normalizedQuery.contains('شعبه ال$name')) {
      track = stream.id;
      namedTrack = true;
      final words = name.split(' ');
      tokens.removeWhere((t) => words.contains(t) || words.contains(_stem(t)));
    }
  }

  for (final token in tokens) {
    if (_resourceWords.containsKey(token)) {
      resource ??= _resourceWords[token];
    } else if (!_stopWords.contains(token) && token.length > 1) {
      terms.add(_stem(token));
    }
  }
  if (terms.isEmpty) return const [];

  final matches = <LessonMatch>[];
  for (final subject in curriculum.subjectsFor(track)) {
    for (final lesson in subject.lessons) {
      final title = normalizeArabic(lesson.title);
      final context = normalizeArabic('${lesson.unitTitle} ${subject.name}');
      var score = 0;
      var matched = 0;
      for (final term in terms) {
        if (title.contains(term)) {
          score += 3;
          matched++;
        } else if (context.contains(term)) {
          score += 1;
          matched++;
        }
      }
      // Every term must match somewhere, and at least one in the title.
      if (matched == terms.length && score >= 3) {
        matches.add(
          LessonMatch(
            lesson,
            score,
            resource: resource,
            trackKey: namedTrack ? track : null,
          ),
        );
      }
    }
  }
  matches.sort((a, b) => b.score.compareTo(a.score));
  return matches.take(limit).toList();
}
