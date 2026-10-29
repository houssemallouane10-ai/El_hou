import 'package:cloud_firestore/cloud_firestore.dart';

import '../domain/lesson_content.dart';
import '../domain/repositories.dart';

/// `lessons/{lessonId}` holds curated content (written by admins);
/// `lessons/{lessonId}/videos/{youtubeId}` holds student suggestions with
/// vote counters, and `…/votes/{uid}` each student's vote. See
/// firestore.rules for how the counters are kept honest.
class FirestoreLessonContentRepository implements LessonContentRepository {
  FirestoreLessonContentRepository([FirebaseFirestore? firestore])
    : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  DocumentReference<Map<String, dynamic>> _lesson(String id) =>
      _db.collection('lessons').doc(id);

  CollectionReference<Map<String, dynamic>> _videos(String lessonId) =>
      _lesson(lessonId).collection('videos');

  @override
  Future<LessonContent> fetch(String lessonId) async {
    final data = (await _lesson(lessonId).get()).data();
    return data == null ? LessonContent.empty : LessonContent.fromMap(data);
  }

  @override
  Stream<List<LessonVideo>> watchTopVideos(String lessonId, {int limit = 3}) =>
      _videos(lessonId)
          .orderBy('score', descending: true)
          .limit(limit)
          .snapshots()
          .map(
            (s) =>
                [for (final d in s.docs) LessonVideo.fromMap(d.id, d.data())]
                    .whereType<LessonVideo>()
                    .toList(),
          );

  @override
  Future<Map<String, int>> myVotes(String lessonId, String uid) async {
    final top = await _videos(lessonId)
        .orderBy('score', descending: true)
        .limit(10)
        .get();
    final votes = await Future.wait([
      for (final d in top.docs) d.reference.collection('votes').doc(uid).get(),
    ]);
    return {
      for (final v in votes)
        if (v.data()?['value'] case final int value)
          v.reference.parent.parent!.id: value,
    };
  }

  @override
  Future<bool> addVideo({
    required String lessonId,
    required String uid,
    required String youtubeId,
    required String title,
    required String channel,
  }) {
    final ref = _videos(lessonId).doc(youtubeId);
    return _db.runTransaction((tx) async {
      if ((await tx.get(ref)).exists) return false;
      tx.set(ref, {
        'youtubeId': youtubeId,
        'title': title,
        'channel': channel,
        'addedBy': uid,
        'addedAt': FieldValue.serverTimestamp(),
        'up': 0,
        'down': 0,
        'score': 0,
      });
      return true;
    });
  }

  @override
  Future<void> vote({
    required String lessonId,
    required String videoId,
    required String uid,
    required int value,
  }) {
    final videoRef = _videos(lessonId).doc(videoId);
    final voteRef = videoRef.collection('votes').doc(uid);
    return _db.runTransaction((tx) async {
      final video = await tx.get(videoRef);
      if (!video.exists) return;
      final before = (await tx.get(voteRef)).data()?['value'] as int? ?? 0;
      if (before == value) return;
      final up =
          (video.data()!['up'] as int? ?? 0) +
          (value == 1 ? 1 : 0) -
          (before == 1 ? 1 : 0);
      final down =
          (video.data()!['down'] as int? ?? 0) +
          (value == -1 ? 1 : 0) -
          (before == -1 ? 1 : 0);
      tx.update(videoRef, {'up': up, 'down': down, 'score': up - down});
      if (value == 0) {
        tx.delete(voteRef);
      } else {
        tx.set(voteRef, {'value': value});
      }
    });
  }
}
