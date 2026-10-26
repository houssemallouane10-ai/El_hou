import 'package:equatable/equatable.dart';

import '../../../core/audio/playback.dart';
import '../../../core/constants/algeria_data.dart';

enum AudioCategory {
  history('التاريخ', 'history'),
  geography('الجغرافيا', 'history'),
  islamic('العلوم الإسلامية', 'islamic'),
  philosophy('الفلسفة', 'philosophy');

  const AudioCategory(this.label, this.icon);

  final String label;

  /// A subject icon key (see subjectIcon).
  final String icon;

  static AudioCategory? fromName(String? name) {
    for (final c in values) {
      if (c.name == name) return c;
    }
    return null;
  }
}

/// A revision episode: a recording when [audioUrl] is set, otherwise the
/// [transcript] is read aloud by the device.
class AudioTrack extends Equatable {
  const AudioTrack({
    required this.id,
    required this.title,
    required this.category,
    required this.transcript,
    this.levels = const {},
    this.audioUrl,
    this.minutes,
  });

  final String id;
  final String title;
  final AudioCategory category;
  final String transcript;

  /// Empty means every level.
  final Set<EducationLevel> levels;
  final Uri? audioUrl;

  /// Length of the recording; estimated from the transcript otherwise.
  final int? minutes;

  bool get isRecording => audioUrl != null;

  /// About 110 Arabic words a minute at the reading speed used.
  int get estimatedMinutes =>
      minutes ??
      (transcript.split(RegExp(r'\s+')).length / 110).ceil().clamp(1, 60);

  bool suits(EducationLevel level) => levels.isEmpty || levels.contains(level);

  Playable toPlayable() => Playable(
    id: 'track.$id',
    title: title,
    subtitle: 'بنك الصوتيات · ${category.label}',
    url: audioUrl,
    speechText: audioUrl == null ? '$title.\n$transcript' : null,
  );

  static AudioTrack? fromMap(String id, Map<String, Object?> map) {
    final title = map['title'];
    final category = AudioCategory.fromName(map['category'] as String?);
    final transcript = map['transcript'] as String? ?? '';
    final url = map['audioUrl'] as String?;
    if (title is! String || category == null) return null;
    if (transcript.isEmpty && url == null) return null;
    return AudioTrack(
      id: id,
      title: title,
      category: category,
      transcript: transcript,
      levels: {
        for (final l in (map['levels'] as List? ?? const []))
          ?EducationLevel.fromId(l as String?),
      },
      audioUrl: url == null ? null : Uri.tryParse(url),
      minutes: map['minutes'] as int?,
    );
  }

  @override
  List<Object?> get props => [
    id,
    title,
    category,
    transcript,
    levels,
    audioUrl,
    minutes,
  ];
}

abstract interface class AudioLibraryRepository {
  Future<List<AudioTrack>> load();
}
