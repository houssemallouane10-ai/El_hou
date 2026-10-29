import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/algeria_data.dart';
import '../../domain/lesson_search.dart';
import '../bloc/study_cubit.dart';
import 'lesson_page.dart';

/// "تصفية المحتوى": type what you want, get the lesson and the right
/// resource without browsing.
class LessonSearchPage extends StatefulWidget {
  const LessonSearchPage({super.key});

  @override
  State<LessonSearchPage> createState() => _LessonSearchPageState();
}

class _LessonSearchPageState extends State<LessonSearchPage> {
  final _query = TextEditingController();
  List<LessonMatch> _results = const [];

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _search(String value) {
    final cubit = context.read<StudyCubit>();
    final curriculum = cubit.state.curriculum;
    if (curriculum == null) return;
    setState(() {
      _results = searchLessons(
        curriculum: curriculum,
        query: value,
        defaultTrack: cubit.trackKey,
      );
    });
  }

  static String _resourceLabel(LessonResource? r) => switch (r) {
    LessonResource.videos => 'أفضل الشروحات',
    LessonResource.pastPapers => 'الحوليات',
    _ => 'ملخص 5 دقائق',
  };

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _query,
          autofocus: true,
          onChanged: _search,
          textInputAction: TextInputAction.search,
          decoration: const InputDecoration(
            hintText: 'ماذا تريد أن تراجع؟',
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
          ),
        ),
      ),
      body: _query.text.trim().isEmpty
          ? Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('جرّب مثلاً:', style: text.titleSmall),
                  const SizedBox(height: 8),
                  for (final example in const [
                    'ملخص درس الموافقات شعبة رياضيات',
                    'شرح المنعكس العضلي',
                    'حوليات الدالة الأسية',
                    'الثورة التحريرية',
                  ])
                    ActionChip(
                      label: Text(example),
                      onPressed: () {
                        _query.text = example;
                        _search(example);
                      },
                    ),
                ],
              ),
            )
          : _results.isEmpty
          ? const Center(child: Text('لا توجد نتائج، جرّب كلمات أخرى'))
          : ListView.separated(
              itemCount: _results.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final match = _results[i];
                final lesson = match.lesson;
                final otherStream = streamById(match.trackKey);
                return ListTile(
                  title: Text(
                    lesson.title,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    [
                      lesson.subjectName,
                      if (otherStream != null) 'شعبة ${otherStream.name}',
                    ].join(' · '),
                  ),
                  trailing: Chip(label: Text(_resourceLabel(match.resource))),
                  onTap: () =>
                      openLesson(context, lesson, resource: match.resource),
                );
              },
            ),
    );
  }
}
