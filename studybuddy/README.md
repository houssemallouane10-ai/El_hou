# زميل الدراسة · DZ-StudyBuddy

تطبيق Flutter (Android · iOS · Web) للطالب الجزائري: المنهاج الرسمي، الملخصات، الحوليات، المصحح الذكي وغرف التركيز في مكان واحد.

## الحالة: المرحلة 1 جاهزة (التسجيل وملف الطالب)

- **إنشاء حساب / تسجيل الدخول** بالبريد وكلمة السر (Firebase Auth)، مع "نسيت كلمة السر" ورسائل أخطاء بالعربية.
- **التعريف بالطالب في 3 خطوات**: الاسم + رقم الهاتف (05/06/07، يُحفظ بصيغة `+213…`) + الولاية (58 ولاية مع بحث) ← المستوى (BEM · BAC · السنة الأولى جامعي) ← الشعبة أو الميدان. طالب الـ BEM ينهي بعد خطوتين لأنه بلا شعبة.
- **الحفظ في Firestore** في `users/{uid}`، محمي بقواعد [`firestore.rules`](firestore.rules): كل طالب يقرأ ويكتب ملفه هو فقط، والقواعد تتحقق من شكل البيانات (رقم جزائري، ولاية 1–58، شعبة إلزامية إلا للـ BEM).
- **الواجهة**: عربية من اليمين لليسار، خط Cairo، الأخضر الزمردي `#008751` والذهبي `#FFC72C`.
- **وضع تجريبي**: إذا لم يُهيّأ Firebase بعد، التطبيق يشتغل بمستودعات في الذاكرة (شريط ذهبي أسفل الشاشة يوضح ذلك) حتى تجربه مباشرة.

المراحل القادمة (شجرة المواد، المصحح الذكي، غرف التركيز، بنك الصوتيات) تظهر في الصفحة الرئيسية بعلامة "قريباً".

## البنية

```
lib/
├── core/
│   ├── constants/   ألوان، ثيم، نصوص، الولايات والمستويات والشعب
│   └── utils/       validators (البريد، كلمة السر، الهاتف الجزائري)
├── features/
│   ├── auth/
│   │   ├── domain/        AppUser، StudentProfile، واجهات المستودعات
│   │   ├── data/          Firebase Auth، Firestore، ونسخ في الذاكرة
│   │   └── presentation/  AuthBloc، CredentialsCubit، OnboardingCubit، الصفحات
│   └── home/        الصفحة الرئيسية
├── app.dart         MaterialApp + AuthGate (يختار الشاشة حسب حالة الجلسة)
└── main.dart        يهيّئ Firebase أو يدخل الوضع التجريبي
```

إدارة الحالة بـ `flutter_bloc`:
- `AuthBloc` يملك الجلسة: غير معروف ← غير مسجّل ← يحتاج تعريف ← مسجّل (أو خطأ تحميل مع إعادة المحاولة).
- `CredentialsCubit` يرسل نماذج الدخول والتسجيل.
- `OnboardingCubit` يدير خطوات التعريف ويحفظ الملف.

## التشغيل

```bash
flutter pub get
flutter run                 # وضع تجريبي إلى أن تربط Firebase
flutter test                # 14 اختبار: validators، الملف، OnboardingCubit، ومسار كامل من التسجيل إلى الرئيسية
```

### ربط Firebase

1. أنشئ مشروعاً على [console.firebase.google.com](https://console.firebase.google.com) وفعّل **Authentication ← Email/Password** و**Firestore**.
2. في هذا المجلد:
   ```bash
   dart pub global activate flutterfire_cli
   flutterfire configure      # يستبدل lib/firebase_options.dart
   firebase deploy --only firestore:rules
   ```
3. أعد تشغيل التطبيق: الشريط التجريبي يختفي والحسابات تُحفظ في Firebase.

## ملاحظات

- `google_fonts` مثبّت على `^8`: النسخة 9 تعتمد على حزمة `material_ui` المنفصلة ولا تتوافق مع Material المدمج في Flutter 3.47.
- قائمة الولايات هي الـ 58 ولاية الرسمية؛ إذا اعتُمد تقسيم إداري جديد يكفي تحديث `core/constants/algeria_data.dart` وحدّ `wilayaCode` في `firestore.rules`.
