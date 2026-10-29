import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import 'playback.dart';

/// Mirrors [PlaybackService] state for widgets and forwards their commands.
class PlaybackCubit extends Cubit<PlaybackState> {
  PlaybackCubit(this._service) : super(_service.state) {
    _subscription = _service.states.listen(emit);
  }

  final PlaybackService _service;
  late final StreamSubscription<PlaybackState> _subscription;

  Future<void> play(Playable item) => _service.play(item);

  /// Plays [item], or pauses/resumes it if it is already the current one.
  Future<void> toggle(Playable item) {
    if (state.current?.id != item.id) return _service.play(item);
    return state.playing ? _service.pause() : _service.resume();
  }

  Future<void> pause() => _service.pause();
  Future<void> resume() => _service.resume();
  Future<void> stop() => _service.stop();
  Future<void> seek(Duration position) => _service.seek(position);

  @override
  Future<void> close() {
    _subscription.cancel();
    return super.close();
  }
}
