import 'package:equatable/equatable.dart';

enum ReportKind {
  aiSummary('ai_summary'),
  aiGrading('ai_grading'),
  video('video');

  const ReportKind(this.id);

  /// Stored value; must match firestore.rules.
  final String id;
}

enum ReportReason {
  wrong('خطأ علمي أو منهجي'),
  offensive('محتوى مسيء أو غير لائق'),
  other('سبب آخر');

  const ReportReason(this.label);

  final String label;
}

/// A student flagging AI output or a suggested video for review, as Google
/// Play requires for generated and user-shared content.
class ContentReport extends Equatable {
  const ContentReport({
    required this.kind,
    required this.targetId,
    required this.reason,
    this.details = '',
    this.excerpt = '',
  });

  final ReportKind kind;

  /// The lesson id, grading id, or `lessonId/videoId`.
  final String targetId;
  final ReportReason reason;
  final String details;

  /// What the student saw, so editors can judge without reproducing it.
  final String excerpt;

  static const maxDetails = 1000;
  static const maxExcerpt = 4000;

  Map<String, Object?> toMap(String uid) => {
    'uid': uid,
    'kind': kind.id,
    'targetId': targetId,
    'reason': reason.name,
    'details': _cut(details.trim(), maxDetails),
    'excerpt': _cut(excerpt, maxExcerpt),
  };

  static String _cut(String s, int max) =>
      s.length <= max ? s : s.substring(0, max);

  @override
  List<Object?> get props => [kind, targetId, reason, details, excerpt];
}

abstract interface class ReportRepository {
  Future<void> submit(String uid, ContentReport report);
}
