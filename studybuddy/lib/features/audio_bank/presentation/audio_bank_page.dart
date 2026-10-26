import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/audio/playback_cubit.dart';
import '../../../core/constants/app_colors.dart';
import '../../syllabus/presentation/bloc/study_cubit.dart';
import '../../syllabus/presentation/widgets/subject_visuals.dart';
import '../domain/audio_track.dart';
import 'now_playing_page.dart';

/// "بنك الصوتيات": dates, figures and summaries of the memorization subjects
/// to listen to on the bus or during breaks.
class AudioBankPage extends StatefulWidget {
  const AudioBankPage({super.key});

  @override
  State<AudioBankPage> createState() => _AudioBankPageState();
}

class _AudioBankPageState extends State<AudioBankPage> {
  late Future<List<AudioTrack>> _tracks = context
      .read<AudioLibraryRepository>()
      .load();
  AudioCategory? _category;

  @override
  Widget build(BuildContext context) {
    final level = context.read<StudyCubit>().profile.level;
    return Scaffold(
      appBar: AppBar(title: const Text('بنك الصوتيات')),
      body: FutureBuilder<List<AudioTrack>>(
        future: _tracks,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: TextButton(
                onPressed: () => setState(() {
                  _tracks = context.read<AudioLibraryRepository>().load();
                }),
                child: const Text('تعذّر التحميل، أعد المحاولة'),
              ),
            );
          }
          final all = snapshot.data!.where((t) => t.suits(level)).toList();
          final shown = _category == null
              ? all
              : all.where((t) => t.category == _category).toList();
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
            children: [
              Text(
                'استمع للتواريخ والشخصيات والملخصات في الحافلة أو وقت الراحة، '
                'حتى والشاشة مقفلة.',
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(color: Colors.grey.shade700),
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _Filter(
                      label: 'الكل',
                      selected: _category == null,
                      onTap: () => setState(() => _category = null),
                    ),
                    for (final c in AudioCategory.values)
                      _Filter(
                        label: c.label,
                        selected: _category == c,
                        onTap: () => setState(() => _category = c),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (shown.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'لا توجد حلقات في هذا القسم لمستواك بعد.',
                    textAlign: TextAlign.center,
                  ),
                ),
              for (final track in shown) _TrackTile(track: track),
            ],
          );
        },
      ),
    );
  }
}

class _Filter extends StatelessWidget {
  const _Filter({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}

class _TrackTile extends StatelessWidget {
  const _TrackTile({required this.track});

  final AudioTrack track;

  @override
  Widget build(BuildContext context) {
    final playable = track.toPlayable();
    final playback = context.watch<PlaybackCubit>().state;
    final isCurrent = playback.current?.id == playable.id;
    final playing = isCurrent && playback.playing;
    final text = Theme.of(context).textTheme;
    return SectionCard(
      onTap: () {
        if (!isCurrent) context.read<PlaybackCubit>().play(playable);
        openNowPlaying(context, track);
      },
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.emerald.withValues(alpha: 0.1),
                child: Icon(
                  subjectIcon(track.category.icon),
                  color: AppColors.emerald,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      track.title,
                      style: text.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      '${track.category.label} · ${track.estimatedMinutes} د · '
                      '${track.isRecording ? 'تسجيل صوتي' : 'قراءة آلية'}',
                      style: text.bodySmall?.copyWith(
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton.filled(
                tooltip: playing ? 'إيقاف مؤقت' : 'استمع',
                onPressed: () => context.read<PlaybackCubit>().toggle(playable),
                icon: Icon(
                  playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                ),
              ),
            ],
          ),
          if (isCurrent && playback.progress != null) ...[
            const SizedBox(height: 10),
            LinearProgressIndicator(
              value: playback.progress,
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ],
      ),
    );
  }
}
