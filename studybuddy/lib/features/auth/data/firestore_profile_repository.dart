import 'package:cloud_firestore/cloud_firestore.dart';

import '../domain/auth_repository.dart';
import '../domain/student_profile.dart';

/// Stores profiles at `users/{uid}`; see firestore.rules for who may read
/// and write them.
class FirestoreProfileRepository implements ProfileRepository {
  FirestoreProfileRepository([FirebaseFirestore? firestore])
    : _users = (firestore ?? FirebaseFirestore.instance).collection('users');

  final CollectionReference<Map<String, dynamic>> _users;

  @override
  Future<StudentProfile?> fetch(String uid) async {
    final snapshot = await _users.doc(uid).get();
    final data = snapshot.data();
    return data == null ? null : StudentProfile.fromMap(uid, data);
  }

  @override
  Future<void> save(StudentProfile profile) async {
    final doc = _users.doc(profile.uid);
    final exists = (await doc.get()).exists;
    await doc.set({
      ...profile.toMap(),
      if (!exists) 'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  @override
  Future<void> delete(String uid) => _users.doc(uid).delete();
}
