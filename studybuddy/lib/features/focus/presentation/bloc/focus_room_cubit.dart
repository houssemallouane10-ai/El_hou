import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/focus.dart';

class FocusRoomState extends Equatable {
  const FocusRoomState({
    required this.room,
    required this.moment,
    this.presence = const RoomPresence(),
    this.focusedSeconds = 0,
    this.joined = false,
    this.error,
  });

  final FocusRoom room;
  final PomodoroMoment moment;
  final RoomPresence presence;

  /// Focus-phase seconds spent in the room during this visit.
  final int focusedSeconds;
  final bool joined;
  final String? error;

  FocusRoomState copyWith({
    PomodoroMoment? moment,
    RoomPresence? presence,
    int? focusedSeconds,
    bool? joined,
    String? error,
  }) {
    return FocusRoomState(
      room: room,
      moment: moment ?? this.moment,
      presence: presence ?? this.presence,
      focusedSeconds: focusedSeconds ?? this.focusedSeconds,
      joined: joined ?? this.joined,
      error: error ?? this.error,
    );
  }

  @override
  List<Object?> get props => [
    room,
    moment,
    presence,
    focusedSeconds,
    joined,
    error,
  ];
}

/// Keeps the student present in a room and drives the shared timer.
class FocusRoomCubit extends Cubit<FocusRoomState> {
  FocusRoomCubit({
    required FocusRoom room,
    required String uid,
    required int wilayaCode,
    required this._presence,
    DateTime Function()? clock,
    Duration tick = const Duration(seconds: 1),
  }) : _clock = clock ?? DateTime.now,
       super(
         FocusRoomState(
           room: room,
           moment: SharedPomodoro.at((clock ?? DateTime.now)()),
         ),
       ) {
    _start(uid, wilayaCode, tick);
  }

  final PresenceRepository _presence;
  final DateTime Function() _clock;
  final _subscriptions = <StreamSubscription<Object?>>[];
  Timer? _timer;
  PresenceSession? _session;
  var _offset = Duration.zero;

  Future<void> _start(String uid, int wilayaCode, Duration tick) async {
    _subscriptions.addAll([
      _presence.serverTimeOffset.listen((o) => _offset = o, onError: (_) {}),
      _presence
          .watchRoom(state.room.id)
          .listen((p) => emit(state.copyWith(presence: p)), onError: (_) {}),
    ]);
    _timer = Timer.periodic(tick, (_) => _tick());
    try {
      final session = await _presence.join(
        roomId: state.room.id,
        uid: uid,
        wilayaCode: wilayaCode,
      );
      if (isClosed) {
        await session.leave();
        return;
      }
      _session = session;
      emit(state.copyWith(joined: true));
    } catch (_) {
      if (!isClosed) {
        emit(
          state.copyWith(error: 'تعذّر الاتصال بالغرفة، المؤقت يعمل محلياً'),
        );
      }
    }
  }

  void _tick() {
    final moment = SharedPomodoro.at(_clock().add(_offset));
    emit(
      state.copyWith(
        moment: moment,
        focusedSeconds:
            state.focusedSeconds + (moment.phase == FocusPhase.focus ? 1 : 0),
      ),
    );
  }

  @override
  Future<void> close() async {
    _timer?.cancel();
    // Free the seat first; the streams can wind down on their own.
    for (final s in _subscriptions) {
      unawaited(s.cancel());
    }
    await _session?.leave();
    return super.close();
  }
}
