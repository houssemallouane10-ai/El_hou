import 'package:equatable/equatable.dart';

import '../../../core/constants/algeria_data.dart';

/// The educational profile captured during onboarding, stored at
/// `users/{uid}` in Firestore.
class StudentProfile extends Equatable {
  const StudentProfile({
    required this.uid,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.wilayaCode,
    required this.level,
    this.streamId,
  });

  final String uid;
  final String fullName;
  final String email;

  /// International form, e.g. +213550123456.
  final String phone;
  final int wilayaCode;
  final EducationLevel level;

  /// Null for BEM, which has no streams.
  final String? streamId;

  Wilaya? get wilaya => wilayaByCode(wilayaCode);
  StudyStream? get stream => streamById(streamId);

  Map<String, Object?> toMap() => {
    'fullName': fullName,
    'email': email,
    'phone': phone,
    'wilayaCode': wilayaCode,
    'wilayaName': wilaya?.name,
    'level': level.id,
    'streamId': streamId,
  };

  /// Returns null when the stored document is incomplete or from an older
  /// schema, so the student is sent back through onboarding.
  static StudentProfile? fromMap(String uid, Map<String, Object?> map) {
    final level = EducationLevel.fromId(map['level'] as String?);
    final wilayaCode = map['wilayaCode'];
    final fullName = map['fullName'];
    final phone = map['phone'];
    if (level == null ||
        wilayaCode is! int ||
        fullName is! String ||
        phone is! String) {
      return null;
    }
    final streamId = map['streamId'] as String?;
    if (level.hasStreams && streamById(streamId)?.level != level) return null;
    return StudentProfile(
      uid: uid,
      fullName: fullName,
      email: (map['email'] as String?) ?? '',
      phone: phone,
      wilayaCode: wilayaCode,
      level: level,
      streamId: level.hasStreams ? streamId : null,
    );
  }

  @override
  List<Object?> get props => [
    uid,
    fullName,
    email,
    phone,
    wilayaCode,
    level,
    streamId,
  ];
}
