import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/ai/ai_client.dart';
import '../domain/lesson_content.dart';
import '../domain/repositories.dart';

/// Generates the "5-minute summary" with the AI model and caches it on the
/// device, so each lesson costs one call per student.
class AiSummaryService implements SummaryService {
  AiSummaryService(this._ai, {SharedPreferencesAsync? prefs})
    : _prefs = prefs ?? SharedPreferencesAsync();

  final AiClient _ai;
  final SharedPreferencesAsync _prefs;

  static const systemPrompt = '''
أنت أستاذ جزائري خبير في المنهاج الرسمي لوزارة التربية الوطنية الجزائرية.
مهمتك كتابة "ملخص الخمس دقائق" لدرس واحد: ملخص بصري مركّز جداً يراجعه التلميذ قبل الامتحان.
- التزم بمحتوى الدرس كما يُدرَّس في المنهاج الجزائري وبالمصطلحات المستعملة في الكتاب المدرسي والامتحانات الرسمية.
- جمل قصيرة وواضحة بالعربية الفصحى، مع الإبقاء على الرموز والمصطلحات العلمية كما تُكتب في القسم (مثل ln أو pH أو ATP).
- لا تخترع معلومات؛ إذا لم تكن متأكداً من جزئية فاحذفها.
- القوانين في formulas تُكتب كعلاقات رياضية فقط، علاقة واحدة في كل عنصر.
- النقاط الأساسية بين 5 و8، والتعاريف والقوانين عند الحاجة فقط (اتركها فارغة للمواد الأدبية إن لم تلزم).
- نصائح الامتحان تخص طريقة الإجابة والمنهجية المطلوبة في البكالوريا أو الشهادة.''';

  static const schema = <String, Object?>{
    'type': 'object',
    'properties': {
      'keyPoints': {
        'type': 'array',
        'items': {'type': 'string'},
        'description': 'أهم أفكار الدرس، من 5 إلى 8 نقاط',
      },
      'definitions': {
        'type': 'array',
        'items': {
          'type': 'object',
          'properties': {
            'term': {'type': 'string'},
            'meaning': {'type': 'string'},
          },
          'required': ['term', 'meaning'],
        },
      },
      'formulas': {
        'type': 'array',
        'items': {'type': 'string'},
        'description': 'القوانين أو العلاقات الأساسية، إن وجدت',
      },
      'examTips': {
        'type': 'array',
        'items': {'type': 'string'},
      },
      'commonMistakes': {
        'type': 'array',
        'items': {'type': 'string'},
      },
    },
    'required': [
      'keyPoints',
      'definitions',
      'formulas',
      'examTips',
      'commonMistakes',
    ],
  };

  @override
  bool get isAvailable => _ai.isAvailable;

  @override
  Future<AiSummary> summarize({
    required String lessonId,
    required String lessonTitle,
    required String subjectName,
    required String unitTitle,
    required String levelLabel,
    bool refresh = false,
  }) async {
    final key = 'summary.v1.$lessonId';
    if (!refresh) {
      try {
        final cached = await _prefs.getString(key);
        if (cached != null) {
          return AiSummary.fromJson(jsonDecode(cached) as Map<String, Object?>);
        }
      } catch (_) {
        // A corrupt or unreadable cache entry is regenerated below.
      }
    }
    final json = await _ai.generateJson(
      systemPrompt: systemPrompt,
      prompt:
          'المستوى: $levelLabel\n'
          'المادة: $subjectName\n'
          'الوحدة: $unitTitle\n'
          'الدرس: $lessonTitle\n'
          'اكتب ملخص الخمس دقائق لهذا الدرس.',
      jsonSchema: schema,
    );
    final summary = AiSummary.fromJson(json);
    if (summary.keyPoints.isEmpty) {
      throw const AiException('لم يُولَّد ملخص صالح، أعد المحاولة');
    }
    try {
      await _prefs.setString(key, jsonEncode(summary.toJson()));
    } catch (_) {
      // Caching is best-effort.
    }
    return summary;
  }
}
