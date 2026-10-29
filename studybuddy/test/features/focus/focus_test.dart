import 'package:dz_studybuddy/features/focus/data/in_memory_presence_repository.dart';
import 'package:dz_studybuddy/features/focus/domain/focus.dart';
import 'package:dz_studybuddy/features/focus/presentation/bloc/focus_room_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SharedPomodoro', () {
    test('25 minutes of focus from every half hour, then 5 of rest', () {
      final at = SharedPomodoro.at;
      expect(at(DateTime.utc(2027, 1, 1, 10, 0)).phase, FocusPhase.focus);
      expect(
        at(DateTime.utc(2027, 1, 1, 10, 0)).remaining,
        const Duration(minutes: 25),
      );
      expect(
        at(DateTime.utc(2027, 1, 1, 10, 24, 30)).remaining,
        const Duration(seconds: 30),
      );
      final rest = at(DateTime.utc(2027, 1, 1, 10, 26));
      expect(rest.phase, FocusPhase.rest);
      expect(rest.remaining, const Duration(minutes: 4));
      expect(at(DateTime.utc(2027, 1, 1, 10, 30)).phase, FocusPhase.focus);
      expect(at(DateTime.utc(2027, 1, 1, 10, 57)).phase, FocusPhase.rest);
    });

    test('two devices with different clocks agree once offset', () {
      final server = DateTime.utc(2027, 1, 1, 10, 12, 7);
      final device = server.subtract(const Duration(seconds: 93));
      const offset = Duration(seconds: 93);
      expect(SharedPomodoro.at(device.add(offset)), SharedPomodoro.at(server));
    });
  });

  test(
    'a room counts its students and their wilayas; leaving removes them',
    () async {
      final presence = InMemoryPresenceRepository();
      var now = DateTime.utc(2027, 1, 1, 10, 24, 58);
      final room = focusRoomById('math')!;

      final a = FocusRoomCubit(
        room: room,
        uid: 'a',
        wilayaCode: 16,
        presence: presence,
        clock: () => now,
        tick: const Duration(milliseconds: 10),
      );
      final b = FocusRoomCubit(
        room: room,
        uid: 'b',
        wilayaCode: 31,
        presence: presence,
        clock: () => now,
        tick: const Duration(milliseconds: 10),
      );
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(a.state.joined, isTrue);
      expect(a.state.presence, const RoomPresence(count: 2, wilayas: 2));
      expect(a.state.moment.phase, FocusPhase.focus);
      expect(a.state.focusedSeconds, greaterThan(0));

      now = DateTime.utc(2027, 1, 1, 10, 25, 1);
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(a.state.moment.phase, FocusPhase.rest);
      final focused = a.state.focusedSeconds;
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(a.state.focusedSeconds, focused, reason: 'rest is not counted');

      await b.close();
      await pumpEventQueue();
      expect(a.state.presence.count, 1);
      expect(
        (await presence.watchAll().first)['math'],
        const RoomPresence(count: 1, wilayas: 1),
      );
      await a.close();
      expect((await presence.watchAll().first)['math']!.count, 0);
    },
  );
}
