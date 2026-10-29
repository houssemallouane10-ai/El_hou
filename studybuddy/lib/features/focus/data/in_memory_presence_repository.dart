import 'dart:async';

import '../domain/focus.dart';

/// Presence on this device only (demo mode and tests): the student sees
/// themselves in the room.
class InMemoryPresenceRepository implements PresenceRepository {
  final _rooms = <String, Map<String, int>>{};
  final _changes = StreamController<void>.broadcast();

  RoomPresence _room(String id) {
    final members = _rooms[id] ?? const {};
    return RoomPresence(
      count: members.length,
      wilayas: members.values.toSet().length,
    );
  }

  Map<String, RoomPresence> _all() => {
    for (final id in _rooms.keys) id: _room(id),
  };

  @override
  Stream<Map<String, RoomPresence>> watchAll() async* {
    yield _all();
    yield* _changes.stream.map((_) => _all());
  }

  @override
  Stream<RoomPresence> watchRoom(String roomId) async* {
    yield _room(roomId);
    yield* _changes.stream.map((_) => _room(roomId));
  }

  @override
  Future<PresenceSession> join({
    required String roomId,
    required String uid,
    required int wilayaCode,
  }) async {
    _rooms.putIfAbsent(roomId, () => {})[uid] = wilayaCode;
    _changes.add(null);
    return _Session(() {
      _rooms[roomId]?.remove(uid);
      _changes.add(null);
    });
  }

  @override
  Stream<Duration> get serverTimeOffset => Stream.value(Duration.zero);
}

class _Session implements PresenceSession {
  _Session(this._onLeave);

  final void Function() _onLeave;
  var _left = false;

  @override
  Future<void> leave() async {
    if (_left) return;
    _left = true;
    _onLeave();
  }
}
