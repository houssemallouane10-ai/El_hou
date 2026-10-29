import 'dart:convert';
import 'dart:typed_data';

import 'package:dz_studybuddy/core/ai/ai_client.dart';
import 'package:dz_studybuddy/core/ai/gemini_rest_client.dart';
import 'package:dz_studybuddy/core/ai/json_reply.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('sends the image inline with the schema and parses the reply', () async {
    late http.Request sent;
    final client = GeminiRestClient(
      apiKey: 'k',
      model: 'gemini-test',
      httpClient: MockClient((request) async {
        sent = request;
        return http.Response.bytes(
          utf8.encode(
            jsonEncode({
              'candidates': [
                {
                  'content': {
                    'parts': [
                      {'text': 'thinking…', 'thought': true},
                      {'text': '{"ok": true, "mark": 1.5}'},
                    ],
                  },
                },
              ],
            }),
          ),
          200,
        );
      }),
    );
    final reply = await client.generateJson(
      systemPrompt: 'sys',
      prompt: 'صحّح',
      jsonSchema: const {'type': 'object'},
      images: [
        AiImage(Uint8List.fromList([1, 2])),
      ],
    );
    expect(reply, {'ok': true, 'mark': 1.5});
    expect(sent.url.path, '/v1beta/models/gemini-test:generateContent');
    expect(sent.headers['x-goog-api-key'], 'k');
    final body = jsonDecode(sent.body) as Map<String, Object?>;
    final parts = (body['contents'] as List).single['parts'] as List;
    expect(parts.first, {
      'inline_data': {'mime_type': 'image/jpeg', 'data': 'AQI='},
    });
    expect(
      (body['generationConfig'] as Map)['responseMimeType'],
      'application/json',
    );
  });

  test('maps HTTP failures to Arabic messages', () async {
    GeminiRestClient withStatus(int code) => GeminiRestClient(
      apiKey: 'k',
      httpClient: MockClient((_) async => http.Response('', code)),
    );
    Future<void> call(GeminiRestClient c) =>
        c.generateJson(systemPrompt: '', prompt: '', jsonSchema: const {});
    await expectLater(call(withStatus(429)), throwsA(isA<AiException>()));
    await expectLater(call(withStatus(500)), throwsA(isA<AiException>()));

    // A dropped connection or a proxy page instead of JSON.
    final dropped = GeminiRestClient(
      apiKey: 'k',
      httpClient: MockClient((_) async => throw http.ClientException('reset')),
    );
    await expectLater(call(dropped), throwsA(AiException.offline));
    final html = GeminiRestClient(
      apiKey: 'k',
      httpClient: MockClient((_) async => http.Response('<html>', 200)),
    );
    await expectLater(call(html), throwsA(AiException.offline));
  });

  test('parseJsonReply tolerates code fences and rejects garbage', () {
    expect(parseJsonReply('```json\n{"a": 1}\n```'), {'a': 1});
    expect(() => parseJsonReply('not json'), throwsA(isA<AiException>()));
    expect(() => parseJsonReply('[1]'), throwsA(isA<AiException>()));
  });
}
