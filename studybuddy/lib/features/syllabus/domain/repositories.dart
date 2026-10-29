import 'lesson_content.dart';
import 'progress.dart';

abstract interface class ProgressRepository {
  Stream<StudyProgress> watch(String uid);
  Future<void> setStatus(String uid, String lessonId, LessonStatus status);
  Future<void> setExamDate(String uid, DateTime date);

  /// Removes every status and the exam date, when the account is deleted.
  Future<void> deleteAll(String uid);
}

abstract interface class LessonContentRepository {
  /// Curated summary and past papers; [LessonContent.empty] if none yet.
  Future<LessonContent> fetch(String lessonId);

  /// The best-rated videos, highest score first.
  Stream<List<LessonVideo>> watchTopVideos(String lessonId, {int limit = 3});

  /// The current student's votes on this lesson's videos: videoId → ±1.
  Future<Map<String, int>> myVotes(String lessonId, String uid);

  /// Returns false when the video was already suggested for this lesson.
  Future<bool> addVideo({
    required String lessonId,
    required String uid,
    required String youtubeId,
    required String title,
    required String channel,
  });

  /// Sets the student's vote to [value] (1, -1, or 0 to withdraw it).
  Future<void> vote({
    required String lessonId,
    required String videoId,
    required String uid,
    required int value,
  });
}

abstract interface class SummaryService {
  bool get isAvailable;

  /// Returns a cached summary when there is one. Throws [AiException].
  Future<AiSummary> summarize({
    required String lessonId,
    required String lessonTitle,
    required String subjectName,
    required String unitTitle,
    required String levelLabel,
    bool refresh = false,
  });
}
