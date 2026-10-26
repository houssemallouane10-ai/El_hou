import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../domain/grader_repositories.dart';
import '../domain/grading.dart';

/// `users/{uid}/gradings/{id}`. The photos are not stored: only the verdict.
class FirestoreGradingHistoryRepository implements GradingHistoryRepository {
  FirestoreGradingHistoryRepository([FirebaseFirestore? firestore])
    : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> _col(String uid) =>
      _db.collection('users').doc(uid).collection('gradings');

  @override
  Stream<List<GradingRecord>> watch(String uid, {int limit = 30}) => _col(uid)
      .orderBy('createdAt', descending: true)
      .limit(limit)
      .snapshots()
      .map(
        (s) => [
          for (final d in s.docs)
            GradingRecord(
              id: d.id,
              subjectId: d['subjectId'] as String,
              subjectName: d['subjectName'] as String,
              lessonTitle: d.data()['lessonTitle'] as String?,
              createdAt:
                  (d.data()['createdAt'] as Timestamp?)?.toDate() ??
                  DateTime.now(),
              result: GradingResult.fromJson(
                Map<String, Object?>.from(d['result'] as Map),
              ),
            ),
        ],
      );

  @override
  Future<void> save(String uid, GradingRecord record) =>
      _col(uid).doc(record.id).set({
        'subjectId': record.subjectId,
        'subjectName': record.subjectName,
        'lessonTitle': record.lessonTitle,
        'createdAt': FieldValue.serverTimestamp(),
        'result': record.result.toJson(),
      });

  @override
  Future<void> deleteAll(String uid) async {
    final docs = await _col(uid).get();
    await Future.wait([for (final d in docs.docs) d.reference.delete()]);
  }
}

class InMemoryGradingHistoryRepository implements GradingHistoryRepository {
  final _records = <String, List<GradingRecord>>{};
  final _changes = StreamController<String>.broadcast();

  List<GradingRecord> _list(String uid, int limit) =>
      (_records[uid] ?? const []).take(limit).toList();

  @override
  Stream<List<GradingRecord>> watch(String uid, {int limit = 30}) async* {
    yield _list(uid, limit);
    yield* _changes.stream.where((u) => u == uid).map((_) => _list(uid, limit));
  }

  @override
  Future<void> save(String uid, GradingRecord record) async {
    _records.putIfAbsent(uid, () => []).insert(0, record);
    _changes.add(uid);
  }

  @override
  Future<void> deleteAll(String uid) async {
    _records.remove(uid);
    _changes.add(uid);
  }
}
