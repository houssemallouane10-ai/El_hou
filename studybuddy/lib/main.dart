import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app.dart';
import 'firebase_options.dart';
import 'features/auth/data/firebase_auth_repository.dart';
import 'features/auth/data/firestore_profile_repository.dart';
import 'features/auth/data/in_memory_repositories.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    runApp(
      StudyBuddyApp(
        authRepository: FirebaseAuthRepository(),
        profileRepository: FirestoreProfileRepository(),
      ),
    );
  } catch (e) {
    debugPrint('Starting in demo mode: $e');
    runApp(
      StudyBuddyApp(
        authRepository: InMemoryAuthRepository(),
        profileRepository: InMemoryProfileRepository(),
        demoMode: true,
      ),
    );
  }
}
