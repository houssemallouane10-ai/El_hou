import 'package:equatable/equatable.dart';

/// A BAC exam exercise in which a lesson appeared.
class PastPaper extends Equatable {
  const PastPaper({
    required this.year,
    required this.title,
    this.subjectUrl,
    this.solutionUrl,
  });

  final int year;

  /// e.g. "الموضوع الأول · التمرين الثاني".
  final String title;
  final Uri? subjectUrl;
  final Uri? solutionUrl;

  static PastPaper? fromMap(Map<String, Object?> map) {
    final year = map['year'];
    final title = map['title'];
    if (year is! int || title is! String) return null;
    return PastPaper(
      year: year,
      title: title,
      subjectUrl: Uri.tryParse(map['subjectUrl'] as String? ?? ''),
      solutionUrl: Uri.tryParse(map['solutionUrl'] as String? ?? ''),
    );
  }

  @override
  List<Object?> get props => [year, title, subjectUrl, solutionUrl];
}

/// Curated content for a lesson, from `lessons/{lessonId}` in Firestore.
class LessonContent extends Equatable {
  const LessonContent({
    this.summary,
    this.summaryPdfUrl,
    this.pastPapers = const [],
  });

  /// A teacher-reviewed summary as plain paragraphs.
  final String? summary;
  final Uri? summaryPdfUrl;

  /// Newest first.
  final List<PastPaper> pastPapers;

  static const empty = LessonContent();

  factory LessonContent.fromMap(Map<String, Object?> map) {
    final papers = [
      for (final p in (map['pastPapers'] as List? ?? const []))
        if (p is Map<String, Object?>) PastPaper.fromMap(p),
    ].whereType<PastPaper>().toList()..sort((a, b) => b.year.compareTo(a.year));
    final pdf = map['summaryPdfUrl'] as String?;
    return LessonContent(
      summary: map['summary'] as String?,
      summaryPdfUrl: pdf == null ? null : Uri.tryParse(pdf),
      pastPapers: papers,
    );
  }

  @override
  List<Object?> get props => [summary, summaryPdfUrl, pastPapers];
}

/// A YouTube lesson explanation suggested and rated by students.
class LessonVideo extends Equatable {
  const LessonVideo({
    required this.id,
    required this.youtubeId,
    required this.title,
    required this.channel,
    this.up = 0,
    this.down = 0,
  });

  final String id;
  final String youtubeId;
  final String title;
  final String channel;
  final int up;
  final int down;

  int get score => up - down;

  Uri get watchUrl => Uri.https('www.youtube.com', '/watch', {'v': youtubeId});
  Uri get thumbnailUrl =>
      Uri.https('img.youtube.com', '/vi/$youtubeId/mqdefault.jpg');

  static LessonVideo? fromMap(String id, Map<String, Object?> map) {
    final youtubeId = map['youtubeId'];
    final title = map['title'];
    if (youtubeId is! String || title is! String) return null;
    return LessonVideo(
      id: id,
      youtubeId: youtubeId,
      title: title,
      channel: map['channel'] as String? ?? '',
      up: map['up'] as int? ?? 0,
      down: map['down'] as int? ?? 0,
    );
  }

  @override
  List<Object?> get props => [id, youtubeId, title, channel, up, down];
}

/// Extracts the 11-character video id from the YouTube URL forms students
/// paste: watch?v=, youtu.be/, shorts/, embed/ and live/.
String? parseYoutubeId(String input) {
  final uri = Uri.tryParse(input.trim());
  if (uri == null || uri.host.isEmpty) return null;
  final host = uri.host.replaceFirst(RegExp(r'^(www\.|m\.)'), '');
  String? id;
  if (host == 'youtu.be') {
    id = uri.pathSegments.firstOrNull;
  } else if (host == 'youtube.com' || host == 'music.youtube.com') {
    final segments = uri.pathSegments;
    if (segments.firstOrNull == 'watch') {
      id = uri.queryParameters['v'];
    } else if (segments.length >= 2 &&
        const {'shorts', 'embed', 'live'}.contains(segments.first)) {
      id = segments[1];
    }
  }
  return id != null && RegExp(r'^[A-Za-z0-9_-]{11}$').hasMatch(id) ? id : null;
}

/// The "5-minute summary" generated for a lesson.
class AiSummary extends Equatable {
  const AiSummary({
    required this.keyPoints,
    this.definitions = const [],
    this.formulas = const [],
    this.examTips = const [],
    this.commonMistakes = const [],
  });

  final List<String> keyPoints;
  final List<({String term, String meaning})> definitions;
  final List<String> formulas;
  final List<String> examTips;
  final List<String> commonMistakes;

  static List<String> _strings(Object? value) => [
    for (final v in (value as List? ?? const []))
      if (v is String) v,
  ];

  factory AiSummary.fromJson(Map<String, Object?> json) => AiSummary(
    keyPoints: _strings(json['keyPoints']),
    definitions: [
      for (final d in (json['definitions'] as List? ?? const []))
        if (d case {'term': final String term, 'meaning': final String meaning})
          (term: term, meaning: meaning),
    ],
    formulas: _strings(json['formulas']),
    examTips: _strings(json['examTips']),
    commonMistakes: _strings(json['commonMistakes']),
  );

  Map<String, Object?> toJson() => {
    'keyPoints': keyPoints,
    'definitions': [
      for (final d in definitions) {'term': d.term, 'meaning': d.meaning},
    ],
    'formulas': formulas,
    'examTips': examTips,
    'commonMistakes': commonMistakes,
  };

  @override
  List<Object?> get props => [
    keyPoints,
    definitions,
    formulas,
    examTips,
    commonMistakes,
  ];
}
