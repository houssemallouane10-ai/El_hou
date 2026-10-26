import '../../features/audio_bank/data/audio_libraries.dart';
import '../../features/audio_bank/domain/audio_track.dart';
import '../../features/auth/data/firebase_auth_repository.dart';
import '../../features/auth/data/firestore_profile_repository.dart';
import '../../features/auth/data/in_memory_repositories.dart';
import '../../features/auth/domain/auth_repository.dart';
import '../../features/focus/data/in_memory_presence_repository.dart';
import '../../features/focus/data/rtdb_presence_repository.dart';
import '../../features/focus/domain/focus.dart';
import '../../features/grader/data/ai_homework_grader.dart';
import '../../features/grader/data/grading_history_repositories.dart';
import '../../features/grader/domain/grader_repositories.dart';
import '../../features/syllabus/data/ai_summary_service.dart';
import '../../features/syllabus/data/firestore_lesson_content_repository.dart';
import '../../features/syllabus/data/firestore_progress_repository.dart';
import '../../features/syllabus/data/in_memory_syllabus_repositories.dart';
import '../../features/syllabus/domain/curriculum.dart';
import '../../features/syllabus/domain/repositories.dart';
import '../ai/ai_client.dart';
import '../audio/playback.dart';
import '../reports/content_report.dart';
import '../reports/report_repositories.dart';

/// Every service the app uses, built once at startup: Firebase-backed in
/// production, device-only in demo mode and tests.
class AppDependencies {
  AppDependencies({
    required this.auth,
    required this.profiles,
    required this.progress,
    required this.lessonContent,
    required this.summaries,
    required this.grader,
    required this.gradingHistory,
    required this.presence,
    required this.audioLibrary,
    required this.reports,
    required this.playback,
    required this.loadCurriculum,
    this.demoMode = false,
  });

  factory AppDependencies.firebase({
    required AiClient ai,
    required PlaybackService playback,
  }) {
    return AppDependencies(
      auth: FirebaseAuthRepository(),
      profiles: FirestoreProfileRepository(),
      progress: FirestoreProgressRepository(),
      lessonContent: FirestoreLessonContentRepository(),
      summaries: AiSummaryService(ai),
      grader: AiHomeworkGrader(ai),
      gradingHistory: FirestoreGradingHistoryRepository(),
      presence: RtdbPresenceRepository(),
      audioLibrary: CombinedAudioLibrary([
        FirestoreAudioLibrary(),
        AssetAudioLibrary(),
      ]),
      reports: FirestoreReportRepository(),
      playback: playback,
      loadCurriculum: _cachedCurriculum(),
    );
  }

  factory AppDependencies.demo({
    required AiClient ai,
    required PlaybackService playback,
    SummaryService? summaries,
  }) {
    return AppDependencies(
      auth: InMemoryAuthRepository(),
      profiles: InMemoryProfileRepository(),
      progress: InMemoryProgressRepository(),
      lessonContent: InMemoryLessonContentRepository(),
      summaries: summaries ?? AiSummaryService(ai),
      grader: AiHomeworkGrader(ai),
      gradingHistory: InMemoryGradingHistoryRepository(),
      presence: InMemoryPresenceRepository(),
      audioLibrary: AssetAudioLibrary(),
      reports: InMemoryReportRepository(),
      playback: playback,
      loadCurriculum: _cachedCurriculum(),
      demoMode: true,
    );
  }

  final AuthRepository auth;
  final ProfileRepository profiles;
  final ProgressRepository progress;
  final LessonContentRepository lessonContent;
  final SummaryService summaries;
  final HomeworkGrader grader;
  final GradingHistoryRepository gradingHistory;
  final PresenceRepository presence;
  final AudioLibraryRepository audioLibrary;
  final ReportRepository reports;
  final PlaybackService playback;
  final Future<Curriculum> Function() loadCurriculum;
  final bool demoMode;

  /// The curriculum file is parsed once and shared.
  static Future<Curriculum> Function() _cachedCurriculum() {
    Future<Curriculum>? loaded;
    return () => loaded ??= Curriculum.load();
  }
}
