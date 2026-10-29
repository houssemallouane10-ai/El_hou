import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_links.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/di/app_dependencies.dart';
import '../../../core/utils/open_link.dart';
import '../../auth/presentation/bloc/auth_bloc.dart';
import '../../syllabus/presentation/bloc/study_cubit.dart';
import '../../syllabus/presentation/pages/lesson_page.dart' show levelLabelOf;
import 'account_deletion_cubit.dart';

/// "حسابي": profile summary, legal pages, sign-out and account deletion.
class AccountPage extends StatelessWidget {
  const AccountPage({super.key});

  /// Leaves every pushed page before the session ends, so the sign-in
  /// screen is not left underneath them.
  static void _backToRoot(BuildContext context) =>
      Navigator.of(context).popUntil((route) => route.isFirst);

  @override
  Widget build(BuildContext context) {
    final profile = context.read<StudyCubit>().profile;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('حسابي')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: AppColors.emerald,
                  child: Text(
                    profile.fullName.characters.first,
                    style: text.titleLarge?.copyWith(color: AppColors.gold),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.fullName,
                        style: text.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        profile.email,
                        textDirection: TextDirection.ltr,
                        style: text.bodySmall,
                      ),
                      Text(
                        [
                          levelLabelOf(profile),
                          if (profile.wilaya != null)
                            'ولاية ${profile.wilaya!.name}',
                        ].join(' · '),
                        style: text.bodySmall?.copyWith(
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Tile(
            icon: Icons.privacy_tip_outlined,
            title: 'سياسة الخصوصية',
            onTap: () => openExternal(context, AppLinks.privacy),
          ),
          _Tile(
            icon: Icons.gavel_outlined,
            title: 'شروط الاستخدام',
            onTap: () => openExternal(context, AppLinks.terms),
          ),
          _Tile(
            icon: Icons.logout,
            title: AppStrings.signOut,
            onTap: () {
              _backToRoot(context);
              context.read<AuthBloc>().add(const AuthSignOutRequested());
            },
          ),
          const SizedBox(height: 24),
          _Tile(
            icon: Icons.delete_forever_outlined,
            title: 'حذف الحساب',
            color: AppColors.error,
            onTap: () => _confirmDeletion(context),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDeletion(BuildContext context) async {
    final deps = context.read<AppDependencies>();
    final uid = context.read<StudyCubit>().profile.uid;
    final deleted = await showDialog<bool>(
      context: context,
      builder: (_) => BlocProvider(
        create: (_) => AccountDeletionCubit(
          uid: uid,
          auth: deps.auth,
          profiles: deps.profiles,
          progress: deps.progress,
          gradings: deps.gradingHistory,
        ),
        child: const _DeleteAccountDialog(),
      ),
    );
    if (deleted == true && context.mounted) {
      final messenger = ScaffoldMessenger.of(context);
      _backToRoot(context);
      messenger.showSnackBar(
        const SnackBar(content: Text('حُذف حسابك وكل بياناتك')),
      );
    }
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(
          title,
          style: TextStyle(color: color, fontWeight: FontWeight.w600),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog();

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  final _password = TextEditingController();

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    final ok = await context.read<AccountDeletionCubit>().delete(
      _password.text,
    );
    if (ok && mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AccountDeletionCubit>().state;
    return AlertDialog(
      title: const Text('حذف الحساب نهائياً'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'سيُحذف حسابك وملفك وتقدّمك في الدروس وسجل تصحيحاتك، ولا يمكن '
              'استرجاعها. الفيديوهات التي اقترحتها تبقى دون اسمك.',
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _password,
              obscureText: true,
              textDirection: TextDirection.ltr,
              enabled: !state.working,
              decoration: const InputDecoration(
                labelText: 'أدخل كلمة السر للتأكيد',
              ),
              onSubmitted: (_) => _delete(),
            ),
            if (state.error != null) ...[
              const SizedBox(height: 10),
              Text(
                state.error!,
                style: const TextStyle(color: AppColors.error),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: state.working ? null : () => Navigator.of(context).pop(),
          child: const Text('إلغاء'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.error,
            minimumSize: const Size(0, 44),
          ),
          onPressed: state.working ? null : _delete,
          child: state.working
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('احذف حسابي'),
        ),
      ],
    );
  }
}
