# برمج · Barmaj

محرر كود احترافي للهاتف يشغّل **53 لغة برمجة**. يخدم من المتصفح ويتثبّت كتطبيق على Android وiPhone، بلا حساب وبلا إعلانات، والملفات تبقى في هاتفك.

**الرابط بعد النشر:** https://houssemallouane10-ai.github.io/El_hou/barmaj/

## كيفاش يشغّل اللغات

| أين | اللغات | الإنترنت |
| --- | --- | --- |
| **على الهاتف نفسه** | Python · JavaScript · TypeScript · SQL (SQLite) · Lua · HTML/CSS/JS · Markdown | ما يحتاجش (Python يتحمّل مرة وحدة ≈ 10 ميغا) |
| **في السحابة مجانًا** (Compiler Explorer) | C · C++ · Java · C# · Kotlin · Go · Rust · Swift · Dart · Ruby · Scala · Haskell · Zig · Perl · Elixir · Julia · Pascal · Fortran · D · Nim · Crystal · OCaml · F# · Visual Basic · Objective-C · Clojure · Racket · Erlang · Raku · Ada · COBOL · Odin · V · Gleam · Mojo · Vala · Assembly | يحتاج |
| **بسيرفرك الخاص** (Piston أو Judge0) | PHP · R · Bash · Prolog · Octave · Groovy · Common Lisp · PowerShell · Brainfuck، وكل لغات السحابة تاني | يحتاج |

إذا زدت سيرفر Piston أو Judge0 في الإعدادات، برمج يجربو هو الأول، وإذا ما جاوبش يتحول وحدو لـ Compiler Explorer.

## واش يميزو على التطبيقات الأخرى

- **مدخلات حقيقية وقت التشغيل**: `input()` في Python و`prompt()` في JavaScript و`io.read()` في Lua يسألوك وسط النتيجة كي في الترمينال. للغات السحابة، برمج يكتشف أن البرنامج يقرأ مدخلات ويطلبها منك قبل التشغيل.
- **شريط رموز فوق الكيبورد** حسب اللغة (`:` و`()` لـ Python، `<>` لـ HTML…)، مع **لوح سحب** يحرك المؤشر بالإصبع، وTab وتراجع.
- **الأخطاء مشروحة بالعربية** (وبالفرنسية والإنجليزية): السطر الغالط يتلوّن في المحرر، وزر "السطر N" يديك ليه مباشرة.
- **Python كامل على الهاتف**: numpy وpandas وmatplotlib يتحمّلو وحدهم كي تكتب `import`، والرسومات تظهر في النتيجة. و`import turtle` يرسم رسمة متحركة.
- **جداول SQL**، **معاينة HTML** مع الكونسول وملء الشاشة، و**Markdown** معروض.
- **حفظ تلقائي وسجل النسخ**: كل تشغيل يحفظ نسخة، وتقدر ترجع لأي وحدة.
- **مشاركة بالرابط**: الكود والمدخلات داخل الرابط نفسه، ما يتخزن حتى شيء في سيرفر.
- **يخدم بلا إنترنت** بعد أول فتحة، ويتثبّت كتطبيق (أيقونة، شاشة كاملة، اختصارات Python وC++ وJS وHTML، وتقدر تشارك كود من تطبيق آخر نحو برمج).
- واجهة بالعربية والفرنسية والإنجليزية، ليلي ونهاري، هاتف وتابلت (الكود والنتيجة جنب بعض في الشاشات العريضة).

## التثبيت على الهاتف

- **Android (Chrome)**: افتح الرابط ← القائمة ⋮ ← "تثبيت التطبيق"، أو من قائمة برمج ← "ثبّت التطبيق".
- **iPhone (Safari)**: زر المشاركة ⬆︎ ← "إضافة إلى الشاشة الرئيسية".

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
| `workers/*.worker.js` | محركات JavaScript/TypeScript وPython وLua وSQL |
| `workers/stdin.js`, `sw.js` | المدخلات وقت التشغيل والعمل بلا إنترنت |
| `vendor/` | المكتبات المبنية (CodeMirror، Sucrase، sql.js، wasmoon، marked) |
| `tools/` | سكريبتات البناء |

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

[CodeMirror](https://codemirror.net) (MIT) · [Pyodide](https://pyodide.org) (MPL-2.0) · [sql.js](https://sql.js.org) (MIT) · [wasmoon](https://github.com/ceifa/wasmoon) (MIT) · [Sucrase](https://github.com/alangpierce/sucrase) (MIT) · [marked](https://marked.js.org) (MIT) · التشغيل في السحابة بفضل [Compiler Explorer](https://godbolt.org).
