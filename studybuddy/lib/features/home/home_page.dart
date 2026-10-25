import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../auth/domain/student_profile.dart';
import '../auth/presentation/bloc/auth_bloc.dart';

/// Landing screen after onboarding. The feature cards are placeholders for
/// the next phases.
class HomePage extends StatelessWidget {
  const HomePage({super.key, required this.profile});

  final StudentProfile profile;

  static const _features = [
    (
      Icons.account_tree_rounded,
      'شجرة المواد',
      'ملخصات، فيديوهات وحوليات كل درس',
    ),
    (
      Icons.document_scanner_rounded,
      'المصحح الذكي',
      'صوّر إجابتك واعرف علامتك',
    ),
    (
      Icons.timer_rounded,
      'غرف التركيز',
      'بومودورو جماعي مع طلبة من كل الولايات',
    ),
    (
      Icons.headphones_rounded,
      'بنك الصوتيات',
      'التاريخ، الجغرافيا، الفلسفة والشريعة',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final firstName = profile.fullName.split(' ').first;
    final details = [
      profile.level.label,
      if (profile.stream != null) profile.stream!.name,
      if (profile.wilaya != null) 'ولاية ${profile.wilaya!.name}',
    ].join(' · ');

    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.appName),
        actions: [
          IconButton(
            tooltip: AppStrings.signOut,
            icon: const Icon(Icons.logout),
            onPressed: () =>
                context.read<AuthBloc>().add(const AuthSignOutRequested()),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.emerald, AppColors.emeraldDark],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'أهلاً $firstName 👋',
                  style: text.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  details,
                  style: text.bodyMedium?.copyWith(color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          for (final (icon, title, subtitle) in _features)
            Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 6,
                ),
                leading: CircleAvatar(
                  backgroundColor: AppColors.gold.withValues(alpha: 0.25),
                  child: Icon(icon, color: AppColors.emeraldDark),
                ),
                title: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(subtitle),
                trailing: const Chip(label: Text('قريباً')),
              ),
            ),
        ],
      ),
    );
  }
}
