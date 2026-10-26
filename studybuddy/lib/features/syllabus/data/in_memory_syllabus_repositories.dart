import 'dart:async';

import '../domain/lesson_content.dart';
import '../domain/progress.dart';
import '../domain/repositories.dart';

class InMemoryProgressRepository implements ProgressRepository {
  final _progress = <String, StudyProgress>{};
  final _controller = StreamController<String>.broadcast();

  @override
  Stream<StudyProgress> watch(String uid) async* {
    yield _progress[uid] ?? const StudyProgress();
    yield* _controller.stream
        .where((changed) => changed == uid)
        .map((_) => _progress[uid] ?? const StudyProgress());
  }

  @override
  Future<void> setStatus(
    String uid,
    String lessonId,
    LessonStatus status,
  ) async {
    _progress[uid] = (_progress[uid] ?? const StudyProgress()).withStatus(
      lessonId,
      status,
    );
    _controller.add(uid);
  }

  @override
  Future<void> setExamDate(String uid, DateTime date) async {
    _progress[uid] = (_progress[uid] ?? const StudyProgress()).withExamDate(
      date,
    );
    _controller.add(uid);
  }
}

class InMemoryLessonContentRepository implements LessonContentRepository {
  InMemoryLessonContentRepository({Map<String, LessonContent>? content})
    : _content = content ?? {};

  final Map<String, LessonContent> _content;
  final _videos = <String, Map<String, LessonVideo>>{};
  final _votes = <String, int>{};
  final _changes = StreamController<String>.broadcast();

  @override
  Future<LessonContent> fetch(String lessonId) async =>
      _content[lessonId] ?? LessonContent.empty;

  List<LessonVideo> _top(String lessonId, int limit) {
    final list = [...?_videos[lessonId]?.values]
      ..sort((a, b) => b.score.compareTo(a.score));
    return list.take(limit).toList();
  }

  @override
  Stream<List<LessonVideo>> watchTopVideos(
    String lessonId, {
    int limit = 3,
  }) async* {
    yield _top(lessonId, limit);
    yield* _changes.stream
        .where((id) => id == lessonId)
        .map((_) => _top(lessonId, limit));
  }

  @override
  Future<Map<String, int>> myVotes(String lessonId, String uid) async => {
    for (final videoId in _videos[lessonId]?.keys ?? const <String>[])
      if (_votes['$lessonId/$videoId/$uid'] case final int v) videoId: v,
  };

  @override
  Future<bool> addVideo({
    required String lessonId,
    required String uid,
    required String youtubeId,
    required String title,
    required String channel,
  }) async {
    final videos = _videos.putIfAbsent(lessonId, () => {});
    if (videos.containsKey(youtubeId)) return false;
    videos[youtubeId] = LessonVideo(
      id: youtubeId,
      youtubeId: youtubeId,
      title: title,
      channel: channel,
    );
    _changes.add(lessonId);
    return true;
  }

  @override
  Future<void> vote({
    required String lessonId,
    required String videoId,
    required String uid,
    required int value,
  }) async {
    final video = _videos[lessonId]?[videoId];
    if (video == null) return;
    final key = '$lessonId/$videoId/$uid';
    final before = _votes[key] ?? 0;
    if (before == value) return;
    _videos[lessonId]![videoId] = LessonVideo(
      id: video.id,
      youtubeId: video.youtubeId,
      title: video.title,
      channel: video.channel,
      up: video.up + (value == 1 ? 1 : 0) - (before == 1 ? 1 : 0),
      down: video.down + (value == -1 ? 1 : 0) - (before == -1 ? 1 : 0),
    );
    if (value == 0) {
      _votes.remove(key);
    } else {
      _votes[key] = value;
    }
    _changes.add(lessonId);
  }
}
