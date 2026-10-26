import '../../../core/audio/playback.dart';

enum Ambience {
  silence('صمت تام', null),
  lofi('لوفاي هادئ', 'assets/audio/lofi.m4a'),
  brownNoise('ضجيج بني', 'assets/audio/brown_noise.m4a');

  const Ambience(this.label, this.asset);

  final String label;
  final String? asset;

  static const idPrefix = 'ambience.';

  Playable? get playable => asset == null
      ? null
      : Playable(
          id: '$idPrefix$name',
          title: label,
          subtitle: 'غرف التركيز',
          asset: asset,
          loop: true,
        );

  static Ambience ofPlaying(PlaybackState state) {
    final id = state.current?.id;
    for (final a in values) {
      if (state.playing && id == '$idPrefix${a.name}') return a;
    }
    return silence;
  }
}
