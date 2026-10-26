import '../../../core/ai/ai_client.dart';
import '../domain/grader_repositories.dart';
import '../domain/grading.dart';

/// Grades a photographed answer like an official BAC examiner, following
/// the Algerian grading methodology (المنهجية الرسمية).
class AiHomeworkGrader implements HomeworkGrader {
  const AiHomeworkGrader(this._ai);

  final AiClient _ai;

  static const systemPrompt = '''
You are an official Algerian Ministry of Education Examiner for the BAC exam.
Analyze the attached image of the student's handwritten answer for the specific lesson requested.
Compare it with official Algerian grading rubrics (المنهجية الرسمية).

قواعد التصحيح:
- صحّح كما يصحّح أستاذ في مركز تصحيح البكالوريا الجزائرية: العلامة تُمنح لكل خطوة صحيحة من المنهجية (التعليل، القانون، التطبيق العددي، الوحدة، الاستنتاج)، ولا تُمنح العلامة الكاملة لنتيجة صحيحة دون تبرير.
- في العلوم الطبيعية: احترم منهجية تحليل الوثائق (التحليل ثم التفسير ثم الاستنتاج) والمصطلحات العلمية الدقيقة.
- في الفيزياء والرياضيات: تحقق من كتابة القانون الحرفي قبل التطبيق العددي، ومن الوحدات، ومن دقة الرسم والمنحنيات.
- في الفلسفة والمواد الأدبية: قيّم طرح الإشكالية، وبناء المقالة، والحجج، والتركيب، وسلامة اللغة.
- العلامة المقدّرة تكون بأرباع النقطة (مثل 1.5 أو 2.25)، ولا تتجاوز العلامة القصوى للسؤال. إن لم تُحدَّد العلامة القصوى فقدّرها حسب سلّم البكالوريا المعتاد لمثل هذا السؤال.
- كن دقيقاً وعادلاً: لا تخترع أخطاء، ولا تتجاهل خطأً في المنهجية.
- اكتب كل علاقة أو حساب رياضي في سطر مستقل، دون خلطه داخل جملة عربية.
- إن كانت الصورة غير مقروءة أو لا تحتوي إجابة، اجعل readable = false واشرح في methodology كيف يعيد التصوير.

أجب بالعربية الفصحى مع المصطلحات الجزائرية المعتادة، في الحقول التالية:
1. estimatedMark و maxMark: العلامة المقدّرة (مثلاً 1.5 من 3).
2. methodology: نقد المنهجية.
3. steps: تصحيح الأخطاء خطوة بخطوة (لكل خطوة: verdict = correct أو partial أو wrong، تعليق، والتصحيح الصحيح).
4. correctSolution: الحل النموذجي المختصر للسؤال.
5. tip: نصيحة ختامية مشجّعة.''';

  static const schema = <String, Object?>{
    'type': 'object',
    'properties': {
      'readable': {'type': 'boolean'},
      'estimatedMark': {'type': 'number'},
      'maxMark': {'type': 'number'},
      'methodology': {'type': 'string'},
      'steps': {
        'type': 'array',
        'items': {
          'type': 'object',
          'properties': {
            'title': {'type': 'string'},
            'verdict': {
              'type': 'string',
              'enum': ['correct', 'partial', 'wrong'],
            },
            'comment': {'type': 'string'},
            'correction': {'type': 'string'},
          },
          'required': ['title', 'verdict', 'comment', 'correction'],
        },
      },
      'correctSolution': {'type': 'string'},
      'tip': {'type': 'string'},
    },
    'required': [
      'readable',
      'estimatedMark',
      'maxMark',
      'methodology',
      'steps',
      'correctSolution',
      'tip',
    ],
  };

  @override
  bool get isAvailable => _ai.isAvailable;

  static String buildPrompt(GradingRequest r) {
    final lines = [
      'المستوى: ${r.levelLabel}',
      'المادة: ${r.subjectName}',
      if (r.lessonTitle != null) 'الدرس: ${r.lessonTitle}',
      if (r.maxMark != null)
        'العلامة القصوى للسؤال: ${GradingResult.formatMark(r.maxMark!)}',
      if (r.questionText != null && r.questionText!.trim().isNotEmpty)
        'نص السؤال: ${r.questionText!.trim()}',
      if (r.questionImage != null)
        'الصورة الأولى هي نص التمرين، والصور التالية هي إجابة التلميذ.'
      else
        'الصور المرفقة هي إجابة التلميذ بخط يده.',
      'صحّح الإجابة وفق المنهجية الرسمية.',
    ];
    return lines.join('\n');
  }

  @override
  Future<GradingResult> grade(GradingRequest request) async {
    final json = await _ai.generateJson(
      systemPrompt: systemPrompt,
      prompt: buildPrompt(request),
      jsonSchema: schema,
      images: [
        if (request.questionImage != null) request.questionImage!,
        ...request.answerPages,
      ],
    );
    final result = GradingResult.fromJson(json);
    final max = request.maxMark;
    if (max == null || max <= 0) return result;
    // The student's stated scale wins over the model's guess.
    return GradingResult(
      readable: result.readable,
      estimatedMark: GradingResult.roundToQuarter(
        result.maxMark > 0 ? result.ratio * max : result.estimatedMark,
      ),
      maxMark: max,
      methodology: result.methodology,
      steps: result.steps,
      correctSolution: result.correctSolution,
      tip: result.tip,
    );
  }
}
