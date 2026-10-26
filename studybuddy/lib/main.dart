import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:just_audio_background/just_audio_background.dart';

import 'app.dart';
import 'core/ai/ai_client.dart';
import 'core/ai/ai_config.dart';
import 'core/ai/firebase_ai_client.dart';
import 'core/ai/gemini_rest_client.dart';
import 'core/audio/just_audio_playback_service.dart';
import 'core/di/app_dependencies.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    // Lock-screen controls and background playback for the audio bank.
    await JustAudioBackground.init(
      androidNotificationChannelId: 'dz.studybuddy.audio',
      androidNotificationChannelName: 'بنك الصوتيات',
      androidNotificationOngoing: true,
    );
  } catch (e) {
    debugPrint('Background audio unavailable: $e');
  }
  final playback = JustAudioPlaybackService();

  AiClient devAi() => AiConfig.devApiKey.isNotEmpty
      ? GeminiRestClient(apiKey: AiConfig.devApiKey)
      : const UnavailableAiClient();

  AppDependencies deps;
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    deps = AppDependencies.firebase(
      ai: AiConfig.devApiKey.isNotEmpty ? devAi() : FirebaseAiClient(),
      playback: playback,
    );
  } catch (e) {
    debugPrint('Starting in demo mode: $e');
    deps = AppDependencies.demo(ai: devAi(), playback: playback);
  }
  runApp(StudyBuddyApp(deps: deps));
}
