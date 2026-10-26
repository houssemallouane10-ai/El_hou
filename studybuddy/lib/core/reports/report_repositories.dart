import 'package:cloud_firestore/cloud_firestore.dart';

import 'content_report.dart';

/// `reports/{id}`: students can only create; editors (admin claim) read.
class FirestoreReportRepository implements ReportRepository {
  FirestoreReportRepository([FirebaseFirestore? firestore])
    : _reports = (firestore ?? FirebaseFirestore.instance).collection(
        'reports',
      );

  final CollectionReference<Map<String, dynamic>> _reports;

  @override
  Future<void> submit(String uid, ContentReport report) => _reports.add({
    ...report.toMap(uid),
    'createdAt': FieldValue.serverTimestamp(),
  });
}

class InMemoryReportRepository implements ReportRepository {
  final reports = <({String uid, ContentReport report})>[];

  @override
  Future<void> submit(String uid, ContentReport report) async =>
      reports.add((uid: uid, report: report));
}
