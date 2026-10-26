import 'package:firebase_ai/firebase_ai.dart';

import 'ai_client.dart';
import 'ai_config.dart';
import 'json_reply.dart';

/// Calls Gemini through Firebase AI Logic, so no API key ships in the app.
/// Enable "AI Logic" (Gemini Developer API) in the Firebase console first.
class FirebaseAiClient implements AiClient {
  FirebaseAiClient({this._model = AiConfig.model});

  final String _model;

  @override
  bool get isAvailable => true;

  @override
  Future<Map<String, Object?>> generateJson({
    required String systemPrompt,
    required String prompt,
    required Map<String, Object?> jsonSchema,
    List<AiImage> images = const [],
  }) async {
    final model = FirebaseAI.googleAI().generativeModel(
      model: _model,
      systemInstruction: Content.system(systemPrompt),
      generationConfig: GenerationConfig(
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema,
        temperature: 0.2,
      ),
    );
    try {
      final response = await model.generateContent([
        Content.multi([
          for (final image in images)
            InlineDataPart(image.mimeType, image.bytes),
          TextPart(prompt),
        ]),
      ]);
      return parseJsonReply(response.text);
    } on QuotaExceeded {
      throw const AiException(
        'ضغط كبير على خدمة الذكاء الاصطناعي الآن، أعد المحاولة بعد دقائق',
      );
    } on FirebaseAIException catch (e) {
      throw AiException('تعذّر الاتصال بخدمة الذكاء الاصطناعي: ${e.message}');
    }
  }
}
