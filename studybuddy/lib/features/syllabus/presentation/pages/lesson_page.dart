import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/open_link.dart';
import '../../../auth/domain/student_profile.dart';
import '../../domain/curriculum.dart';
import '../../domain/lesson_content.dart';
import '../../domain/lesson_search.dart';
import '../../domain/progress.dart';
import '../../domain/repositories.dart';
import '../bloc/lesson_cubit.dart';
import '../bloc/study_cubit.dart';
import '../../../../core/reports/content_report.dart';
import '../../../../core/reports/report_sheet.dart';
import '../widgets/add_video_sheet.dart';
import '../widgets/subject_visuals.dart';

/// Opens a lesson from anywhere below the StudyCubit.
void openLesson(
  BuildContext context,
  Lesson lesson, {
  LessonResource? resource,
}) {
  final study = context.read<StudyCubit>();
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => BlocProvider.value(
        value: study,
        child: LessonPage(lesson: lesson, initialResource: resource),
      ),
    ),
  );
}

String levelLabelOf(StudentProfile profile) => [
  profile.level.label,
  if (profile.stream != null) 'شعبة ${profile.stream!.name}',
].join('، ');

class LessonPage extends StatelessWidget {
  const LessonPage({super.key, required this.lesson, this.initialResource});

  final Lesson lesson;
  final LessonResource? initialResource;

  @override
  Widget build(BuildContext context) {
    final study = context.read<StudyCubit>();
    return BlocProvider(
      create: (context) => LessonCubit(
        lesson: lesson,
        uid: study.profile.uid,
        levelLabel: levelLabelOf(study.profile),
        content: context.read<LessonContentRepository>(),
        summaries: context.read<SummaryService>(),
      ),
      child: DefaultTabController(
        length: 3,
        initialIndex: switch (initialResource) {
          LessonResource.videos => 1,
          LessonResource.pastPapers => 2,
          _ => 0,
        },
        child: Scaffold(
          appBar: AppBar(
            title: Text(lesson.subjectName),
            bottom: const TabBar(
              labelStyle: TextStyle(fontWeight: FontWeight.w700),
              tabs: [
                Tab(icon: Icon(Icons.bolt_rounded), text: 'ملخص 5 دقائق'),
                Tab(
                  icon: Icon(Icons.smart_display_rounded),
                  text: 'أفضل الشروحات',
                ),
                Tab(icon: Icon(Icons.history_edu_rounded), text: 'الحوليات'),
              ],
            ),
          ),
          body: Column(
            children: [
              _LessonHeader(lesson: lesson),
              const Expanded(
                child: TabBarView(
                  children: [_SummaryTab(), _VideosTab(), _PastPapersTab()],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LessonHeader extends StatelessWidget {
  const _LessonHeader({required this.lesson});

  final Lesson lesson;

  @override
  Widget build(BuildContext context) {
    final status = context.select(
      (StudyCubit c) => c.state.progress.statusOf(lesson.id),
    );
    final text = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            lesson.unitTitle,
            style: text.labelMedium?.copyWith(color: Colors.grey.shade700),
          ),
          Text(
            lesson.title,
            style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in LessonStatus.values)
                ChoiceChip(
                  avatar: Icon(statusIcon(s), size: 18, color: statusColor(s)),
                  label: Text(s.label),
                  selected: s == status,
                  showCheckmark: false,
                  onSelected: (_) =>
                      context.read<StudyCubit>().setStatus(lesson.id, s),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryTab extends StatelessWidget {
  const _SummaryTab();

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<LessonCubit>();
    final state = context.watch<LessonCubit>().state;
    final content = state.content;
    if (content == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final children = <Widget>[];
    if (content.summary != null) {
      children.add(
        _SummaryBlock(
          icon: Icons.verified_rounded,
          title: 'ملخص معتمد',
          items: content.summary!
              .split('\n')
              .map((l) => l.trim())
              .where((l) => l.isNotEmpty)
              .toList(),
        ),
      );
    }
    if (content.summaryPdfUrl != null) {
      children.add(
        OutlinedButton.icon(
          onPressed: () => openExternal(context, content.summaryPdfUrl!),
          icon: const Icon(Icons.picture_as_pdf_rounded),
          label: const Text('افتح الملخص PDF'),
        ),
      );
    }

    final summary = state.summary;
    if (summary != null) {
      children.addAll([
        const _AiNotice(),
        _SummaryBlock(
          icon: Icons.lightbulb_rounded,
          title: 'الأفكار الأساسية',
          items: summary.keyPoints,
        ),
        if (summary.definitions.isNotEmpty)
          _SummaryBlock(
            icon: Icons.menu_book_rounded,
            title: 'تعاريف',
            items: [
              for (final d in summary.definitions) '${d.term}: ${d.meaning}',
            ],
          ),
        if (summary.formulas.isNotEmpty)
          _SummaryBlock(
            icon: Icons.functions_rounded,
            title: 'القوانين والعلاقات',
            items: summary.formulas,
            ltr: true,
          ),
        if (summary.examTips.isNotEmpty)
          _SummaryBlock(
            icon: Icons.emoji_events_rounded,
            title: 'نصائح للامتحان',
            items: summary.examTips,
            accent: AppColors.gold,
          ),
        if (summary.commonMistakes.isNotEmpty)
          _SummaryBlock(
            icon: Icons.report_rounded,
            title: 'أخطاء شائعة',
            items: summary.commonMistakes,
            accent: const Color(0xFFE65100),
          ),
        TextButton.icon(
          onPressed: state.summaryLoading
              ? null
              : () => cubit.summarize(refresh: true),
          icon: const Icon(Icons.refresh),
          label: const Text('أعد توليد الملخص'),
        ),
        ReportButton(
          kind: ReportKind.aiSummary,
          targetId: cubit.lesson.id,
          excerpt: [
            ...summary.keyPoints,
            for (final d in summary.definitions) '${d.term}: ${d.meaning}',
            ...summary.formulas,
            ...summary.examTips,
            ...summary.commonMistakes,
          ].join('\n'),
        ),
      ]);
    } else if (content.summary == null) {
      children.add(
        _GenerateSummary(
          available: cubit.canSummarize,
          loading: state.summaryLoading,
          error: state.summaryError,
          onGenerate: cubit.summarize,
        ),
      );
    }

    return ListView(padding: const EdgeInsets.all(16), children: children);
  }
}

class _AiNotice extends StatelessWidget {
  const _AiNotice();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          const Icon(Icons.auto_awesome, size: 16, color: AppColors.emerald),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              'مولّد بالذكاء الاصطناعي: راجعه مع كتابك المدرسي',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: Colors.grey.shade700),
            ),
          ),
        ],
      ),
    );
  }
}

class _GenerateSummary extends StatelessWidget {
  const _GenerateSummary({
    required this.available,
    required this.loading,
    required this.error,
    required this.onGenerate,
  });

  final bool available;
  final bool loading;
  final String? error;
  final VoidCallback onGenerate;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const Icon(Icons.bolt_rounded, size: 48, color: AppColors.gold),
          const SizedBox(height: 8),
          const Text(
            'ملخص بصري مركّز للدرس: الأفكار الأساسية، التعاريف، القوانين، '
            'ونصائح الامتحان.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          if (error != null) ...[
            Text(
              error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.error),
            ),
            const SizedBox(height: 12),
          ],
          FilledButton.icon(
            onPressed: available && !loading ? onGenerate : null,
            icon: loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.auto_awesome),
            label: Text(loading ? 'جارٍ التلخيص…' : 'لخّص لي الدرس'),
          ),
          if (!available) ...[
            const SizedBox(height: 10),
            Text(
              'التلخيص الذكي يحتاج ربط التطبيق بـ Firebase AI Logic.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: Colors.grey.shade700),
            ),
          ],
        ],
      ),
    );
  }
}

class _SummaryBlock extends StatelessWidget {
  const _SummaryBlock({
    required this.icon,
    required this.title,
    required this.items,
    this.accent = AppColors.emerald,
    this.ltr = false,
  });

  final IconData icon;
  final String title;
  final List<String> items;
  final Color accent;

  /// Formulas read left to right.
  final bool ltr;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: accent),
              const SizedBox(width: 8),
              Text(
                title,
                style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      item,
                      textDirection: ltr ? TextDirection.ltr : null,
                      textAlign: ltr ? TextAlign.end : null,
                      style: text.bodyLarge?.copyWith(height: 1.5),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _VideosTab extends StatelessWidget {
  const _VideosTab();

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<LessonCubit>();
    final state = context.watch<LessonCubit>().state;
    final videos = state.videos;
    final lesson = cubit.lesson;
    final searchUrl = Uri.https('www.youtube.com', '/results', {
      'search_query': 'شرح درس ${lesson.title} ${lesson.subjectName}',
    });

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'أفضل 3 شروحات لهذا الدرس حسب تقييم الطلبة',
          style: Theme.of(context).textTheme.titleSmall
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        if (videos == null)
          const Center(child: CircularProgressIndicator())
        else if (videos.isEmpty)
          const SectionCard(
            padding: EdgeInsets.all(20),
            child: Text(
              'لم يقترح أحد فيديو لهذا الدرس بعد. كن أول من يضيف شرح أستاذ '
              'استفدت منه، ليصل لغيرك دون بحث.',
              textAlign: TextAlign.center,
            ),
          )
        else
          for (final (i, video) in videos.indexed)
            _VideoCard(
              rank: i + 1,
              lessonId: lesson.id,
              video: video,
              myVote: state.myVotes[video.id] ?? 0,
              onVote: (v) => cubit.vote(video, v),
            ),
        const SizedBox(height: 8),
        FilledButton.icon(
          onPressed: () => showAddVideoSheet(context, cubit),
          icon: const Icon(Icons.add_link_rounded),
          label: const Text('اقترح شرحاً من يوتيوب'),
        ),
        TextButton.icon(
          onPressed: () => openExternal(context, searchUrl),
          icon: const Icon(Icons.search),
          label: const Text('ابحث عن الدرس في يوتيوب'),
        ),
      ],
    );
  }
}

class _VideoCard extends StatelessWidget {
  const _VideoCard({
    required this.rank,
    required this.lessonId,
    required this.video,
    required this.myVote,
    required this.onVote,
  });

  final int rank;
  final String lessonId;
  final LessonVideo video;
  final int myVote;
  final ValueChanged<int> onVote;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return SectionCard(
      padding: EdgeInsets.zero,
      onTap: () => openExternal(context, video.watchUrl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  video.thumbnailUrl.toString(),
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    color: Colors.black87,
                    child: const Icon(
                      Icons.smart_display_rounded,
                      color: Colors.white54,
                      size: 48,
                    ),
                  ),
                ),
                PositionedDirectional(
                  top: 8,
                  start: 8,
                  child: CircleAvatar(
                    radius: 16,
                    backgroundColor: AppColors.gold,
                    child: Text(
                      '$rank',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        color: AppColors.ink,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 6, 6),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        video.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: text.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (video.channel.isNotEmpty)
                        Text(
                          video.channel,
                          style: text.bodySmall?.copyWith(
                            color: Colors.grey.shade700,
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'مفيد',
                  onPressed: () => onVote(1),
                  icon: Icon(
                    myVote == 1
                        ? Icons.thumb_up_alt_rounded
                        : Icons.thumb_up_alt_outlined,
                    color: myVote == 1 ? AppColors.emerald : null,
                  ),
                ),
                Text(
                  '${video.score}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                IconButton(
                  tooltip: 'غير مفيد',
                  onPressed: () => onVote(-1),
                  icon: Icon(
                    myVote == -1
                        ? Icons.thumb_down_alt_rounded
                        : Icons.thumb_down_alt_outlined,
                    color: myVote == -1 ? AppColors.error : null,
                  ),
                ),
                ReportButton(
                  kind: ReportKind.video,
                  targetId: '$lessonId/${video.id}',
                  excerpt:
                      '${video.title}\n${video.channel}\n${video.watchUrl}',
                  compact: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PastPapersTab extends StatelessWidget {
  const _PastPapersTab();

  @override
  Widget build(BuildContext context) {
    final content = context.watch<LessonCubit>().state.content;
    if (content == null) {
      return const Center(child: CircularProgressIndicator());
    }
    final papers = content.pastPapers;
    final text = Theme.of(context).textTheme;
    if (papers.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          SectionCard(
            padding: EdgeInsets.all(20),
            child: Text(
              'نجمع تدريجياً كل تمارين البكالوريا (2010–2026) التي ورد فيها هذا '
              'الدرس مع حلولها النموذجية. لم تُضف حوليات هذا الدرس بعد.',
              textAlign: TextAlign.center,
            ),
          ),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'ورد هذا الدرس في ${papers.length} موضوع',
          style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        for (final paper in papers)
          SectionCard(
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.emerald.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${paper.year}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      color: AppColors.emeraldDark,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(paper.title)),
                if (paper.subjectUrl != null)
                  IconButton(
                    tooltip: 'الموضوع',
                    icon: const Icon(Icons.description_outlined),
                    onPressed: () => openExternal(context, paper.subjectUrl!),
                  ),
                if (paper.solutionUrl != null)
                  IconButton(
                    tooltip: 'الحل النموذجي',
                    icon: const Icon(
                      Icons.task_alt_rounded,
                      color: AppColors.emerald,
                    ),
                    onPressed: () => openExternal(context, paper.solutionUrl!),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
