// Firebase project dz-studybuddy-269ab. Same shape as the file that
// `flutterfire configure` generates, so running it later replaces this.
// These values identify the project; they are not secrets. Access is
// controlled by firestore.rules and database.rules.json.
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class DefaultFirebaseOptions {
  /// Throws for platforms not registered yet, which starts the app in demo
  /// mode there.
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    final options = switch (defaultTargetPlatform) {
      TargetPlatform.android => android,
      _ => null,
    };
    if (options == null) {
      throw UnsupportedError(
        'Firebase is not configured for $defaultTargetPlatform yet.',
      );
    }
    return options;
  }

  static const _apiKey = 'AIzaSyDP3FW_UCuNpdFfdITIEyAGhpzqShY9XZw';
  static const _projectId = 'dz-studybuddy-269ab';
  static const _senderId = '58644723857';
  static const _databaseUrl =
      'https://dz-studybuddy-269ab-default-rtdb.europe-west1.firebasedatabase.app';
  static const _storageBucket = 'dz-studybuddy-269ab.firebasestorage.app';

  static const web = FirebaseOptions(
    apiKey: _apiKey,
    appId: '1:58644723857:web:6ead7e893997cecfd7a730',
    messagingSenderId: _senderId,
    projectId: _projectId,
    authDomain: 'dz-studybuddy-269ab.firebaseapp.com',
    databaseURL: _databaseUrl,
    storageBucket: _storageBucket,
    measurementId: 'G-86V1XMRMF2',
  );

  /// Null until the Android app is registered in the Firebase console.
  static const FirebaseOptions? android = null;
}
