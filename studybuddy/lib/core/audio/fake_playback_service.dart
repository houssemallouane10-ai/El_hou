import 'dart:async';

import 'playback.dart';

/// A silent [PlaybackService] for tests and environments without audio.
class SilentPlaybackService implements PlaybackService {
  final _controller = StreamController<PlaybackState>.broadcast();
  var _state = const PlaybackState();

  @override
  Stream<PlaybackState> get states => _controller.stream;

  @override
  PlaybackState get state => _state;

  @override
  Future<void> play(Playable item) async =>
      _emit(PlaybackState(current: item, playing: true));

  @override
  Future<void> pause() async => _emit(PlaybackState(current: _state.current));

  @override
  Future<void> resume() async {
    if (_state.current != null) {
      _emit(PlaybackState(current: _state.current, playing: true));
    }
  }

  @override
  Future<void> stop() async => _emit(const PlaybackState());

  @override
  Future<void> seek(Duration position) async {}

  @override
  Future<void> dispose() => _controller.close();

  void _emit(PlaybackState state) {
    _state = state;
    _controller.add(state);
  }
}
