# برمج · Barmaj

محرر كود احترافي للهاتف يشغّل **53 لغة برمجة**، منها 9 بلا إنترنت (بما فيها C وC++). يخدم من المتصفح ويتثبّت كتطبيق على Android وiPhone، بلا حساب وبلا إعلانات، والملفات تبقى في هاتفك.

**الرابط بعد النشر:** https://houssemallouane10-ai.github.io/El_hou/barmaj/

## كيفاش يشغّل اللغات

| أين | اللغات | الإنترنت |
| --- | --- | --- |
| **على الهاتف نفسه** | Python · JavaScript · TypeScript · SQL (SQLite) · Lua · HTML/CSS/JS · Markdown · **C · C++** | ما يحتاجش (Python يتحمّل مرة وحدة ≈ 10 ميغا، ومترجم C/C++ ≈ 27 ميغا) |
| **في السحابة مجانًا** (Compiler Explorer) | C · C++ · Java · C# · Kotlin · Go · Rust · Swift · Dart · Ruby · Scala · Haskell · Zig · Perl · Elixir · Julia · Pascal · Fortran · D · Nim · Crystal · OCaml · F# · Visual Basic · Objective-C · Clojure · Racket · Erlang · Raku · Ada · COBOL · Odin · V · Gleam · Mojo · Vala · Assembly | يحتاج |
| **بسيرفرك الخاص** (Piston أو Judge0) | PHP · R · Bash · Prolog · Octave · Groovy · Common Lisp · PowerShell · Brainfuck، وكل لغات السحابة تاني | يحتاج |

إذا زدت سيرفر Piston أو Judge0 في الإعدادات، برمج يجربو هو الأول، وإذا ما جاوبش يتحول وحدو لـ Compiler Explorer.

### C وC++ بلا إنترنت

برمج فيه مترجم **Clang 22** حقيقي يخدم داخل الهاتف (LLVM مبني بـ WebAssembly من مشروع [YoWASP](https://yowasp.org)). يتحمّل مرة وحدة (≈ 27 ميغا) من الإعدادات ← بلا إنترنت، أو وحدو أول مرة تشغّل C/C++ على الهاتف.

- **طريقة التشغيل** (تبويب المدخلات): **تلقائي** (السحابة كي يكون الإنترنت لأنها أسرع، والهاتف بلا إنترنت)، أو **على هاتفك** دائمًا، أو **سحابة** دائمًا.
- `scanf` و`cin` يسألوك وقت التشغيل، و`#include <bits/stdc++.h>` يخدم، والأخطاء ملوّنة كي في الترمينال مع شرح بالعربية.
- **حدود المترجم اللي في الهاتف**: الاستثناءات (`try` / `throw`) ما تخدمش (برمج يقولك تبدّل للسحابة)، `long` فيه 32 بت (استعمل `long long` للأرقام الكبيرة)، والترجمة تاخذ بين ثانية (C) وعدة ثواني (C++) حسب الهاتف.

## واش يميزو على التطبيقات الأخرى

- **مدخلات حقيقية وقت التشغيل**: `input()` في Python و`prompt()` في JavaScript و`io.read()` في Lua يسألوك وسط النتيجة كي في الترمينال. للغات السحابة، برمج يكتشف أن البرنامج يقرأ مدخلات ويطلبها منك قبل التشغيل.
- **شريط رموز فوق الكيبورد** خاص بكل لغة، الأكثر استعمالاً هو الأول: `;` و`%d` و`\n` و`->` لـ C، `<<` و`::` لـ C++، `:=` لـ Go، `${}` لـ JavaScript (المؤشر يقعد بين القوسين)… مع زر يعلّق السطر أو ينزع التعليق، **لوح سحب** يحرك المؤشر بالإصبع، وTab وتراجع.
- **اختصارات ⚡ لكل لغة** (`js/snippets.js`): تكتب `pri` في C يبانلك `printf("")`، تضغط عليه والمؤشر يقعد بين `""`، وTab يديك للبلاصة اللي بعدها. كاين `main` و`for` و`if` و`scanf` و`cout` و`System.out.println` و`fmt.Println`… لكل اللغات.
- **الأخطاء مشروحة بالعربية** (وبالفرنسية والإنجليزية): السطر الغالط يتلوّن في المحرر، وزر "السطر N" يديك ليه مباشرة.
- **Python كامل على الهاتف**: numpy وpandas وmatplotlib يتحمّلو وحدهم كي تكتب `import`، والرسومات تظهر في النتيجة. و`import turtle` يرسم رسمة متحركة.
- **جداول SQL**، **معاينة HTML** مع الكونسول وملء الشاشة، و**Markdown** معروض.
- **حفظ تلقائي وسجل النسخ**: كل تشغيل يحفظ نسخة، وتقدر ترجع لأي وحدة.
- **مشاركة بالرابط**: الكود والمدخلات داخل الرابط نفسه، ما يتخزن حتى شيء في سيرفر.
- **يخدم بلا إنترنت** بعد أول فتحة، ويتثبّت كتطبيق (أيقونة، شاشة كاملة، اختصارات Python وC++ وJS وHTML، وتقدر تشارك كود من تطبيق آخر نحو برمج).
- واجهة بالعربية والفرنسية والإنجليزية، هاتف وتابلت (الكود والنتيجة جنب بعض في الشاشات العريضة).

## المظهر ✨ (القائمة ← المظهر)

- **7 سمات مصممة لبرمج**: نيون وهران (الافتراضية، كتابة مضيئة وشبكة نيون)، الزليج (زخرفة نجمة الزليج بالذهبي والفيروزي)، ليل الصحراء (كثبان ولون الزعفران)، ماتريكس (أخضر فوسفوري وخطوط شاشة قديمة)، القصبة (أبيض وأزرق متوسطي)، برمج الليلي، والأطلس (نهاري). أو "حسب الهاتف".
- **وضع القوة ⚡**: شرارات تخرج من المؤشر وأنت تكتب، عدّاد كومبو، والشاشة تهتز في 20 و50 و100…
- **أقواس ملوّنة حسب العمق**، **خطوط المسافة البادئة**، رموز مدمجة (`=>` `!=`)، شكل المؤشر، وصوت كيبورد اختياري.
- **اسمك ولونك**: الترحيب باسمك، لون رئيسي تختارو، والروابط اللي تشاركها تبان "كود من …".
- **صورة للكود**: صورة بسمتك واسمك جاهزة للواتساب وإنستغرام (إذا حددت جزء من الكود، الصورة تاخذ غير هو).

## التثبيت على الهاتف

- **Android**: حمّل التطبيق من [صفحة التحميل](https://houssemallouane10-ai.github.io/El_hou/barmaj/download/) (ملف APK، مجاني). إذا الهاتف رفض، فعّل "السماح من هذا المصدر" ثم ثبّت.
- **Android (بلا APK)**: افتح الرابط في Chrome ← القائمة ⋮ ← "تثبيت التطبيق".
- **iPhone (Safari)**: نفس صفحة التحميل تبيّن خطوات iPhone: تفتح برمج، زر المشاركة ⬆︎ ← "إضافة إلى الشاشة الرئيسية". (تطبيق في App Store يلزمو حساب مطوّر Apple مدفوع.)

## تطبيق Android

التطبيق هو [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity): يفتح الموقع في شاشة كاملة، وكل تحديث للموقع يوصل للتطبيق وحدو، بلا ما تعاود تبني الـ APK.

1. `android/` مولّد من `manifest.webmanifest` بـ `tools/android.mjs` ([Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)). عاود ولّدو غير إذا بدلت الاسم، الأيقونة، الألوان ولا رقم النسخة.
2. أي تعديل في `android/` يشغّل `.github/workflows/android.yml`، اللي يبني APK غير موقّع ويحطو في فرع `android-build`.
3. التوقيع على جهازك (يلزم Java وopenssl):
   ```bash
   git fetch origin android-build
   git show origin/android-build:barmaj-unsigned.apk > /tmp/barmaj-unsigned.apk
   BARMAJ_SIGNING_KEY='…' node barmaj/tools/sign-apk.mjs /tmp/barmaj-unsigned.apk
   ```
   يكتب `download/Barmaj.apk`. مفتاح التوقيع مشفّر في `android/barmaj.keystore.enc`، والكلمة السرية (`BARMAJ_SIGNING_KEY`) ماهيش في المستودع: احفظها، بلا بيها ما تقدرش تنشر تحديث للتطبيق (Android يرفض APK بمفتاح آخر).
4. باش يتفتح بلا شريط المتصفح، Android يتأكد من `https://houssemallouane10-ai.github.io/.well-known/assetlinks.json`. نسخة منو في `android/assetlinks.json`: حطها في مستودع `houssemallouane10-ai.github.io` (عام، فيه زيد ملف فارغ `.nojekyll`).

## الملفات

| الملف | الدور |
| --- | --- |
| `index.html`, `css/app.css` | الواجهة |
| `js/app.js` | التحكم: الملفات، التشغيل، القوائم |
| `js/editor.js`, `js/keybar.js` | المحرر (CodeMirror 6) وشريط الرموز |
| `js/term.js` | النتيجة: نص ملوّن، مدخلات، صور، جداول |
| `js/langs.js` | قائمة اللغات والقوالب |
| `js/engines/local.js` | التشغيل على الهاتف ومعاينة HTML/Markdown |
| `js/engines/cloud.js` | Compiler Explorer وPiston وJudge0 |
| `js/hints.js`, `js/i18n.js` | شرح الأخطاء والنصوص بثلاث لغات |
| `js/snippets.js` | الاختصارات ⚡ لكل لغة (`pri` ← `printf("")`) |
| `js/themes.js`, `js/fx.js`, `js/snap.js` | السمات، المؤثرات (وضع القوة والصوت)، وصورة الكود |
| `workers/*.worker.js` | محركات JavaScript/TypeScript وPython وLua وSQL |
| `workers/clang.worker.js`, `workers/wasi.worker.js` | مترجم C/C++ في الهاتف، وتشغيل البرنامج المترجَم |
| `workers/stdin.js`, `sw.js` | المدخلات وقت التشغيل والعمل بلا إنترنت |
| `vendor/` | المكتبات المبنية (CodeMirror، Sucrase، sql.js، wasmoon، marked) |
| `download/` | صفحة تحميل تطبيق Android والـ APK |
| `android/` | مشروع تطبيق Android (مولّد) |
| `tools/` | سكريبتات البناء والتوقيع |

## التطوير

```bash
# تشغيله على جهازك (من جذر المستودع)
python3 -m http.server 8000
# ثم افتح http://localhost:8000/barmaj/

# إعادة بناء vendor بعد تحديث المكتبات
cd barmaj/tools && npm ci && npm run build

# بعد أي تعديل على ملفات التطبيق (النشر يديرها وحدو تاني)
node barmaj/tools/stamp.mjs
```

`stamp.mjs` يكتب في `sw.js` قائمة الملفات ورقم نسخة محسوب من محتواها، باش التطبيق المثبّت يلقى التحديث ويقترحو على المستعمل.

## شكر

[CodeMirror](https://codemirror.net) (MIT) · [Pyodide](https://pyodide.org) (MPL-2.0) · [sql.js](https://sql.js.org) (MIT) · [wasmoon](https://github.com/ceifa/wasmoon) (MIT) · [Sucrase](https://github.com/alangpierce/sucrase) (MIT) · [marked](https://marked.js.org) (MIT) · [YoWASP Clang](https://yowasp.org) (Apache-2.0 مع استثناء LLVM) · التشغيل في السحابة بفضل [Compiler Explorer](https://godbolt.org).
