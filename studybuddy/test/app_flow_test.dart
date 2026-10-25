import 'package:dz_studybuddy/app.dart';
import 'package:dz_studybuddy/features/auth/data/in_memory_repositories.dart';
import 'package:dz_studybuddy/features/home/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('sign up, onboard as a BAC math student, reach home, sign out', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.5;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      StudyBuddyApp(
        authRepository: InMemoryAuthRepository(),
        profileRepository: InMemoryProfileRepository(),
        useGoogleFonts: false,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('مرحباً بعودتك'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'إنشاء حساب'));
    await tester.pumpAndSettle();

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'سارة مزياني');
    await tester.enterText(fields.at(1), 'sara@example.dz');
    await tester.enterText(fields.at(2), 'motdepasse1');
    await tester.enterText(fields.at(3), 'motdepasse1');
    await tester.tap(find.widgetWithText(FilledButton, 'إنشاء حساب'));
    await tester.pumpAndSettle();

    // Step 1: name is prefilled from sign-up.
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

    expect(find.byType(HomePage), findsOneWidget);
    expect(find.textContaining('أهلاً سارة'), findsOneWidget);
    expect(find.textContaining('رياضيات'), findsOneWidget);
    expect(find.textContaining('ولاية قسنطينة'), findsOneWidget);

    await tester.tap(find.byTooltip('تسجيل الخروج'));
    await tester.pumpAndSettle();
    expect(find.text('مرحباً بعودتك'), findsOneWidget);
  });

  testWidgets('wrong password shows an Arabic error', (tester) async {
    await tester.pumpWidget(
      StudyBuddyApp(
        authRepository: InMemoryAuthRepository(),
        profileRepository: InMemoryProfileRepository(),
        useGoogleFonts: false,
      ),
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
