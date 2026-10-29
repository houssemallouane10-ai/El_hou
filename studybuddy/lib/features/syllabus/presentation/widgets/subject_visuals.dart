import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../domain/progress.dart';

IconData subjectIcon(String key) => switch (key) {
  'math' => Icons.functions_rounded,
  'physics' => Icons.bolt_rounded,
  'biology' => Icons.biotech_rounded,
  'chemistry' => Icons.science_rounded,
  'language' => Icons.translate_rounded,
  'philosophy' => Icons.psychology_rounded,
  'history' => Icons.public_rounded,
  'islamic' => Icons.mosque_rounded,
  'civic' => Icons.groups_rounded,
  'engineering' => Icons.engineering_rounded,
  'finance' => Icons.account_balance_wallet_rounded,
  'law' => Icons.gavel_rounded,
  'arts' => Icons.palette_rounded,
  'computer' => Icons.computer_rounded,
  _ => Icons.menu_book_rounded,
};

Color statusColor(LessonStatus status) => switch (status) {
  LessonStatus.todo => Colors.grey.shade400,
  LessonStatus.learning => const Color(0xFF1E88E5),
  LessonStatus.struggling => const Color(0xFFE65100),
  LessonStatus.mastered => AppColors.emerald,
};

IconData statusIcon(LessonStatus status) => switch (status) {
  LessonStatus.todo => Icons.radio_button_unchecked,
  LessonStatus.learning => Icons.timelapse_rounded,
  LessonStatus.struggling => Icons.priority_high_rounded,
  LessonStatus.mastered => Icons.check_circle_rounded,
};

/// A rounded progress bar with its percentage.
class ProgressLine extends StatelessWidget {
  const ProgressLine({super.key, required this.value, this.color});

  final double value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: value,
              minHeight: 8,
              color: color ?? AppColors.emerald,
              backgroundColor: AppColors.emerald.withValues(alpha: 0.1),
            ),
          ),
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 40,
          child: Text(
            '${(value * 100).round()}%',
            textAlign: TextAlign.end,
            style: Theme.of(context).textTheme.labelLarge
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}

/// A white rounded card used across the syllabus screens.
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child, this.onTap, this.padding});

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.grey.shade200),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: padding ?? const EdgeInsets.all(14),
            child: child,
          ),
        ),
      ),
    );
  }
}
