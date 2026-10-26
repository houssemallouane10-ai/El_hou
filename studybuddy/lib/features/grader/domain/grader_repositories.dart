import '../../../core/ai/ai_client.dart';
import 'grading.dart';

/// What the student sends for grading.
class GradingRequest {
  const GradingRequest({
    required this.answerPages,
    required this.subjectName,
    required this.levelLabel,
    this.lessonTitle,
    this.questionText,
    this.questionImage,
    this.maxMark,
  });

  final List<AiImage> answerPages;
  final String subjectName;
  final String levelLabel;
  final String? lessonTitle;
  final String? questionText;
  final AiImage? questionImage;

  /// The points the question is worth, when the student knows it.
  final double? maxMark;
}

abstract interface class HomeworkGrader {
  bool get isAvailable;

  /// Throws [AiException].
  Future<GradingResult> grade(GradingRequest request);
}

abstract interface class GradingHistoryRepository {
  /// Newest first.
  Stream<List<GradingRecord>> watch(String uid, {int limit = 30});

  Future<void> save(String uid, GradingRecord record);
}
