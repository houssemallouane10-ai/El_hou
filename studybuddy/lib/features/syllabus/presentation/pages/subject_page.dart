import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/curriculum.dart';
import '../bloc/study_cubit.dart';
import '../widgets/subject_visuals.dart';
import 'lesson_page.dart';

class SubjectPage extends StatelessWidget {
  const SubjectPage({super.key, required this.subjectId});

  final String subjectId;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<StudyCubit>().state;
    final subject = state.subjects.firstWhere((s) => s.id == subjectId);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(subject.name)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          ProgressLine(value: state.subjectCompletion(subject)),
          const SizedBox(height: 16),
          for (final unit in subject.units) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 8, top: 4),
              child: Text(
                unit.title,
                style: text.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: Colors.grey.shade800,
                ),
              ),
            ),
            for (final lesson in unit.lessons) _LessonRow(lesson: lesson),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class _LessonRow extends StatelessWidget {
  const _LessonRow({required this.lesson});

  final Lesson lesson;

  @override
  Widget build(BuildContext context) {
    final status = context.select(
      (StudyCubit c) => c.state.progress.statusOf(lesson.id),
    );
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: () => openLesson(context, lesson),
      child: Row(
        children: [
          Icon(statusIcon(status), color: statusColor(status)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              lesson.title,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}
