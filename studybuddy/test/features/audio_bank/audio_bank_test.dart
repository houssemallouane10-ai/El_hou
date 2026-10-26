import 'dart:convert';
import 'dart:io';

import 'package:dz_studybuddy/core/constants/algeria_data.dart';
import 'package:dz_studybuddy/features/audio_bank/data/audio_libraries.dart';
import 'package:dz_studybuddy/features/audio_bank/domain/audio_track.dart';
import 'package:flutter_test/flutter_test.dart';

class _Fixed implements AudioLibraryRepository {
  _Fixed(this.tracks);
  final List<AudioTrack> tracks;
  @override
  Future<List<AudioTrack>> load() async => tracks;
}

class _Failing implements AudioLibraryRepository {
  @override
  Future<List<AudioTrack>> load() async => throw Exception('offline');
}

void main() {
  test('the bundled cards cover the four memorization subjects', () {
    final raw = jsonDecode(
      File(AssetAudioLibrary.assetPath).readAsStringSync(),
    ) as List;
    final tracks = [
      for (final t in raw.cast<Map<String, Object?>>())
        AudioTrack.fromMap(t['id'] as String, t),
    ];
    expect(tracks, everyElement(isNotNull));
    expect(
      tracks.map((t) => t!.category).toSet(),
      AudioCategory.values.toSet(),
    );
    expect(tracks.map((t) => t!.id).toSet(), hasLength(tracks.length));
  });

  test('recordings play their file; cards are read aloud', () {
    final card = AudioTrack.fromMap('c', {
      'title': 'تواريخ',
      'category': 'history',
      'transcript': 'نص',
      'levels': ['bac', 'nope'],
    })!;
    expect(card.toPlayable().isSpeech, isTrue);
    expect(card.toPlayable().speechText, contains('نص'));
    expect(card.levels, {EducationLevel.bac});
    expect(card.suits(EducationLevel.bem), isFalse);

    final recording = AudioTrack.fromMap('r', {
      'title': 'حلقة',
      'category': 'philosophy',
      'audioUrl': 'https://cdn.example/ep1.mp3',
      'minutes': 7,
    })!;
    expect(
      recording.toPlayable().url,
      Uri.parse('https://cdn.example/ep1.mp3'),
    );
    expect(recording.estimatedMinutes, 7);
    expect(recording.suits(EducationLevel.bem), isTrue);

    expect(
      AudioTrack.fromMap('x', {'title': 'x', 'category': 'history'}),
      isNull,
    );
  });

  test(
    'a failing source does not hide the others; ids are deduplicated',
    () async {
      const t = AudioTrack(
        id: 'a',
        title: 'a',
        category: AudioCategory.history,
        transcript: 'a',
      );
      final library = CombinedAudioLibrary([
        _Failing(),
        _Fixed([t]),
        _Fixed([t]),
      ]);
      expect(await library.load(), [t]);
    },
  );
}
