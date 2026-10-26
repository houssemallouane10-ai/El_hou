import 'dart:convert';

import 'package:http/http.dart' as http;

import 'ai_client.dart';
import 'ai_config.dart';
import 'json_reply.dart';

/// Calls the Gemini API directly with a developer key. For local testing
/// only; see [AiConfig.devApiKey].
class GeminiRestClient implements AiClient {
  GeminiRestClient({
    required this._apiKey,
    this._model = AiConfig.model,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final String _apiKey;
  final String _model;
  final http.Client _http;

  @override
  bool get isAvailable => true;

  @override
  Future<Map<String, Object?>> generateJson({
    required String systemPrompt,
    required String prompt,
    required Map<String, Object?> jsonSchema,
    List<AiImage> images = const [],
  }) async {
    final uri = Uri.https(
      'generativelanguage.googleapis.com',
      '/v1beta/models/$_model:generateContent',
    );
    final body = {
      'system_instruction': {
        'parts': [
          {'text': systemPrompt},
        ],
      },
      'contents': [
        {
          'role': 'user',
          'parts': [
            for (final image in images)
              {
                'inline_data': {
                  'mime_type': image.mimeType,
                  'data': base64Encode(image.bytes),
                },
              },
            {'text': prompt},
          ],
        },
      ],
      'generationConfig': {
        'responseMimeType': 'application/json',
        'responseJsonSchema': jsonSchema,
        'temperature': 0.2,
      },
    };

    final http.Response response;
    try {
      response = await _http.post(
        uri,
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': _apiKey,
        },
        body: jsonEncode(body),
      );
    } on Exception {
      throw const AiException('تحقق من اتصالك بالإنترنت');
    }
    if (response.statusCode == 429) {
      throw const AiException(
        'ضغط كبير على خدمة الذكاء الاصطناعي الآن، أعد المحاولة بعد دقائق',
      );
    }
    if (response.statusCode != 200) {
      throw AiException(
        'تعذّر الاتصال بخدمة الذكاء الاصطناعي (${response.statusCode})',
      );
    }
    final text = _replyText(jsonDecode(utf8.decode(response.bodyBytes)));
    return parseJsonReply(text);
  }

  static String? _replyText(Object? decoded) {
    if (decoded case {
      'candidates': [{'content': {'parts': final List<Object?> parts}}, ...],
    }) {
      return parts
          .whereType<Map<String, Object?>>()
          .where((p) => p['thought'] != true)
          .map((p) => p['text'] as String? ?? '')
          .join();
    }
    return null;
  }
}
