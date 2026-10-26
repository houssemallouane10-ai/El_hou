import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../domain/grading.dart';

/// The examiner's verdict: mark, methodology, step-by-step corrections,
/// model solution and an encouraging tip.
class GradingResultView extends StatelessWidget {
  const GradingResultView({super.key, required this.result, this.footer});

  final GradingResult result;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    if (!result.readable) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _Card(
            icon: Icons.photo_camera_back_rounded,
            title: 'لم نتمكن من قراءة الصورة',
            accent: AppColors.error,
            child: Text(result.methodology),
          ),
          ?footer,
        ],
      );
    }
    final color = result.ratio >= 0.75
        ? AppColors.emerald
        : result.ratio >= 0.5
        ? const Color(0xFFF9A825)
        : AppColors.error;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Center(
          child: SizedBox(
            width: 150,
            height: 150,
            child: Stack(
              fit: StackFit.expand,
              children: [
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: result.ratio),
                  duration: const Duration(milliseconds: 900),
                  curve: Curves.easeOutCubic,
                  builder: (_, v, _) => CircularProgressIndicator(
                    value: v,
                    strokeWidth: 12,
                    color: color,
                    backgroundColor: color.withValues(alpha: 0.12),
                  ),
                ),
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        result.markLabel,
                        textDirection: TextDirection.ltr,
                        style: text.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        'العلامة المقدّرة',
                        style: text.bodySmall?.copyWith(
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        _Card(
          icon: Icons.rule_rounded,
          title: 'نقد المنهجية',
          child: Text(
            result.methodology,
            style: text.bodyLarge?.copyWith(height: 1.6),
          ),
        ),
        if (result.steps.isNotEmpty)
          _Card(
            icon: Icons.format_list_numbered_rtl_rounded,
            title: 'التصحيح خطوة بخطوة',
            child: Column(
              children: [
                for (final (i, step) in result.steps.indexed)
                  _StepTile(index: i + 1, step: step),
              ],
            ),
          ),
        if (result.correctSolution.isNotEmpty)
          _Card(
            icon: Icons.task_alt_rounded,
            title: 'الحل النموذجي',
            child: Text(
              result.correctSolution,
              style: text.bodyLarge?.copyWith(height: 1.6),
            ),
          ),
        if (result.tip.isNotEmpty)
          _Card(
            icon: Icons.emoji_events_rounded,
            title: 'نصيحة الأستاذ',
            accent: AppColors.gold,
            child: Text(
              result.tip,
              style: text.bodyLarge?.copyWith(height: 1.6),
            ),
          ),
        Text(
          'تصحيح تقديري بالذكاء الاصطناعي وفق المنهجية الرسمية، '
          'ولا يعوّض رأي أستاذك.',
          textAlign: TextAlign.center,
          style: text.bodySmall?.copyWith(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 12),
        ?footer,
      ],
    );
  }
}

class _StepTile extends StatelessWidget {
  const _StepTile({required this.index, required this.step});

  final int index;
  final GradedStep step;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (step.verdict) {
      StepVerdict.correct => (Icons.check_circle_rounded, AppColors.emerald),
      StepVerdict.partial => (Icons.error_rounded, const Color(0xFFF9A825)),
      StepVerdict.wrong => (Icons.cancel_rounded, AppColors.error),
    };
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$index. ${step.title} · ${step.verdict.label}',
                  style: text.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  step.comment,
                  style: text.bodyMedium?.copyWith(height: 1.5),
                ),
                if (step.correction.isNotEmpty &&
                    step.verdict != StepVerdict.correct) ...[
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.emerald.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '✔ ${step.correction}',
                      style: text.bodyMedium?.copyWith(height: 1.5),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({
    required this.icon,
    required this.title,
    required this.child,
    this.accent = AppColors.emerald,
  });

  final IconData icon;
  final String title;
  final Widget child;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: accent.withValues(alpha: 0.15),
                child: Icon(icon, color: accent, size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}
