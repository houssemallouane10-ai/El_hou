import 'package:dz_studybuddy/core/ai/ai_client.dart';
import 'package:dz_studybuddy/core/audio/fake_playback_service.dart';
import 'package:dz_studybuddy/core/di/app_dependencies.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

/// Answers like the model would, recording what it was sent.
class FakeAiClient implements AiClient {
  FakeAiClient({this.available = true, this.reply});

  final bool available;
  final Map<String, Object?> Function(String prompt)? reply;
  final calls = <({String prompt, List<AiImage> images, String system})>[];

  @override
  bool get isAvailable => available;

  @override
  Future<Map<String, Object?>> generateJson({
    required String systemPrompt,
    required String prompt,
    required Map<String, Object?> jsonSchema,
    List<AiImage> images = const [],
  }) async {
    calls.add((prompt: prompt, images: images, system: systemPrompt));
    if (!available) throw const AiException('unavailable');
    if (reply != null) return reply!(prompt);
    final properties = jsonSchema['properties'] as Map<String, Object?>;
    if (properties.containsKey('estimatedMark')) return sampleGrading;
    return sampleSummary;
  }
}

const sampleGrading = <String, Object?>{
  'readable': true,
  'estimatedMark': 1.6,
  'maxMark': 3,
  'methodology': 'لم تكتب القانون الحرفي قبل التطبيق العددي.',
  'steps': [
    {
      'title': 'كتابة العلاقة',
      'verdict': 'correct',
      'comment': 'العلاقة صحيحة',
      'correction': '',
    },
    {
      'title': 'التطبيق العددي',
      'verdict': 'wrong',
      'comment': 'نسيت الوحدة',
      'correction': 'v = 2 m/s',
    },
  ],
  'correctSolution': 'نكتب القانون ثم نعوّض ونذكر الوحدة.',
  'tip': 'أنت قريب من العلامة الكاملة، انتبه للوحدات.',
};

const sampleSummary = <String, Object?>{
  'keyPoints': ['النقطة الأولى', 'النقطة الثانية'],
  'definitions': [
    {'term': 'الموافقة', 'meaning': 'a ≡ b [n] إذا كان n يقسم a − b'},
  ],
  'formulas': ['a ≡ b [n] ⇔ n | (a − b)'],
  'examTips': ['برّر كل خطوة'],
  'commonMistakes': ['نسيان الشرط على n'],
};

void useInMemoryPreferences() {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.empty();
}

AppDependencies demoDeps({AiClient? ai}) {
  useInMemoryPreferences();
  return AppDependencies.demo(
    ai: ai ?? FakeAiClient(),
    playback: SilentPlaybackService(),
  );
}
