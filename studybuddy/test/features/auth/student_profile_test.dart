import 'package:dz_studybuddy/core/constants/algeria_data.dart';
import 'package:dz_studybuddy/features/auth/domain/student_profile.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const profile = StudentProfile(
    uid: 'u1',
    fullName: 'أمينة بن علي',
    email: 'amina@example.dz',
    phone: '+213550123456',
    wilayaCode: 31,
    level: EducationLevel.bac,
    streamId: 'math',
  );

  test('round-trips through a Firestore map', () {
    final map = profile.toMap();
    expect(map['wilayaName'], 'وهران');
    expect(StudentProfile.fromMap('u1', map), profile);
  });

  test('treats incomplete or inconsistent documents as not onboarded', () {
    final map = profile.toMap();
    expect(StudentProfile.fromMap('u1', {...map, 'level': null}), isNull);
    expect(StudentProfile.fromMap('u1', {...map, 'streamId': 'st'}), isNull);
    expect(StudentProfile.fromMap('u1', {...map, 'wilayaCode': '31'}), isNull);
  });

  test('BEM profiles have no stream', () {
    final map = {...profile.toMap(), 'level': 'bem'};
    expect(StudentProfile.fromMap('u1', map)?.streamId, isNull);
  });

  test('every wilaya code from 1 to 58 is present once', () {
    expect(wilayas.map((w) => w.code), List.generate(58, (i) => i + 1));
  });
}
