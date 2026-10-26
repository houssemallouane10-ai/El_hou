import 'dart:typed_data';

/// An image sent alongside a prompt, already compressed by the caller.
class AiImage {
  const AiImage(this.bytes, {this.mimeType = 'image/jpeg'});

  final Uint8List bytes;
  final String mimeType;
}

/// A failure with a message ready to show the student.
class AiException implements Exception {
  const AiException(this.message);

  /// Grading a few photographed pages takes 10–30 s; past this, give up.
  static const timeLimit = Duration(seconds: 90);

  static const offline = AiException(
    'تعذّر الاتصال بخدمة الذكاء الاصطناعي، تحقق من اتصالك وأعد المحاولة',
  );
  static const timedOut = AiException(
    'استغرقت الإجابة وقتاً طويلاً، أعد المحاولة',
  );

  final String message;

  @override
  String toString() => message;
}

/// Talks to a multimodal model that answers in JSON matching a schema.
abstract interface class AiClient {
  /// Whether calls can succeed; false in demo mode without an API key.
  bool get isAvailable;

  /// Throws [AiException].
  Future<Map<String, Object?>> generateJson({
    required String systemPrompt,
    required String prompt,
    required Map<String, Object?> jsonSchema,
    List<AiImage> images = const [],
  });
}

/// Used when neither Firebase AI Logic nor a Gemini API key is set up.
class UnavailableAiClient implements AiClient {
  const UnavailableAiClient();

  @override
  bool get isAvailable => false;

  @override
  Future<Map<String, Object?>> generateJson({
    required String systemPrompt,
    required String prompt,
    required Map<String, Object?> jsonSchema,
    List<AiImage> images = const [],
  }) async => throw const AiException(
    'الذكاء الاصطناعي غير مفعّل بعد: اربط Firebase وفعّل Firebase AI Logic، '
    'أو شغّل التطبيق بـ --dart-define=GEMINI_API_KEY=…',
  );
}
