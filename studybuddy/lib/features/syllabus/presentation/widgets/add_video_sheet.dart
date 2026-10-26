import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../domain/lesson_content.dart';
import '../bloc/lesson_cubit.dart';

Future<void> showAddVideoSheet(BuildContext context, LessonCubit cubit) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _AddVideoSheet(cubit: cubit),
  );
}

/// Title and channel from YouTube's public oEmbed endpoint, or null.
Future<({String title, String channel})?> fetchYoutubeInfo(String id) async {
  try {
    final response = await http
        .get(
          Uri.https('www.youtube.com', '/oembed', {
            'url': 'https://www.youtube.com/watch?v=$id',
            'format': 'json',
          }),
        )
        .timeout(const Duration(seconds: 6));
    if (response.statusCode != 200) return null;
    final json = jsonDecode(utf8.decode(response.bodyBytes));
    if (json case {
      'title': final String title,
      'author_name': final String channel,
    }) {
      return (title: title, channel: channel);
    }
  } catch (_) {
    // Offline or blocked: the student types the details instead.
  }
  return null;
}

class _AddVideoSheet extends StatefulWidget {
  const _AddVideoSheet({required this.cubit});

  final LessonCubit cubit;

  @override
  State<_AddVideoSheet> createState() => _AddVideoSheetState();
}

class _AddVideoSheetState extends State<_AddVideoSheet> {
  final _formKey = GlobalKey<FormState>();
  final _url = TextEditingController();
  final _title = TextEditingController();
  final _channel = TextEditingController();
  String? _lookedUp;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _url.dispose();
    _title.dispose();
    _channel.dispose();
    super.dispose();
  }

  Future<void> _onUrlChanged(String value) async {
    final id = parseYoutubeId(value);
    if (id == null || id == _lookedUp) return;
    _lookedUp = id;
    final info = await fetchYoutubeInfo(id);
    if (info == null || !mounted || _lookedUp != id) return;
    setState(() {
      if (_title.text.isEmpty) _title.text = info.title;
      if (_channel.text.isEmpty) _channel.text = info.channel;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final error = await widget.cubit.addVideo(
      youtubeId: parseYoutubeId(_url.text)!,
      title: _title.text,
      channel: _channel.text,
    );
    if (!mounted) return;
    if (error == null) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('شكراً! أضفنا الفيديو وصوّتنا له باسمك')),
      );
    } else {
      setState(() {
        _saving = false;
        _error = error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'اقترح شرحاً لـ «${widget.cubit.lesson.title}»',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _url,
              onChanged: _onUrlChanged,
              textDirection: TextDirection.ltr,
              keyboardType: TextInputType.url,
              validator: (v) => parseYoutubeId(v ?? '') == null
                  ? 'الصق رابط فيديو يوتيوب صحيح'
                  : null,
              decoration: const InputDecoration(
                labelText: 'رابط الفيديو',
                hintText: 'https://youtu.be/…',
                prefixIcon: Icon(Icons.link),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _title,
              validator: (v) =>
                  (v ?? '').trim().length < 3 ? 'أدخل عنوان الفيديو' : null,
              decoration: const InputDecoration(labelText: 'العنوان'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _channel,
              decoration: const InputDecoration(labelText: 'الأستاذ أو القناة'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: Text(_saving ? 'جارٍ الإضافة…' : 'أضف الفيديو'),
            ),
          ],
        ),
      ),
    );
  }
}
