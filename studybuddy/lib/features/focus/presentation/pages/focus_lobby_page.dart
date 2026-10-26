import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../syllabus/presentation/bloc/study_cubit.dart';
import '../../../syllabus/presentation/widgets/subject_visuals.dart';
import '../../domain/focus.dart';
import 'focus_room_page.dart';

/// "غرف التركيز": pick a room and study alongside students from every
/// wilaya. No chat, only the shared timer and the live head-count.
class FocusLobbyPage extends StatefulWidget {
  const FocusLobbyPage({super.key});

  @override
  State<FocusLobbyPage> createState() => _FocusLobbyPageState();
}

class _FocusLobbyPageState extends State<FocusLobbyPage> {
  late final Stream<Map<String, RoomPresence>> _counts = context
      .read<PresenceRepository>()
      .watchAll();
  late Timer _timer;
  var _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => setState(() => _now = DateTime.now()),
    );
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mySubjects = context.select(
      (StudyCubit c) => c.state.subjects.map((s) => s.id).toSet(),
    );
    final rooms = [...focusRooms]
      ..sort((a, b) {
        int rank(FocusRoom r) =>
            r.subjectIds.intersection(mySubjects).isNotEmpty ? 0 : 1;
        return rank(a).compareTo(rank(b));
      });
    final moment = SharedPomodoro.at(_now);
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('غرف التركيز')),
      body: StreamBuilder<Map<String, RoomPresence>>(
        stream: _counts,
        builder: (context, snapshot) {
          final counts = snapshot.data ?? const {};
          final total = counts.values.fold(0, (sum, p) => sum + p.count);
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.ink,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    Icon(
                      moment.phase == FocusPhase.focus
                          ? Icons.local_fire_department_rounded
                          : Icons.free_breakfast_rounded,
                      color: AppColors.gold,
                      size: 36,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            moment.phase == FocusPhase.focus
                                ? 'جولة تركيز جارية'
                                : 'استراحة جماعية',
                            style: text.titleMedium?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            '$total طالب يراجعون الآن · '
                            'المتبقي ${formatClock(moment.remaining)}',
                            style: text.bodyMedium?.copyWith(
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '25 دقيقة تركيز ثم 5 دقائق راحة، بعداد واحد لكل الطلبة. '
                'لا دردشة، فقط تركيز.',
                style: text.bodySmall?.copyWith(color: Colors.grey.shade700),
              ),
              const SizedBox(height: 14),
              for (final room in rooms)
                SectionCard(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => BlocProvider.value(
                        value: context.read<StudyCubit>(),
                        child: FocusRoomPage(room: room),
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: AppColors.emerald.withValues(
                          alpha: 0.1,
                        ),
                        child: Icon(
                          subjectIcon(room.icon),
                          color: AppColors.emerald,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              room.name,
                              style: text.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (room.subjectIds
                                .intersection(mySubjects)
                                .isNotEmpty)
                              Text(
                                'من مواد شعبتك',
                                style: text.bodySmall?.copyWith(
                                  color: AppColors.emerald,
                                ),
                              ),
                          ],
                        ),
                      ),
                      const Icon(
                        Icons.people_alt_rounded,
                        size: 18,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${counts[room.id]?.count ?? 0}',
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

String formatClock(Duration d) {
  final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  return '$m:$s';
}
