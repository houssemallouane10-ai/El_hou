import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/audio/mini_player.dart';
import '../../core/di/app_dependencies.dart';
import '../audio_bank/presentation/audio_bank_page.dart';
import '../auth/domain/student_profile.dart';
import '../focus/presentation/pages/focus_lobby_page.dart';
import '../grader/presentation/bloc/grading_history_cubit.dart';
import '../grader/presentation/pages/grader_page.dart';
import '../syllabus/presentation/bloc/study_cubit.dart';
import '../syllabus/presentation/pages/syllabus_page.dart';
import 'home_page.dart';

enum HomeTab { home, syllabus, grader, focus, audio }

/// The signed-in area: five tabs sharing the student's programme and
/// progress, with a mini player above the navigation bar.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key, required this.profile});

  final StudentProfile profile;

  @override
  Widget build(BuildContext context) {
    final deps = context.read<AppDependencies>();
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => StudyCubit(
            profile: profile,
            progress: deps.progress,
            loadCurriculum: deps.loadCurriculum,
          ),
        ),
        BlocProvider(
          create: (_) => GradingHistoryCubit(deps.gradingHistory, profile.uid),
        ),
      ],
      child: const _ShellView(),
    );
  }
}

class _ShellView extends StatefulWidget {
  const _ShellView();

  @override
  State<_ShellView> createState() => _ShellViewState();
}

class _ShellViewState extends State<_ShellView> {
  var _tab = HomeTab.home;
  // Tabs are built on first visit and then kept alive.
  final _visited = <HomeTab>{HomeTab.home};

  void _select(HomeTab tab) => setState(() {
    _tab = tab;
    _visited.add(tab);
  });

  Widget _page(HomeTab tab) => switch (tab) {
    HomeTab.home => HomePage(onOpenTab: _select),
    HomeTab.syllabus => const SyllabusPage(),
    HomeTab.grader => const GraderPage(),
    HomeTab.focus => const FocusLobbyPage(),
    HomeTab.audio => const AudioBankPage(),
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _tab.index,
        children: [
          for (final tab in HomeTab.values)
            _visited.contains(tab) ? _page(tab) : const SizedBox.shrink(),
        ],
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const MiniPlayer(),
          NavigationBar(
            selectedIndex: _tab.index,
            onDestinationSelected: (i) => _select(HomeTab.values[i]),
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'الرئيسية',
              ),
              NavigationDestination(
                icon: Icon(Icons.account_tree_outlined),
                selectedIcon: Icon(Icons.account_tree_rounded),
                label: 'المواد',
              ),
              NavigationDestination(
                icon: Icon(Icons.document_scanner_outlined),
                selectedIcon: Icon(Icons.document_scanner_rounded),
                label: 'المصحح',
              ),
              NavigationDestination(
                icon: Icon(Icons.timer_outlined),
                selectedIcon: Icon(Icons.timer_rounded),
                label: 'التركيز',
              ),
              NavigationDestination(
                icon: Icon(Icons.headphones_outlined),
                selectedIcon: Icon(Icons.headphones_rounded),
                label: 'الصوتيات',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
