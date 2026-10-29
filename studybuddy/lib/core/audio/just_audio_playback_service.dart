import 'dart:async';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';

import '../constants/app_strings.dart';
import 'playback.dart';

/// Recorded audio through just_audio (with lock-screen controls and
/// background playback via just_audio_background), and text through the
/// device's text-to-speech engine.
class JustAudioPlaybackService implements PlaybackService {
  JustAudioPlaybackService() {
    _subscriptions.addAll([
      _player.playerStateStream.listen((s) {
        if (_state.current == null || _state.current!.isSpeech) return;
        final done = s.processingState == ProcessingState.completed;
        _emit(
          _copy(
            playing: s.playing && !done,
            clearError: s.playing,
            loading:
                s.processingState == ProcessingState.loading ||
                s.processingState == ProcessingState.buffering,
          ),
        );
      }),
      _player.positionStream.listen((p) {
        if (_state.current?.isSpeech == false) _emit(_copy(position: p));
      }),
      _player.durationStream.listen((d) {
        if (_state.current?.isSpeech == false) _emit(_copy(duration: d));
      }),
    ]);

    _tts
      ..setStartHandler(
        () => _emit(_copy(playing: true, loading: false, clearError: true)),
      )
      ..setCompletionHandler(() {
        _speechOffset = 0;
        _emit(_copy(playing: false, speechProgress: 1));
      })
      ..setCancelHandler(() => _emit(_copy(playing: false)))
      ..setErrorHandler(
        (_) => _emit(
          _copy(
            playing: false,
            loading: false,
            error: 'تعذّرت القراءة الصوتية على هذا الجهاز',
          ),
        ),
      )
      ..setProgressHandler((text, start, end, word) {
        final total = _state.current?.speechText?.length ?? 0;
        if (total == 0) return;
        // Offsets are relative to the text passed to speak(), which starts
        // at _speechBase after a resume.
        _speechOffset = _speechBase + start;
        _emit(_copy(speechProgress: (_speechBase + end) / total));
      });
  }

  final _player = AudioPlayer();
  final _tts = FlutterTts();
  final _controller = StreamController<PlaybackState>.broadcast();
  final _subscriptions = <StreamSubscription<Object?>>[];
  var _state = const PlaybackState();
  var _speechOffset = 0;
  var _speechBase = 0;

  @override
  Stream<PlaybackState> get states => _controller.stream;

  @override
  PlaybackState get state => _state;

  @override
  Future<void> play(Playable item) async {
    await _halt();
    _speechOffset = 0;
    _emit(PlaybackState(current: item, loading: true));
    try {
      if (item.isSpeech) {
        await _speakFrom(0);
        return;
      }
      final tag = MediaItem(
        id: item.id,
        title: item.title,
        album: item.subtitle ?? AppStrings.appName,
      );
      await _player.setAudioSource(
        item.url != null
            ? AudioSource.uri(item.url!, tag: tag)
            : AudioSource.asset(item.asset!, tag: tag),
      );
      await _player.setLoopMode(item.loop ? LoopMode.one : LoopMode.off);
      // play() completes only when playback stops, so it is not awaited.
      unawaited(_player.play());
    } catch (_) {
      _emit(
        PlaybackState(
          current: item,
          error: 'تعذّر تشغيل المقطع، تحقق من اتصالك',
        ),
      );
    }
  }

  @override
  Future<void> pause() async {
    if (_state.current?.isSpeech ?? false) {
      await _tts.stop();
      _emit(_copy(playing: false));
    } else {
      await _player.pause();
    }
  }

  @override
  Future<void> resume() async {
    final current = _state.current;
    if (current == null) return;
    if (current.isSpeech) {
      final finished = (_state.speechProgress ?? 0) >= 1;
      await _speakFrom(finished ? 0 : _speechOffset);
    } else {
      if (_player.processingState == ProcessingState.completed) {
        await _player.seek(Duration.zero);
      }
      unawaited(_player.play());
    }
  }

  @override
  Future<void> stop() async {
    await _halt();
    _emit(const PlaybackState());
  }

  @override
  Future<void> seek(Duration position) => _player.seek(position);

  @override
  Future<void> dispose() async {
    for (final s in _subscriptions) {
      await s.cancel();
    }
    await _tts.stop();
    await _player.dispose();
    await _controller.close();
  }

  Future<void> _speakFrom(int offset) async {
    final text = _state.current!.speechText!;
    _speechBase = offset.clamp(0, text.length);
    // Android answers 0 when no Arabic voice is installed.
    if (await _tts.setLanguage('ar') == 0) {
      _emit(
        _copy(
          loading: false,
          error: 'ثبّت الصوت العربي من إعدادات «تحويل النص إلى كلام» في هاتفك',
        ),
      );
      return;
    }
    await _tts.setSpeechRate(0.45);
    await _tts.speak(text.substring(_speechBase));
  }

  Future<void> _halt() async {
    await _tts.stop();
    await _player.stop();
  }

  PlaybackState _copy({
    bool? playing,
    bool? loading,
    Duration? position,
    Duration? duration,
    double? speechProgress,
    String? error,
    bool clearError = false,
  }) {
    return PlaybackState(
      current: _state.current,
      playing: playing ?? _state.playing,
      loading: loading ?? _state.loading,
      position: position ?? _state.position,
      duration: duration ?? _state.duration,
      speechProgress: speechProgress ?? _state.speechProgress,
      error: clearError ? null : error ?? _state.error,
    );
  }

  void _emit(PlaybackState state) {
    _state = state;
    if (!_controller.isClosed) _controller.add(state);
  }
}
