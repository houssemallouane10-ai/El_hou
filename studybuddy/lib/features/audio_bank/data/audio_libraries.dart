import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/services.dart';

import '../domain/audio_track.dart';

/// The revision cards bundled with the app (read aloud on the device).
class AssetAudioLibrary implements AudioLibraryRepository {
  AssetAudioLibrary([AssetBundle? bundle]) : _bundle = bundle ?? rootBundle;

  static const assetPath = 'assets/audio_bank/tracks.json';

  final AssetBundle _bundle;

  @override
  Future<List<AudioTrack>> load() async {
    final json = jsonDecode(await _bundle.loadString(assetPath)) as List;
    return [
      for (final t in json.cast<Map<String, Object?>>())
        AudioTrack.fromMap(t['id'] as String, t),
    ].whereType<AudioTrack>().toList();
  }
}

/// Recorded episodes published in `audio_tracks/{id}` (audio files in
/// Cloud Storage or any HTTPS host).
class FirestoreAudioLibrary implements AudioLibraryRepository {
  FirestoreAudioLibrary([FirebaseFirestore? firestore])
    : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  @override
  Future<List<AudioTrack>> load() async {
    final snapshot = await _db.collection('audio_tracks').get();
    return [for (final d in snapshot.docs) AudioTrack.fromMap(d.id, d.data())]
        .whereType<AudioTrack>()
        .toList();
  }
}

/// Recordings first, then the bundled cards; a source that fails (offline)
/// is skipped rather than hiding the others.
class CombinedAudioLibrary implements AudioLibraryRepository {
  const CombinedAudioLibrary(this._sources);

  final List<AudioLibraryRepository> _sources;

  @override
  Future<List<AudioTrack>> load() async {
    final results = await Future.wait([
      for (final s in _sources)
        s.load().catchError((Object _) => const <AudioTrack>[]),
    ]);
    final seen = <String>{};
    return [
      for (final list in results)
        for (final t in list)
          if (seen.add(t.id)) t,
    ];
  }
}
