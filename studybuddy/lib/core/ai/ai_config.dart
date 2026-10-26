/// Model settings, overridable at build time:
/// `flutter run --dart-define=GEMINI_MODEL=… --dart-define=GEMINI_API_KEY=…`
abstract final class AiConfig {
  static const model = String.fromEnvironment(
    'GEMINI_MODEL',
    defaultValue: 'gemini-3.5-flash',
  );

  /// For local development only: a key compiled into the app can be
  /// extracted from it. Production builds go through Firebase AI Logic.
  static const devApiKey = String.fromEnvironment('GEMINI_API_KEY');
}
