import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../constants/app_colors.dart';
import 'content_report.dart';

/// A small "report" action for AI output and shared content.
class ReportButton extends StatelessWidget {
  const ReportButton({
    super.key,
    required this.kind,
    required this.targetId,
    required this.excerpt,
    this.label = 'أبلغ عن خطأ أو محتوى غير لائق',
    this.compact = false,
  });

  final ReportKind kind;
  final String targetId;
  final String excerpt;
  final String label;

  /// An icon only, for tight rows like video cards.
  final bool compact;

  void _open(BuildContext context) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) =>
        _ReportSheet(kind: kind, targetId: targetId, excerpt: excerpt),
  );

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return IconButton(
        tooltip: 'إبلاغ',
        icon: const Icon(Icons.flag_outlined),
        onPressed: () => _open(context),
      );
    }
    return TextButton.icon(
      style: TextButton.styleFrom(foregroundColor: Colors.grey.shade700),
      onPressed: () => _open(context),
      icon: const Icon(Icons.flag_outlined, size: 18),
      label: Text(label),
    );
  }
}

class _ReportSheet extends StatefulWidget {
  const _ReportSheet({
    required this.kind,
    required this.targetId,
    required this.excerpt,
  });

  final ReportKind kind;
  final String targetId;
  final String excerpt;

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  final _details = TextEditingController();
  ReportReason? _reason;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final uid = context.read<AuthBloc>().state.user?.uid;
    if (_reason == null || uid == null) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await context.read<ReportRepository>().submit(
        uid,
        ContentReport(
          kind: widget.kind,
          targetId: widget.targetId,
          reason: _reason!,
          details: _details.text,
          excerpt: widget.excerpt,
        ),
      );
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).pop();
      messenger.showSnackBar(
        const SnackBar(content: Text('شكراً، وصلنا بلاغك وسنراجعه')),
      );
    } catch (_) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = 'تعذّر إرسال البلاغ، تحقق من اتصالك';
        });
      }
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'الإبلاغ عن محتوى',
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final r in ReportReason.values)
                ChoiceChip(
                  label: Text(r.label),
                  selected: _reason == r,
                  onSelected: _sending
                      ? null
                      : (_) => setState(() => _reason = r),
                ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _details,
            maxLines: 3,
            maxLength: ContentReport.maxDetails,
            decoration: const InputDecoration(
              labelText: 'تفاصيل (اختياري)',
              alignLabelWithHint: true,
            ),
          ),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: AppColors.error)),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _reason == null || _sending ? null : _send,
            child: Text(_sending ? 'جارٍ الإرسال…' : 'أرسل البلاغ'),
          ),
        ],
      ),
    );
  }
}
