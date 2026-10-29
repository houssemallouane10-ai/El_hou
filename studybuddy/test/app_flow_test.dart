import 'package:dz_studybuddy/app.dart';
import 'package:dz_studybuddy/core/di/app_dependencies.dart';
import 'package:dz_studybuddy/core/audio/mini_player.dart';
import 'package:dz_studybuddy/core/reports/content_report.dart';
import 'package:dz_studybuddy/core/reports/report_repositories.dart';
import 'package:dz_studybuddy/features/focus/presentation/pages/focus_room_page.dart';
import 'package:dz_studybuddy/features/grader/domain/grading.dart';
import 'package:dz_studybuddy/features/home/home_shell.dart';
import 'package:dz_studybuddy/features/syllabus/presentation/pages/lesson_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

Future<void> signUpAsMathStudent(WidgetTester tester) async {
  await tester.tap(find.widgetWithText(TextButton, 'إنشاء حساب'));
  await tester.pumpAndSettle();
  final fields = find.byType(TextFormField);
  await tester.enterText(fields.at(0), 'سارة مزياني');
  await tester.enterText(fields.at(1), 'sara@example.dz');
  await tester.enterText(fields.at(2), 'motdepasse1');
  await tester.enterText(fields.at(3), 'motdepasse1');
  await tester.tap(find.widgetWithText(FilledButton, 'إنشاء حساب'));
  await tester.pumpAndSettle();

  expect(find.text('الخطوة 1 من 3'), findsOneWidget);
  expect(find.text('سارة مزياني'), findsOneWidget);
  await tester.enterText(find.byType(TextFormField).at(1), '0770123456');
  final wilayaField = find.descendant(
    of: find.byType(DropdownMenu<int>),
    matching: find.byType(TextField),
  );
  await tester.tap(wilayaField);
  await tester.pumpAndSettle();
  await tester.enterText(wilayaField, 'قسنطينة');
  await tester.pumpAndSettle();
  await tester.tap(find.text('25 - قسنطينة').last);
  await tester.pumpAndSettle();
  await tester.tap(find.widgetWithText(FilledButton, 'التالي'));
  await tester.pumpAndSettle();

  await tester.tap(find.text('شهادة البكالوريا'));
  await tester.pumpAndSettle();
  await tester.tap(find.widgetWithText(FilledButton, 'التالي'));
  await tester.pumpAndSettle();

  await tester.tap(find.text('رياضيات'));
  await tester.pumpAndSettle();
  await tester.tap(find.widgetWithText(FilledButton, 'ابدأ المراجعة'));
  await tester.pumpAndSettle();
}

/// The system back button, as on Android.
Future<void> goBack(WidgetTester tester) async {
  await tester.binding.handlePopRoute();
  await tester.pump();
}

Future<void> openTab(WidgetTester tester, String label) async {
  await tester.tap(
    find.descendant(of: find.byType(NavigationBar), matching: find.text(label)),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUp(() {
    final view =
        TestWidgetsFlutterBinding.instance.platformDispatcher.views.first;
    view.physicalSize = const Size(1080, 2400);
    view.devicePixelRatio = 2.5;
  });

  tearDown(
    () => TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
        .reset(),
  );

  testWidgets('sign up, onboard, then use every tab', (tester) async {
    final deps = demoDeps();
    await tester.pumpWidget(StudyBuddyApp(deps: deps, useGoogleFonts: false));
    await tester.pumpAndSettle();
    expect(find.text('مرحباً بعودتك'), findsOneWidget);

    await signUpAsMathStudent(tester);

    // Home: greeting and today's plan, heaviest coefficient first.
    expect(find.byType(HomeShell), findsOneWidget);
    expect(find.textContaining('أهلاً سارة'), findsOneWidget);
    expect(find.text('شهادة البكالوريا، شعبة رياضيات'), findsOneWidget);
    expect(find.text('خطة اليوم'), findsOneWidget);
    expect(find.text('النهايات والاستمرارية'), findsOneWidget);
    await tester.tap(find.byTooltip('أتقنته').first);
    await tester.pumpAndSettle();
    expect(find.text('النهايات والاستمرارية'), findsNothing);

    // Syllabus: subjects with coefficients, then a lesson.
    await openTab(tester, 'المواد');
    expect(find.text('المعامل 7'), findsOneWidget);
    await tester.tap(find.text('الرياضيات'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('الموافقات في Z'), 200);
    await tester.tap(find.text('الموافقات في Z'));
    await tester.pumpAndSettle();
    expect(find.byType(LessonPage), findsOneWidget);

    await tester.tap(find.text('أراجعه'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('لخّص لي الدرس'));
    await tester.pumpAndSettle();
    expect(find.text('الأفكار الأساسية'), findsOneWidget);
    expect(find.text('النقطة الأولى'), findsOneWidget);

    // Reporting the AI summary, as Google Play requires.
    await tester.scrollUntilVisible(
      find.text('أبلغ عن خطأ أو محتوى غير لائق'),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('أبلغ عن خطأ أو محتوى غير لائق'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('خطأ علمي أو منهجي'));
    await tester.pump();
    await tester.tap(find.text('أرسل البلاغ'));
    await tester.pumpAndSettle();
    expect(find.text('شكراً، وصلنا بلاغك وسنراجعه'), findsOneWidget);
    final filed = (deps.reports as InMemoryReportRepository).reports.single;
    expect(filed.uid, 'local-1');
    expect(filed.report.kind, ReportKind.aiSummary);
    expect(filed.report.excerpt, contains('النقطة الأولى'));

    await tester.tap(find.text('أفضل الشروحات'));
    await tester.pumpAndSettle();
    expect(find.textContaining('لم يقترح أحد فيديو'), findsOneWidget);
    await tester.tap(find.text('الحوليات'));
    await tester.pumpAndSettle();
    expect(find.textContaining('لم تُضف حوليات هذا الدرس بعد'), findsOneWidget);

    await goBack(tester);
    await tester.pumpAndSettle();
    await goBack(tester);
    await tester.pumpAndSettle();

    // Content filter search.
    await tester.tap(find.text('مثال: ملخص درس الموافقات شعبة رياضيات'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'حوليات الدالة الأسية');
    await tester.pumpAndSettle();
    expect(find.text('الدالة الأسية'), findsOneWidget);
    await goBack(tester);
    await tester.pumpAndSettle();

    // Grader: form ready, waiting for a photo.
    await openTab(tester, 'المصحح');
    expect(find.text('صوّر إجابتك'), findsOneWidget);
    final gradeButton = tester.widget<ButtonStyleButton>(
      find.ancestor(
        of: find.text('صحّح إجابتي'),
        matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
      ),
    );
    expect(gradeButton.onPressed, isNull);

    // Focus rooms: join, see yourself, pick an ambience, leave.
    await openTab(tester, 'التركيز');
    expect(find.text('من مواد شعبتك'), findsWidgets);
    await tester.tap(find.text('الرياضيات').last);
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(find.byType(FocusRoomPage), findsOneWidget);
    expect(find.text('أنت أول من دخل'), findsOneWidget);
    await tester.tap(find.text('لوفاي هادئ'));
    await tester.pump(const Duration(milliseconds: 300));
    await goBack(tester);
    await tester.pumpAndSettle();
    // The room's ambience stops when leaving it.
    expect(find.byType(MiniPlayer), findsOneWidget);
    expect(find.text('لوفاي هادئ'), findsNothing);

    // Audio bank: play an episode, the mini player follows.
    await openTab(tester, 'الصوتيات');
    expect(find.text('أهم تواريخ الثورة التحريرية'), findsOneWidget);
    await tester.tap(find.byTooltip('استمع').first);
    await tester.pumpAndSettle();
    expect(
      find.descendant(
        of: find.byType(MiniPlayer),
        matching: find.text('أهم تواريخ الثورة التحريرية'),
      ),
      findsOneWidget,
    );

    await openTab(tester, 'الرئيسية');
    await tester.tap(find.byTooltip('حسابي'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تسجيل الخروج'));
    await tester.pumpAndSettle();
    expect(find.text('مرحباً بعودتك'), findsOneWidget);
  });

  testWidgets('deleting the account removes its data and the sign-in', (
    tester,
  ) async {
    final deps = demoDeps();
    await tester.pumpWidget(StudyBuddyApp(deps: deps, useGoogleFonts: false));
    await tester.pumpAndSettle();
    await signUpAsMathStudent(tester);

    const uid = 'local-1';
    await tester.tap(find.byTooltip('أتقنته').first);
    await tester.pumpAndSettle();
    await deps.gradingHistory.save(
      uid,
      GradingRecord(
        id: 'g1',
        subjectId: 'math',
        subjectName: 'الرياضيات',
        createdAt: DateTime(2027),
        result: GradingResult.fromJson(sampleGrading),
      ),
    );
    expect((await deps.progress.watch(uid).first).statuses, isNotEmpty);

    await tester.tap(find.byTooltip('حسابي'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('حذف الحساب'));
    await tester.pumpAndSettle();

    // A wrong password deletes nothing.
    await tester.enterText(find.byType(TextField).last, 'pas-le-bon');
    await tester.tap(find.text('احذف حسابي'));
    await tester.pumpAndSettle();
    expect(
      find.text('البريد الإلكتروني أو كلمة السر غير صحيحة'),
      findsOneWidget,
    );
    expect(await deps.profiles.fetch(uid), isNotNull);

    await tester.enterText(find.byType(TextField).last, 'motdepasse1');
    await tester.tap(find.text('احذف حسابي'));
    await tester.pumpAndSettle();

    expect(find.text('مرحباً بعودتك'), findsOneWidget);
    expect(find.text('حُذف حسابك وكل بياناتك'), findsOneWidget);
    expect(await deps.profiles.fetch(uid), isNull);
    expect((await deps.progress.watch(uid).first).statuses, isEmpty);
    expect(await deps.gradingHistory.watch(uid).first, isEmpty);

    // The account is gone too.
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'sara@example.dz');
    await tester.enterText(fields.at(1), 'motdepasse1');
    await tester.tap(find.widgetWithText(FilledButton, 'تسجيل الدخول'));
    await tester.pumpAndSettle();
    expect(
      find.text('البريد الإلكتروني أو كلمة السر غير صحيحة'),
      findsOneWidget,
    );
  });

  testWidgets('leaving a focus room frees the seat', (tester) async {
    final AppDependencies deps = demoDeps();
    await tester.pumpWidget(StudyBuddyApp(deps: deps, useGoogleFonts: false));
    await tester.pumpAndSettle();
    await signUpAsMathStudent(tester);

    await openTab(tester, 'التركيز');
    await tester.tap(find.text('الرياضيات').last);
    await tester.pump(const Duration(seconds: 1));
    expect((await deps.presence.watchAll().first)['math']!.count, 1);

    // Straight back out, without touching the background sound.
    await goBack(tester);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect((await deps.presence.watchAll().first)['math']!.count, 0);
  });

  testWidgets('wrong password shows an Arabic error', (tester) async {
    await tester.pumpWidget(
      StudyBuddyApp(deps: demoDeps(), useGoogleFonts: false),
    );
    await tester.pumpAndSettle();

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'nobody@example.dz');
    await tester.enterText(fields.at(1), 'whatever1');
    await tester.tap(find.widgetWithText(FilledButton, 'تسجيل الدخول'));
    await tester.pumpAndSettle();

    expect(
      find.text('البريد الإلكتروني أو كلمة السر غير صحيحة'),
      findsOneWidget,
    );
  });
}
