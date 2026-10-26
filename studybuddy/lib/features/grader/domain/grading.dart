import 'package:equatable/equatable.dart';

enum StepVerdict {
  correct('صحيح'),
  partial('ناقص'),
  wrong('خطأ');

  const StepVerdict(this.label);

  final String label;

  static StepVerdict fromName(String? name) =>
      values.firstWhere((v) => v.name == name, orElse: () => partial);
}

class GradedStep extends Equatable {
  const GradedStep({
    required this.title,
    required this.verdict,
    required this.comment,
    this.correction = '',
  });

  final String title;
  final StepVerdict verdict;
  final String comment;

  /// What the student should have written; empty when the step is correct.
  final String correction;

  @override
  List<Object?> get props => [title, verdict, comment, correction];
}

/// The examiner's verdict on one handwritten answer.
class GradingResult extends Equatable {
  const GradingResult({
    required this.readable,
    required this.estimatedMark,
    required this.maxMark,
    required this.methodology,
    required this.steps,
    required this.correctSolution,
    required this.tip,
  });

  /// False when the photo could not be read; the other fields then explain
  /// how to retake it.
  final bool readable;
  final double estimatedMark;
  final double maxMark;

  /// نقد المنهجية.
  final String methodology;
  final List<GradedStep> steps;
  final String correctSolution;

  /// A final encouraging tip.
  final String tip;

  double get ratio => maxMark <= 0 ? 0 : (estimatedMark / maxMark).clamp(0, 1);

  /// Marks are announced in quarter points, as on official grading grids.
  static double roundToQuarter(double v) => (v * 4).round() / 4;

  static String formatMark(double v) {
    final s = v.toStringAsFixed(2);
    return s.replaceFirst(RegExp(r'\.?0+$'), '');
  }

  String get markLabel =>
      '${formatMark(estimatedMark)} / ${formatMark(maxMark)}';

  factory GradingResult.fromJson(Map<String, Object?> json) {
    double number(Object? v) => v is num ? v.toDouble() : 0;
    final max = number(json['maxMark']);
    final safeMax = max > 0 ? max : 20.0;
    return GradingResult(
      readable: json['readable'] != false,
      estimatedMark: roundToQuarter(
        number(json['estimatedMark']).clamp(0, safeMax),
      ),
      maxMark: safeMax,
      methodology: json['methodology'] as String? ?? '',
      steps: [
        for (final s in (json['steps'] as List? ?? const []))
          if (s is Map<String, Object?>)
            GradedStep(
              title: s['title'] as String? ?? '',
              verdict: StepVerdict.fromName(s['verdict'] as String?),
              comment: s['comment'] as String? ?? '',
              correction: s['correction'] as String? ?? '',
            ),
      ],
      correctSolution: json['correctSolution'] as String? ?? '',
      tip: json['tip'] as String? ?? '',
    );
  }

  Map<String, Object?> toJson() => {
    'readable': readable,
    'estimatedMark': estimatedMark,
    'maxMark': maxMark,
    'methodology': methodology,
    'steps': [
      for (final s in steps)
        {
          'title': s.title,
          'verdict': s.verdict.name,
          'comment': s.comment,
          'correction': s.correction,
        },
    ],
    'correctSolution': correctSolution,
    'tip': tip,
  };

  @override
  List<Object?> get props => [
    readable,
    estimatedMark,
    maxMark,
    methodology,
    steps,
    correctSolution,
    tip,
  ];
}

/// A graded answer kept in the student's history, which also feeds the
/// daily plan's notion of weak subjects.
class GradingRecord extends Equatable {
  const GradingRecord({
    required this.id,
    required this.subjectId,
    required this.subjectName,
    required this.createdAt,
    required this.result,
    this.lessonTitle,
  });

  final String id;
  final String subjectId;
  final String subjectName;
  final String? lessonTitle;
  final DateTime createdAt;
  final GradingResult result;

  @override
  List<Object?> get props => [
    id,
    subjectId,
    subjectName,
    lessonTitle,
    createdAt,
    result,
  ];
}

/// subjectId → weakness in 0..1 (1 − average ratio) over readable gradings.
Map<String, double> weaknessBySubject(Iterable<GradingRecord> records) {
  final sums = <String, (double, int)>{};
  for (final r in records) {
    if (!r.result.readable) continue;
    final (sum, n) = sums[r.subjectId] ?? (0.0, 0);
    sums[r.subjectId] = (sum + r.result.ratio, n + 1);
  }
  return {for (final e in sums.entries) e.key: 1 - e.value.$1 / e.value.$2};
}
