import 'dart:convert';

import 'ai_client.dart';

/// Parses a model reply that should be a JSON object, tolerating a Markdown
/// code fence around it.
Map<String, Object?> parseJsonReply(String? text) {
  var body = (text ?? '').trim();
  if (body.startsWith('```')) {
    body = body
        .replaceFirst(RegExp(r'^```[a-zA-Z]*\s*'), '')
        .replaceFirst(RegExp(r'\s*```$'), '');
  }
  try {
    final decoded = jsonDecode(body);
    if (decoded is Map<String, Object?>) return decoded;
  } on FormatException {
    // Falls through to the error below.
  }
  throw const AiException('ردّ غير مفهوم من الذكاء الاصطناعي، أعد المحاولة');
}
