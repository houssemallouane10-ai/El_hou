import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/audio/playback_cubit.dart';
import '../../../core/constants/app_colors.dart';
import '../../focus/presentation/pages/focus_lobby_page.dart' show formatClock;
import '../domain/audio_track.dart';

void openNowPlaying(BuildContext context, AudioTrack track) {
  Navigator.of(
    context,
  ).push(MaterialPageRoute<void>(builder: (_) => NowPlayingPage(track: track)));
}

/// Player controls with the episode's text to follow along.
class NowPlayingPage extends StatelessWidget {
  const NowPlayingPage({super.key, required this.track});

  final AudioTrack track;

  @override
  Widget build(BuildContext context) {
    final playable = track.toPlayable();
    final cubit = context.read<PlaybackCubit>();
    final state = context.watch<PlaybackCubit>().state;
    final isCurrent = state.current?.id == playable.id;
    final playing = isCurrent && state.playing;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: Text(track.category.label)),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  track.title,
                  style: text.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 16),
                for (final paragraph in track.transcript.split(
                  RegExp(r'(?<=[.؛])\s+'),
                ))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(
                      paragraph,
                      style: text.bodyLarge?.copyWith(height: 1.7),
                    ),
                  ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            decoration: const BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(blurRadius: 12, color: Colors.black12)],
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isCurrent && state.error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        state.error!,
                        style: const TextStyle(color: AppColors.error),
                      ),
                    ),
                  if (isCurrent && !playable.isSpeech && state.duration != null)
                    Row(
                      children: [
                        Text(formatClock(state.position)),
                        Expanded(
                          child: Slider(
                            value: state.position.inMilliseconds
                                .clamp(0, state.duration!.inMilliseconds)
                                .toDouble(),
                            max: state.duration!.inMilliseconds
                                .toDouble()
                                .clamp(1, double.infinity),
                            onChanged: (v) =>
                                cubit.seek(Duration(milliseconds: v.round())),
                          ),
                        ),
                        Text(formatClock(state.duration!)),
                      ],
                    )
                  else
                    LinearProgressIndicator(
                      value: isCurrent ? (state.progress ?? 0) : 0,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        tooltip: 'من البداية',
                        onPressed: () => cubit.play(playable),
                        icon: const Icon(Icons.replay_rounded),
                      ),
                      const SizedBox(width: 16),
                      IconButton.filled(
                        iconSize: 40,
                        tooltip: playing ? 'إيقاف مؤقت' : 'استمع',
                        onPressed: () => cubit.toggle(playable),
                        icon: state.loading && isCurrent
                            ? const SizedBox(
                                width: 40,
                                height: 40,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                ),
                              )
                            : Icon(
                                playing
                                    ? Icons.pause_rounded
                                    : Icons.play_arrow_rounded,
                              ),
                      ),
                      const SizedBox(width: 16),
                      IconButton(
                        tooltip: 'إيقاف',
                        onPressed: isCurrent ? cubit.stop : null,
                        icon: const Icon(Icons.stop_rounded),
                      ),
                    ],
                  ),
                  if (playable.isSpeech)
                    Text(
                      'تُقرأ هذه الحلقة بصوت هاتفك. الحلقات المسجّلة تستمر '
                      'والشاشة مقفلة.',
                      textAlign: TextAlign.center,
                      style: text.bodySmall?.copyWith(
                        color: Colors.grey.shade600,
                      ),
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
