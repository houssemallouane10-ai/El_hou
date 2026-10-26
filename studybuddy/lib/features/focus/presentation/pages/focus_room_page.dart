import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/audio/playback_cubit.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../syllabus/presentation/bloc/study_cubit.dart';
import '../../domain/focus.dart';
import '../ambience.dart';
import '../bloc/focus_room_cubit.dart';
import 'focus_lobby_page.dart';

class FocusRoomPage extends StatelessWidget {
  const FocusRoomPage({super.key, required this.room});

  final FocusRoom room;

  @override
  Widget build(BuildContext context) {
    final profile = context.read<StudyCubit>().profile;
    return BlocProvider(
      create: (context) => FocusRoomCubit(
        room: room,
        uid: profile.uid,
        wilayaCode: profile.wilayaCode,
        presence: context.read<PresenceRepository>(),
      ),
      child: const _FocusRoomView(),
    );
  }
}

class _FocusRoomView extends StatefulWidget {
  const _FocusRoomView();

  @override
  State<_FocusRoomView> createState() => _FocusRoomViewState();
}

class _FocusRoomViewState extends State<_FocusRoomView> {
  // Resolved up front: dispose() may not look up ancestors.
  late final PlaybackCubit _playback;

  @override
  void initState() {
    super.initState();
    _playback = context.read<PlaybackCubit>();
  }

  @override
  void dispose() {
    // Ambience belongs to the room; a podcast started elsewhere keeps going.
    if (_playback.state.current?.id.startsWith(Ambience.idPrefix) ?? false) {
      _playback.stop();
    }
    super.dispose();
  }

  void _setAmbience(Ambience ambience) {
    final playable = ambience.playable;
    if (playable == null) {
      if (_playback.state.current?.id.startsWith(Ambience.idPrefix) ?? false) {
        _playback.stop();
      }
    } else {
      _playback.play(playable);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<FocusRoomCubit>().state;
    final ambience = Ambience.ofPlaying(context.watch<PlaybackCubit>().state);
    final moment = state.moment;
    final focusing = moment.phase == FocusPhase.focus;
    final text = Theme.of(context).textTheme;
    final accent = focusing ? AppColors.gold : const Color(0xFF80CBC4);

    return BlocListener<FocusRoomCubit, FocusRoomState>(
      listenWhen: (a, b) => a.moment.phase != b.moment.phase,
      listener: (context, state) {
        HapticFeedback.heavyImpact();
        SystemSound.play(SystemSoundType.alert);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              state.moment.phase == FocusPhase.focus
                  ? 'انتهت الاستراحة، عودة للتركيز 💪'
                  : 'أحسنت! خذ 5 دقائق راحة',
            ),
          ),
        );
      },
      child: Scaffold(
        backgroundColor: AppColors.ink,
        appBar: AppBar(
          backgroundColor: AppColors.ink,
          foregroundColor: Colors.white,
          title: Text(state.room.name),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              Center(
                child: Text(
                  focusing ? 'وقت التركيز' : 'استراحة',
                  style: text.titleLarge?.copyWith(
                    color: accent,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: SizedBox(
                  width: 260,
                  height: 260,
                  child: CustomPaint(
                    painter: _RingPainter(
                      progress: moment.elapsedFraction,
                      color: accent,
                    ),
                    child: Center(
                      child: Text(
                        formatClock(moment.remaining),
                        textDirection: TextDirection.ltr,
                        style: text.displayMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _PresenceLine(state: state),
              const SizedBox(height: 28),
              Text(
                'الخلفية الصوتية',
                style: text.titleSmall?.copyWith(color: Colors.white70),
              ),
              const SizedBox(height: 8),
              SegmentedButton<Ambience>(
                style: SegmentedButton.styleFrom(
                  foregroundColor: Colors.white,
                  selectedForegroundColor: AppColors.ink,
                  selectedBackgroundColor: AppColors.gold,
                  side: const BorderSide(color: Colors.white24),
                ),
                segments: [
                  for (final a in Ambience.values)
                    ButtonSegment(value: a, label: Text(a.label)),
                ],
                selected: {ambience},
                showSelectedIcon: false,
                onSelectionChanged: (s) => _setAmbience(s.first),
              ),
              const SizedBox(height: 28),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.timer_outlined, color: Colors.white70),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'ركّزت ${state.focusedSeconds ~/ 60} دقيقة في هذه الجلسة',
                        style: text.bodyLarge?.copyWith(color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
              if (state.error != null) ...[
                const SizedBox(height: 12),
                Text(
                  state.error!,
                  style: const TextStyle(color: Colors.orangeAccent),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PresenceLine extends StatelessWidget {
  const _PresenceLine({required this.state});

  final FocusRoomState state;

  @override
  Widget build(BuildContext context) {
    final p = state.presence;
    final text = Theme.of(context).textTheme;
    final others = p.count - (state.joined ? 1 : 0);
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.local_fire_department_rounded,
              color: AppColors.gold,
            ),
            const SizedBox(width: 6),
            Text(
              others > 0 ? '${p.count} طالب يراجعون الآن' : 'أنت أول من دخل',
              style: text.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        if (p.wilayas > 1)
          Text(
            'من ${p.wilayas} ولاية',
            style: text.bodyMedium?.copyWith(color: Colors.white70),
          ),
        if (others <= 0)
          Text(
            'ادعُ زملاءك، العداد يشتغل لكم جميعاً في نفس اللحظة',
            textAlign: TextAlign.center,
            style: text.bodySmall?.copyWith(color: Colors.white54),
          ),
      ],
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2 - 10;
    final track = Paint()
      ..color = Colors.white12
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14;
    final arc = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 14;
    canvas.drawCircle(center, radius, track);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * (1 - progress),
      false,
      arc,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.progress != progress || old.color != color;
}
