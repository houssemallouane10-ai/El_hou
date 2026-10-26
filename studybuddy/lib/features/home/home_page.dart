import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../auth/presentation/bloc/auth_bloc.dart';
import '../grader/presentation/bloc/grading_history_cubit.dart';
import '../syllabus/domain/progress.dart';
import '../syllabus/domain/study_plan.dart';
import '../syllabus/presentation/bloc/study_cubit.dart';
import '../syllabus/presentation/pages/lesson_page.dart';
import '../syllabus/presentation/widgets/subject_visuals.dart';
import 'home_shell.dart';

/// The dashboard: overall progress, days to the exam and today's plan.
class HomePage extends StatelessWidget {
  const HomePage({super.key, required this.onOpenTab});

  final ValueChanged<HomeTab> onOpenTab;

  Future<void> _pickExamDate(BuildContext context, DateTime current) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current.isBefore(now) ? now : current,
      firstDate: now,
      lastDate: DateTime(now.year + 2),
      helpText: 'تاريخ الامتحان',
    );
    if (picked != null && context.mounted) {
      context.read<StudyCubit>().setExamDate(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.watch<StudyCubit>();
    final state = cubit.state;
    final profile = cubit.profile;
    final weakness = context.watch<GradingHistoryCubit>().weakness;
    final now = DateTime.now();
    final examDate = cubit.examDate(now);
    final text = Theme.of(context).textTheme;
    final plan = buildDailyPlan(
      subjects: state.subjects,
      progress: state.progress,
      examDate: examDate,
      today: now,
      weakSubjects: weakness,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.appName),
        actions: [
          IconButton(
            tooltip: AppStrings.signOut,
            icon: const Icon(Icons.logout),
            onPressed: () =>
                context.read<AuthBloc>().add(const AuthSignOutRequested()),
          ),
        ],
      ),
      body: state.loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.emerald, AppColors.emeraldDark],
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'أهلاً ${profile.fullName.split(' ').first} 👋',
                        style: text.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        levelLabelOf(profile),
                        style: text.bodyMedium?.copyWith(color: Colors.white70),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _Stat(
                              value:
                                  '${(state.overallCompletion * 100).round()}%',
                              label: 'من المنهاج (بالمعاملات)',
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => _pickExamDate(context, examDate),
                              child: _Stat(
                                value: plan.daysLeft > 0
                                    ? '${plan.daysLeft}'
                                    : '—',
                                label: 'يوماً على الامتحان ✎',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    const Icon(Icons.today_rounded, color: AppColors.emerald),
                    const SizedBox(width: 8),
                    Text(
                      'خطة اليوم',
                      style: text.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '${plan.remaining} درس متبقٍ',
                      style: text.bodySmall?.copyWith(
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (plan.lessons.isEmpty)
                  const SectionCard(
                    padding: EdgeInsets.all(20),
                    child: Text(
                      'أتقنت كل الدروس! خصّص وقتك للحوليات والمراجعة العامة 🎉',
                      textAlign: TextAlign.center,
                    ),
                  ),
                for (final item in plan.lessons) _PlanTile(item: item),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _Shortcut(
                        icon: Icons.document_scanner_rounded,
                        label: 'صحّح تمريناً',
                        onTap: () => onOpenTab(HomeTab.grader),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Shortcut(
                        icon: Icons.timer_rounded,
                        label: 'غرفة تركيز',
                        onTap: () => onOpenTab(HomeTab.focus),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Shortcut(
                        icon: Icons.headphones_rounded,
                        label: 'استمع',
                        onTap: () => onOpenTab(HomeTab.audio),
                      ),
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: text.headlineMedium?.copyWith(
            color: AppColors.gold,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(label, style: text.bodySmall?.copyWith(color: Colors.white70)),
      ],
    );
  }
}

class _PlanTile extends StatelessWidget {
  const _PlanTile({required this.item});

  final PlannedLesson item;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final lesson = item.lesson;
    return SectionCard(
      onTap: () => openLesson(context, lesson),
      child: Row(
        children: [
          Icon(statusIcon(item.status), color: statusColor(item.status)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  lesson.title,
                  style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                Text(
                  '${lesson.subjectName} · ${item.reason}',
                  style: text.bodySmall?.copyWith(color: Colors.grey.shade700),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'أتقنته',
            icon: const Icon(Icons.done_all_rounded, color: AppColors.emerald),
            onPressed: () => context.read<StudyCubit>().setStatus(
              lesson.id,
              LessonStatus.mastered,
            ),
          ),
        ],
      ),
    );
  }
}

class _Shortcut extends StatelessWidget {
  const _Shortcut({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      child: Column(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.gold.withValues(alpha: 0.25),
            child: Icon(icon, color: AppColors.emeraldDark),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
