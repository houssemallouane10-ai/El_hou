import 'package:cloud_firestore/cloud_firestore.dart';

import '../domain/progress.dart';
import '../domain/repositories.dart';

/// One document per student, `users/{uid}/meta/progress`:
/// `{lessons: {lessonId: status}, examDate: Timestamp}`.
class FirestoreProgressRepository implements ProgressRepository {
  FirestoreProgressRepository([FirebaseFirestore? firestore])
    : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  DocumentReference<Map<String, dynamic>> _doc(String uid) =>
      _db.collection('users').doc(uid).collection('meta').doc('progress');

  @override
  Stream<StudyProgress> watch(String uid) => _doc(uid).snapshots().map((s) {
    final data = s.data() ?? const {};
    final lessons = (data['lessons'] as Map?) ?? const {};
    return StudyProgress(
      statuses: {
        for (final e in lessons.entries)
          if (LessonStatus.fromName(e.value as String?) != LessonStatus.todo)
            e.key as String: LessonStatus.fromName(e.value as String?),
      },
      examDate: (data['examDate'] as Timestamp?)?.toDate(),
    );
  });

  @override
  Future<void> setStatus(String uid, String lessonId, LessonStatus status) {
    // FieldPath, because lesson ids may contain characters that a dotted
    // path string would misread.
    return _doc(uid).set(
      {
        'lessons': {
          lessonId: status == LessonStatus.todo
              ? FieldValue.delete()
              : status.name,
        },
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(
        mergeFields: [
          FieldPath(['lessons', lessonId]),
          'updatedAt',
        ],
      ),
    );
  }

  @override
  Future<void> setExamDate(String uid, DateTime date) => _doc(uid).set({
    'examDate': Timestamp.fromDate(date),
    'updatedAt': FieldValue.serverTimestamp(),
  }, SetOptions(merge: true));
}
