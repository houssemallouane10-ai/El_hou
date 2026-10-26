import 'package:equatable/equatable.dart';

class FocusRoom {
  const FocusRoom(this.id, this.name, this.icon, {this.subjectIds = const {}});

  final String id;
  final String name;

  /// A subject icon key (see subjectIcon).
  final String icon;

  /// Subjects this room suits, to suggest it to the student.
  final Set<String> subjectIds;
}

/// Rooms are per subject so students revise alongside others on the same
/// material. Ids must match the Realtime Database rules.
const focusRooms = <FocusRoom>[
  FocusRoom(
    'math',
    'الرياضيات',
    'math',
    subjectIds: {'math', 'u_analysis', 'u_algebra', 'u_proba'},
  ),
  FocusRoom(
    'physics',
    'الفيزياء والكيمياء',
    'physics',
    subjectIds: {'physics', 'u_physics', 'u_chemistry', 'tech_proc'},
  ),
  FocusRoom(
    'svt',
    'العلوم الطبيعية',
    'biology',
    subjectIds: {'svt', 'u_biology', 'u_anatomy', 'u_biochem'},
  ),
  FocusRoom(
    'philosophy',
    'الفلسفة والأدب العربي',
    'philosophy',
    subjectIds: {'philosophy', 'arabic'},
  ),
  FocusRoom(
    'memorize',
    'التاريخ والجغرافيا والشريعة',
    'history',
    subjectIds: {'history_geo', 'islamic'},
  ),
  FocusRoom(
    'languages',
    'اللغات الأجنبية',
    'language',
    subjectIds: {'french', 'english', 'lang3'},
  ),
  FocusRoom(
    'technology',
    'التكنولوجيا والهندسة',
    'engineering',
    subjectIds: {'tech_civil', 'tech_mech', 'tech_elec'},
  ),
  FocusRoom(
    'gestion',
    'التسيير والاقتصاد والقانون',
    'finance',
    subjectIds: {'accounting', 'economics', 'law', 'u_econ'},
  ),
  FocusRoom('general', 'مراجعة حرة', 'general'),
];

FocusRoom? focusRoomById(String id) {
  for (final r in focusRooms) {
    if (r.id == id) return r;
  }
  return null;
}

enum FocusPhase { focus, rest }

class PomodoroMoment extends Equatable {
  const PomodoroMoment(this.phase, this.remaining, this.phaseLength);

  final FocusPhase phase;
  final Duration remaining;
  final Duration phaseLength;

  double get elapsedFraction =>
      1 - remaining.inMilliseconds / phaseLength.inMilliseconds;

  @override
  List<Object?> get props => [phase, remaining.inSeconds, phaseLength];
}

/// One clock for everyone: cycles start every half hour (25 minutes of
/// focus, then 5 of rest), so every student in a room sees the same timer
/// without any server coordinating it.
abstract final class SharedPomodoro {
  static const focus = Duration(minutes: 25);
  static const rest = Duration(minutes: 5);
  static final cycle = focus + rest;

  static PomodoroMoment at(DateTime now) {
    final into = Duration(
      milliseconds: now.millisecondsSinceEpoch % cycle.inMilliseconds,
    );
    return into < focus
        ? PomodoroMoment(FocusPhase.focus, focus - into, focus)
        : PomodoroMoment(FocusPhase.rest, cycle - into, rest);
  }
}

class RoomPresence extends Equatable {
  const RoomPresence({this.count = 0, this.wilayas = 0});

  final int count;

  /// How many different wilayas the students come from.
  final int wilayas;

  @override
  List<Object?> get props => [count, wilayas];
}

abstract interface class PresenceSession {
  Future<void> leave();
}

abstract interface class PresenceRepository {
  /// Live head-counts for every room, keyed by room id.
  Stream<Map<String, RoomPresence>> watchAll();

  Stream<RoomPresence> watchRoom(String roomId);

  /// Marks the student present until [PresenceSession.leave] or until the
  /// connection drops.
  Future<PresenceSession> join({
    required String roomId,
    required String uid,
    required int wilayaCode,
  });

  /// Server clock minus device clock, so every device shows the same timer.
  Stream<Duration> get serverTimeOffset;
}
