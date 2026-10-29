/// Public pages linked from the app and the Google Play listing, served by
/// GitHub Pages from studybuddy/legal/ on the main branch.
abstract final class AppLinks {
  static const _base =
      'https://houssemallouane10-ai.github.io/El_hou/studybuddy/legal';

  static final privacy = Uri.parse('$_base/privacy.html');
  static final terms = Uri.parse('$_base/terms.html');
  static final deleteAccount = Uri.parse('$_base/delete-account.html');
}
