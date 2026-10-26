import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/ai/ai_client.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../syllabus/presentation/bloc/study_cubit.dart';
import '../../../syllabus/presentation/pages/lesson_page.dart'
    show levelLabelOf;
import '../../domain/grader_repositories.dart';
import '../bloc/grader_cubit.dart';
import '../bloc/grading_history_cubit.dart';
import '../widgets/grading_result_view.dart';

/// "مصحح الأستاذ الافتراضي".
class GraderPage extends StatelessWidget {
  const GraderPage({super.key});

  @override
  Widget build(BuildContext context) {
    final study = context.read<StudyCubit>();
    return BlocProvider(
      create: (context) => GraderCubit(
        uid: study.profile.uid,
        grader: context.read<HomeworkGrader>(),
        history: context.read<GradingHistoryRepository>(),
        initialSubjectId: study.state.subjects.firstOrNull?.id,
      ),
      child: const _GraderView(),
    );
  }
}

class _GraderView extends StatelessWidget {
  const _GraderView();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<GraderCubit>().state;
    final cubit = context.read<GraderCubit>();
    return Scaffold(
      appBar: AppBar(title: const Text('المصحح الذكي')),
      body: switch (state.status) {
        GraderStatus.grading => const _Grading(),
        GraderStatus.done => GradingResultView(
          result: state.result!,
          footer: FilledButton.icon(
            onPressed: cubit.reset,
            icon: const Icon(Icons.document_scanner_rounded),
            label: const Text('صحّح تمريناً آخر'),
          ),
        ),
        GraderStatus.editing => const _GraderForm(),
      },
    );
  }
}

class _Grading extends StatelessWidget {
  const _Grading();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 56,
            height: 56,
            child: CircularProgressIndicator(strokeWidth: 5),
          ),
          SizedBox(height: 20),
          Text(
            'الأستاذ يصحّح ورقتك…',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
          ),
          SizedBox(height: 6),
          Text('يراجع المنهجية خطوة بخطوة وفق سلّم التنقيط'),
        ],
      ),
    );
  }
}

Future<AiImage?> _pick(BuildContext context) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.photo_camera_rounded),
            title: const Text('التقط صورة'),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_rounded),
            title: const Text('اختر من المعرض'),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
        ],
      ),
    ),
  );
  if (source == null) return null;
  // Downscaled and recompressed on the device: a page stays readable at
  // 1600 px and weighs a few hundred KB instead of several MB.
  final file = await ImagePicker().pickImage(
    source: source,
    maxWidth: 1600,
    maxHeight: 1600,
    imageQuality: 75,
  );
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  final name = file.name.toLowerCase();
  return AiImage(
    bytes,
    mimeType:
        file.mimeType ??
        (name.endsWith('.png')
            ? 'image/png'
            : name.endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg'),
  );
}

class _GraderForm extends StatelessWidget {
  const _GraderForm();

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<GraderCubit>();
    final state = context.watch<GraderCubit>().state;
    final study = context.watch<StudyCubit>();
    final subjects = study.state.subjects;
    final subject = subjects.where((s) => s.id == state.subjectId).firstOrNull;
    final lesson = subject?.lessons
        .where((l) => l.id == state.lessonId)
        .firstOrNull;
    final text = Theme.of(context).textTheme;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.emerald, AppColors.emeraldDark],
            ),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.document_scanner_rounded,
                color: AppColors.gold,
                size: 40,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'صوّر ورقة إجابتك بخط يدك، ويصحّحها لك مصحح وفق المنهجية '
                  'الرسمية: العلامة، نقد المنهجية، وتصحيح كل خطوة.',
                  style: text.bodyMedium?.copyWith(color: Colors.white),
                ),
              ),
            ],
          ),
        ),
        if (!cubit.isAvailable) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'المصحح الذكي يحتاج ربط التطبيق بـ Firebase AI Logic '
              '(أو مفتاح Gemini للتجربة). يمكنك تجهيز الصور الآن.',
            ),
          ),
        ],
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          initialValue: state.subjectId,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'المادة'),
          items: [
            for (final s in subjects)
              DropdownMenuItem(value: s.id, child: Text(s.name)),
          ],
          onChanged: (id) {
            if (id != null) cubit.subjectSelected(id);
          },
        ),
        const SizedBox(height: 12),
        if (subject != null)
          DropdownButtonFormField<String?>(
            key: ValueKey(subject.id),
            initialValue: state.lessonId,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'الدرس (اختياري)'),
            items: [
              const DropdownMenuItem<String?>(value: null, child: Text('—')),
              for (final l in subject.lessons)
                DropdownMenuItem<String?>(
                  value: l.id,
                  child: Text(l.title, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: cubit.lessonSelected,
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                initialValue: state.maxMark,
                onChanged: cubit.maxMarkChanged,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'علامة السؤال',
                  hintText: 'مثلاً 3',
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                ),
                onPressed: () async {
                  if (state.questionImage != null) {
                    cubit.setQuestionImage(null);
                    return;
                  }
                  final image = await _pick(context);
                  if (image != null) cubit.setQuestionImage(image);
                },
                icon: Icon(
                  state.questionImage != null
                      ? Icons.check_circle_rounded
                      : Icons.add_a_photo_outlined,
                ),
                label: Text(
                  state.questionImage != null
                      ? 'نص التمرين مرفق (إزالة)'
                      : 'صوّر نص التمرين',
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextFormField(
          initialValue: state.questionText,
          onChanged: cubit.questionChanged,
          minLines: 2,
          maxLines: 5,
          decoration: const InputDecoration(
            labelText: 'نص السؤال (اختياري)',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'ورقة الإجابة',
          style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        _Pages(
          pages: state.pages,
          onAdd: () async {
            final image = await _pick(context);
            if (image != null) cubit.addPage(image);
          },
          onRemove: cubit.removePage,
        ),
        if (state.error != null) ...[
          const SizedBox(height: 12),
          Text(state.error!, style: const TextStyle(color: AppColors.error)),
        ],
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: state.canGrade && cubit.isAvailable
              ? () => cubit.grade(
                  subjectName: subject!.name,
                  levelLabel: levelLabelOf(study.profile),
                  lessonTitle: lesson?.title,
                )
              : null,
          icon: const Icon(Icons.fact_check_rounded),
          label: const Text('صحّح إجابتي'),
        ),
        const SizedBox(height: 24),
        const _History(),
      ],
    );
  }
}

class _Pages extends StatelessWidget {
  const _Pages({
    required this.pages,
    required this.onAdd,
    required this.onRemove,
  });

  final List<AiImage> pages;
  final VoidCallback onAdd;
  final ValueChanged<int> onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 130,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final (i, page) in pages.indexed)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 10),
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.memory(
                      page.bytes,
                      width: 100,
                      height: 130,
                      fit: BoxFit.cover,
                    ),
                  ),
                  PositionedDirectional(
                    top: 4,
                    end: 4,
                    child: InkWell(
                      onTap: () => onRemove(i),
                      child: const CircleAvatar(
                        radius: 13,
                        backgroundColor: Colors.black54,
                        child: Icon(Icons.close, size: 16, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (pages.length < GraderState.maxPages)
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: onAdd,
              child: Container(
                width: 100,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.emerald, width: 1.5),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.add_a_photo_rounded,
                      color: AppColors.emerald,
                      size: 32,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      pages.isEmpty ? 'صوّر إجابتك' : 'صفحة أخرى',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _History extends StatelessWidget {
  const _History();

  @override
  Widget build(BuildContext context) {
    final records = context.watch<GradingHistoryCubit>().state;
    if (records.isEmpty) return const SizedBox.shrink();
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'تصحيحاتك السابقة',
          style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        for (final r in records.take(10))
          Card(
            elevation: 0,
            color: Colors.white,
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(
                r.lessonTitle ?? r.subjectName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(
                '${r.subjectName} · ${r.createdAt.day}/${r.createdAt.month}',
              ),
              trailing: Chip(
                label: Text(
                  r.result.markLabel,
                  textDirection: TextDirection.ltr,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => Scaffold(
                    appBar: AppBar(title: Text(r.subjectName)),
                    body: GradingResultView(result: r.result),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
