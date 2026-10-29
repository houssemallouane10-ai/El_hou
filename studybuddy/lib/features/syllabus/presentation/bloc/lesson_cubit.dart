import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/ai/ai_client.dart';
import '../../domain/curriculum.dart';
import '../../domain/lesson_content.dart';
import '../../domain/repositories.dart';

class LessonState extends Equatable {
  const LessonState({
    this.content,
    this.contentError = false,
    this.videos,
    this.myVotes = const {},
    this.summary,
    this.summaryLoading = false,
    this.summaryError,
  });

  /// Null while loading.
  final LessonContent? content;
  final bool contentError;

  /// Null while loading.
  final List<LessonVideo>? videos;
  final Map<String, int> myVotes;
  final AiSummary? summary;
  final bool summaryLoading;
  final String? summaryError;

  LessonState copyWith({
    LessonContent? content,
    bool? contentError,
    List<LessonVideo>? videos,
    Map<String, int>? myVotes,
    AiSummary? summary,
    bool? summaryLoading,
    String? Function()? summaryError,
  }) {
    return LessonState(
      content: content ?? this.content,
      contentError: contentError ?? this.contentError,
      videos: videos ?? this.videos,
      myVotes: myVotes ?? this.myVotes,
      summary: summary ?? this.summary,
      summaryLoading: summaryLoading ?? this.summaryLoading,
      summaryError: summaryError != null ? summaryError() : this.summaryError,
    );
  }

  @override
  List<Object?> get props => [
    content,
    contentError,
    videos,
    myVotes,
    summary,
    summaryLoading,
    summaryError,
  ];
}

class LessonCubit extends Cubit<LessonState> {
  LessonCubit({
    required this.lesson,
    required this.uid,
    required this.levelLabel,
    required this._content,
    required this._summaries,
  }) : super(const LessonState()) {
    _load();
  }

  final Lesson lesson;
  final String uid;
  final String levelLabel;
  final LessonContentRepository _content;
  final SummaryService _summaries;
  StreamSubscription<List<LessonVideo>>? _videos;

  bool get canSummarize => _summaries.isAvailable;

  Future<void> _load() async {
    _videos = _content
        .watchTopVideos(lesson.id)
        .listen(
          (v) => emit(state.copyWith(videos: v)),
          onError: (_) => emit(state.copyWith(videos: const [])),
        );
    try {
      final results = await Future.wait([
        _content.fetch(lesson.id),
        _content.myVotes(lesson.id, uid),
      ]);
      if (isClosed) return;
      emit(
        state.copyWith(
          content: results[0] as LessonContent,
          myVotes: results[1] as Map<String, int>,
        ),
      );
    } catch (_) {
      if (!isClosed) {
        emit(state.copyWith(content: LessonContent.empty, contentError: true));
      }
    }
  }

  Future<void> summarize({bool refresh = false}) async {
    if (state.summaryLoading) return;
    emit(state.copyWith(summaryLoading: true, summaryError: () => null));
    try {
      final summary = await _summaries.summarize(
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        subjectName: lesson.subjectName,
        unitTitle: lesson.unitTitle,
        levelLabel: levelLabel,
        refresh: refresh,
      );
      if (!isClosed) {
        emit(state.copyWith(summary: summary, summaryLoading: false));
      }
    } catch (e) {
      final message = e is AiException
          ? e.message
          : AiException.offline.message;
      if (!isClosed) {
        emit(
          state.copyWith(summaryLoading: false, summaryError: () => message),
        );
      }
    }
  }

  /// Tapping the vote you already gave withdraws it.
  Future<void> vote(LessonVideo video, int value) async {
    final current = state.myVotes[video.id] ?? 0;
    final next = current == value ? 0 : value;
    emit(state.copyWith(myVotes: {...state.myVotes, video.id: next}));
    try {
      await _content.vote(
        lessonId: lesson.id,
        videoId: video.id,
        uid: uid,
        value: next,
      );
    } catch (_) {
      if (!isClosed) {
        emit(state.copyWith(myVotes: {...state.myVotes, video.id: current}));
      }
    }
  }

  /// Returns null on success, or an Arabic error message.
  Future<String?> addVideo({
    required String youtubeId,
    required String title,
    required String channel,
  }) async {
    try {
      final added = await _content.addVideo(
        lessonId: lesson.id,
        uid: uid,
        youtubeId: youtubeId,
        title: title.trim(),
        channel: channel.trim(),
      );
      if (!added) return 'هذا الفيديو مقترح من قبل، صوّت له بدل إضافته';
      await vote(
        LessonVideo(
          id: youtubeId,
          youtubeId: youtubeId,
          title: title,
          channel: channel,
        ),
        1,
      );
      return null;
    } catch (_) {
      return 'تعذّرت إضافة الفيديو، تحقق من الاتصال';
    }
  }

  @override
  Future<void> close() {
    _videos?.cancel();
    return super.close();
  }
}
