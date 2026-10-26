import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../constants/app_colors.dart';
import 'playback_cubit.dart';

/// A slim bar above the navigation showing what is playing anywhere in the
/// app, so audio started in one tab can be paused from another.
class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<PlaybackCubit>().state;
    final current = state.current;
    if (current == null) return const SizedBox.shrink();
    final cubit = context.read<PlaybackCubit>();
    return Material(
      color: AppColors.ink,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          LinearProgressIndicator(
            value: state.progress ?? 0,
            minHeight: 2,
            color: AppColors.gold,
            backgroundColor: Colors.white12,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                const Icon(Icons.graphic_eq_rounded, color: AppColors.gold),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    current.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: state.playing ? 'إيقاف مؤقت' : 'استمع',
                  color: Colors.white,
                  onPressed: state.playing ? cubit.pause : cubit.resume,
                  icon: Icon(
                    state.playing
                        ? Icons.pause_rounded
                        : Icons.play_arrow_rounded,
                  ),
                ),
                IconButton(
                  tooltip: 'إغلاق',
                  color: Colors.white70,
                  onPressed: cubit.stop,
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
