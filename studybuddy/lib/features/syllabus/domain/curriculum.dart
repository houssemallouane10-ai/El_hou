import 'dart:convert';

import 'package:equatable/equatable.dart';
import 'package:flutter/services.dart';

import '../../../core/constants/algeria_data.dart';

class Lesson extends Equatable {
  const Lesson({
    required this.id,
    required this.title,
    required this.unitTitle,
    required this.subjectId,
    required this.subjectName,
  });

  /// Stable across streams: the same lesson taught in two streams shares its
  /// videos, past papers and summary.
  final String id;
  final String title;
  final String unitTitle;
  final String subjectId;
  final String subjectName;

  @override
  List<Object?> get props => [id, title, unitTitle, subjectId, subjectName];
}

class CurriculumUnit {
  const CurriculumUnit(this.title, this.lessons);

  final String title;
  final List<Lesson> lessons;
}

class Subject {
  const Subject({
    required this.id,
    required this.name,
    required this.icon,
    required this.coefficient,
    required this.units,
  });

  final String id;
  final String name;

  /// A key from the curriculum file, mapped to an icon by the UI.
  final String icon;
  final int coefficient;
  final List<CurriculumUnit> units;

  List<Lesson> get lessons => [for (final u in units) ...u.lessons];
}

/// The official programme per level and stream, loaded from
/// `assets/curriculum/curriculum.json`.
class Curriculum {
  Curriculum._(this._json);

  final Map<String, Object?> _json;

  static const assetPath = 'assets/curriculum/curriculum.json';

  static Future<Curriculum> load([AssetBundle? bundle]) async {
    // Decoded here rather than with loadString, which hands files over 50 KB
    // to a background isolate: a needless hop for a file this size.
    final data = await (bundle ?? rootBundle).load(assetPath);
    final raw = utf8.decode(
      data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
    );
    return Curriculum.fromJson(jsonDecode(raw) as Map<String, Object?>);
  }

  factory Curriculum.fromJson(Map<String, Object?> json) => Curriculum._(json);

  /// The curriculum key for a student: BEM has a single programme.
  static String? trackKey(EducationLevel level, String? streamId) =>
      level == EducationLevel.bem ? 'bem' : streamId;

  /// Subjects for a track, highest coefficient first.
  List<Subject> subjectsFor(String? trackKey) {
    final streams = _json['streams'] as Map<String, Object?>;
    final entries = streams[trackKey] as List<Object?>?;
    if (entries == null) return const [];
    final subjectInfo = _json['subjects'] as Map<String, Object?>;
    final programs = _json['programs'] as Map<String, Object?>;

    final subjects = <Subject>[];
    for (final entry in entries.cast<Map<String, Object?>>()) {
      final id = entry['subject'] as String;
      final info = subjectInfo[id] as Map<String, Object?>;
      final name = info['name'] as String;
      final units = <CurriculumUnit>[];
      for (final programId in (entry['programs'] as List).cast<String>()) {
        for (final unit
            in (programs[programId] as List).cast<Map<String, Object?>>()) {
          final title = unit['unit'] as String;
          units.add(
            CurriculumUnit(title, [
              for (final l in (unit['lessons'] as List).cast<List<Object?>>())
                Lesson(
                  id: l[0] as String,
                  title: l[1] as String,
                  unitTitle: title,
                  subjectId: id,
                  subjectName: name,
                ),
            ]),
          );
        }
      }
      subjects.add(
        Subject(
          id: id,
          name: name,
          icon: info['icon'] as String,
          coefficient: entry['coefficient'] as int,
          units: units,
        ),
      );
    }
    subjects.sort((a, b) => b.coefficient.compareTo(a.coefficient));
    return subjects;
  }

  /// Every track key in the file, for validation.
  Iterable<String> get trackKeys =>
      (_json['streams'] as Map<String, Object?>).keys;
}
