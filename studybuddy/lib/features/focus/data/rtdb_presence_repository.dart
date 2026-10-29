import 'dart:async';

import 'package:firebase_database/firebase_database.dart';

import '../domain/focus.dart';

/// Presence in the Realtime Database, which (unlike Firestore) can remove a
/// student's entry by itself when their connection drops:
/// `presence/{roomId}/{uid} = {wilaya, joinedAt}`.
class RtdbPresenceRepository implements PresenceRepository {
  RtdbPresenceRepository([FirebaseDatabase? database])
    : _db = database ?? FirebaseDatabase.instance;

  final FirebaseDatabase _db;

  static RoomPresence _summarize(Object? room) {
    if (room is! Map) return const RoomPresence();
    final wilayas = <Object?>{};
    for (final entry in room.values) {
      if (entry is Map) wilayas.add(entry['wilaya']);
    }
    return RoomPresence(count: room.length, wilayas: wilayas.length);
  }

  @override
  Stream<Map<String, RoomPresence>> watchAll() =>
      _db.ref('presence').onValue.map((event) {
        final value = event.snapshot.value;
        if (value is! Map) return const {};
        return {
          for (final e in value.entries) e.key as String: _summarize(e.value),
        };
      });

  @override
  Stream<RoomPresence> watchRoom(String roomId) => _db
      .ref('presence/$roomId')
      .onValue
      .map((event) => _summarize(event.snapshot.value));

  @override
  Future<PresenceSession> join({
    required String roomId,
    required String uid,
    required int wilayaCode,
  }) async {
    final ref = _db.ref('presence/$roomId/$uid');
    // Re-registers after every reconnect, the standard presence pattern:
    // arm the server-side removal first, then write the entry.
    final subscription = _db.ref('.info/connected').onValue.listen((
      event,
    ) async {
      if (event.snapshot.value != true) return;
      await ref.onDisconnect().remove();
      await ref.set({'wilaya': wilayaCode, 'joinedAt': ServerValue.timestamp});
    });
    return _RtdbSession(ref, subscription);
  }

  @override
  Stream<Duration> get serverTimeOffset => _db
      .ref('.info/serverTimeOffset')
      .onValue
      .map(
        (e) => Duration(milliseconds: (e.snapshot.value as num? ?? 0).round()),
      );
}

class _RtdbSession implements PresenceSession {
  _RtdbSession(this._ref, this._subscription);

  final DatabaseReference _ref;
  final StreamSubscription<DatabaseEvent> _subscription;

  @override
  Future<void> leave() async {
    await _subscription.cancel();
    await _ref.onDisconnect().cancel();
    await _ref.remove();
  }
}
