import 'package:equatable/equatable.dart';

/// Something the app can play: a recorded file (remote or bundled), or a
/// text read aloud by the device's speech engine when no recording exists.
class Playable extends Equatable {
  const Playable({
    required this.id,
    required this.title,
    this.subtitle,
    this.url,
    this.asset,
    this.speechText,
    this.loop = false,
  }) : assert(url != null || asset != null || speechText != null);

  final String id;
  final String title;
  final String? subtitle;
  final Uri? url;
  final String? asset;
  final String? speechText;
  final bool loop;

  bool get isSpeech => url == null && asset == null;

  @override
  List<Object?> get props => [
    id,
    title,
    subtitle,
    url,
    asset,
    speechText,
    loop,
  ];
}

class PlaybackState extends Equatable {
  const PlaybackState({
    this.current,
    this.playing = false,
    this.loading = false,
    this.position = Duration.zero,
    this.duration,
    this.speechProgress,
    this.error,
  });

  final Playable? current;
  final bool playing;
  final bool loading;
  final Duration position;
  final Duration? duration;

  /// 0..1 through a spoken text, where position and duration are unknown.
  final double? speechProgress;
  final String? error;

  double? get progress {
    if (current?.isSpeech ?? false) return speechProgress;
    final total = duration?.inMilliseconds ?? 0;
    if (total <= 0) return null;
    return (position.inMilliseconds / total).clamp(0.0, 1.0);
  }

  bool isPlayingItem(String id) => current?.id == id && playing;

  @override
  List<Object?> get props => [
    current,
    playing,
    loading,
    position,
    duration,
    speechProgress,
    error,
  ];
}

/// The app's single audio output, shared by the audio bank and the focus
/// rooms: starting one stops the other.
abstract interface class PlaybackService {
  Stream<PlaybackState> get states;
  PlaybackState get state;

  Future<void> play(Playable item);
  Future<void> pause();
  Future<void> resume();
  Future<void> stop();
  Future<void> seek(Duration position);
  Future<void> dispose();
}
