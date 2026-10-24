# خدمتي: من الصفر إلى Google Play

كل شيء جاهز في الكود. ما بقي عليك ثلاث مراحل فقط، وكلها من المتصفح (لا تحتاج برمجة):

| المرحلة | المدة | التكلفة |
| --- | --- | --- |
| [1. ضع الموقع على الإنترنت](#1-ضع-الموقع-على-الإنترنت) | 10 دقائق | حوالي 7 دولار في الشهر (Render) |
| [2. كن أنت المالك والمتحكم](#2-كن-أنت-المالك-والمتحكم) | دقيقة واحدة | مجاني |
| [3. انشره على Google Play](#3-انشره-على-google-play) | ساعة، ثم 14 يومًا من الاختبار | 25 دولار مرة واحدة |

تحتاج **بطاقة دفع دولية باسمك** (Visa أو Mastercard، البطاقات المسبقة الدفع لا يقبلها Google)، و**بريد Gmail**،
و**هاتف أندرويد**.

> كيف يعمل التطبيق على Google Play؟ التطبيق الذي يُثبَّت من المتجر يفتح موقعك بملء الشاشة (تقنية Trusted Web Activity).
> لذلك **كل تحديث تضعه على الموقع يصل فورًا لكل المستخدمين** دون رفع نسخة جديدة على المتجر.

---

## 1. ضع الموقع على الإنترنت

1. أنشئ حسابًا مجانيًا على [render.com](https://render.com) (بحساب GitHub أو Gmail) وأضف بطاقتك في **Billing**.
2. اضغط هذا الزر:

   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/houssemallouane10-ai/Nadouch/tree/claude/idea-suggestion-app-1dgg56)

   > إن لم يعمل الزر: في Render اختر **New → Blueprint**، اربط حساب GitHub، اختر المستودع `Nadouch` والفرع
   > `claude/idea-suggestion-app-1dgg56`. (بعد دمج الفرع في `main` يكفي اختيار `main`.)

3. يطلب منك Render قيمة واحدة: **`SUPPORT_EMAIL`** — اكتب بريدك (يظهر في صفحتي الخصوصية وحذف الحساب).
4. اضغط **Apply** وانتظر بضع دقائق حتى تظهر الحالة **Live**.
5. رابط موقعك يظهر أعلى صفحة الخدمة، مثل `https://khedmati.onrender.com`. افتحه: التطبيق يعمل.

الإعداد جاهز في الملف `render.yaml`: خادم في فرانكفورت (الأقرب للجزائر)، قرص دائم لقاعدة البيانات، **نسخة احتياطية
تلقائية كل يوم** (آخر 7 أيام في `/data/backups`)، و`OWNER_CODE` سرّي يُولَّد تلقائيًا.

<details>
<summary>دومين باسمك (اختياري، مثل khedmati.com)</summary>

اشترِ الدومين (Namecheap أو Cloudflare، حوالي 10 دولارات في السنة)، ثم في Render: **Settings → Custom Domains → Add**
واتبع التعليمات، وأضف في **Environment** المتغير `PUBLIC_URL=https://khedmati.com`.
افعل ذلك **قبل** صنع تطبيق أندرويد (المرحلة 3)، لأن التطبيق يرتبط بعنوان الموقع.
</details>

## 2. كن أنت المالك والمتحكم

1. في Render افتح خدمتك ← **Environment** ← انسخ قيمة **`OWNER_CODE`** (رمز المالك السري).
2. افتح موقعك ← **إنشاء حساب** ← املأ معلوماتك (رقم هاتفك وكلمة سر قوية).
3. تحت خانة الموافقة على الشروط اضغط **«أنا صاحب المنصة (عندي رمز المالك)»** والصق الرمز ← **إنشاء الحساب**.
4. تدخل مباشرة إلى **لوحة الإدارة**، وتظهر لك شارة «مالك المنصة» في «حسابي».

ماذا يستطيع المالك؟

- **كل صلاحيات الإدارة**: البلاغات، حجب العروض وتمييزها، حظر الحسابات وتوثيقها، كلمة سر مؤقتة لمن نسيها،
  والأرقام والنشاط في كل ولاية.
- **وحده** يعيّن المشرفين ويزيلهم: لوحة الإدارة ← المستخدمون ← «تعيين مشرفًا».
- لا أحد يستطيع سحب صلاحياتك أو حظرك من التطبيق.

نصائح:

- **لا تعطِ `OWNER_CODE` لأحد**: من يعرفه يصبح مالكًا. لمساعديك استعمل «تعيين مشرفًا».
- إن كان عندك حساب من قبل: **الإعدادات ← «صاحب المنصة؟ أدخل رمز المالك»** في أسفل الصفحة.
- إن نسيت كلمة سرك: في Render افتح **Shell** واكتب `npm run reset-password -- 06XXXXXXXX` لتحصل على كلمة سر مؤقتة.
- رقم واتساب للدعم (اختياري): أضف في **Environment** المتغير `SUPPORT_WHATSAPP=06XXXXXXXX`، فيظهر في «نسيت كلمة السر»
  وصفحات الخصوصية.

## 3. انشره على Google Play

### أ. صنع تطبيق أندرويد (5 دقائق)

1. افتح [pwabuilder.com](https://www.pwabuilder.com)، الصق رابط موقعك واضغط **Start**.
2. **Package for stores ← Android ← Generate Package**، واملأ:

   | الحقل | القيمة |
   | --- | --- |
   | Package ID | `dz.khedmati.app` (نفس `ANDROID_PACKAGE_NAME` في Render، **لا يتغير أبدًا بعد النشر**) |
   | App name / Launcher name | خدمتي |
   | Version / Version code | `1.0.0` / `1` |
   | Signing key | **Create new** |

3. حمّل الملف المضغوط. فيه ملف **`.aab`** (ترفعه إلى Google Play)، وملف **`.apk`** (تجربه على هاتفك)،
   و**`signing.keystore` + `signing-key-info.txt`**.

> ⚠️ احفظ `signing.keystore` و`signing-key-info.txt` في مكانين آمنين (Google Drive + فلاشة). كل تحديث للتطبيق يحتاجهما.
> ولا تضعهما أبدًا في GitHub: المستودع عام.

### ب. حساب Google Play Console

1. ادخل [play.google.com/console](https://play.google.com/console) واختر حسابًا **شخصيًا (Personal)**.
2. ادفع **25 دولارًا** وأكمل التحقق من هويتك (بطاقة التعريف).
3. **Create app**: الاسم «خدمتي»، اللغة الافتراضية **العربية**، **App**، **Free**.

### ج. الملء (كل شيء جاهز للنسخ)

| ماذا | من أين |
| --- | --- |
| نصوص المتجر بالعربية والفرنسية | [`store/listing.md`](../store/listing.md) |
| الأيقونة، صورة العرض، 7 لقطات للهاتف | `store/icon-512.png`، `store/feature-graphic.png`، `store/screenshots/` |
| أمان البيانات، الإعلانات، الجمهور (18+)، تصنيف المحتوى | [`store/data-safety.md`](../store/data-safety.md) |
| سياسة الخصوصية | `https://موقعك/privacy` |
| رابط حذف الحساب | `https://موقعك/account-deletion` |
| حساب للمراجع (App access) | سجّل حسابًا ثانيًا عاديًا وأعطِ رقمه وكلمة سره |

### د. ربط التطبيق بموقعك (حتى لا يظهر شريط المتصفح)

1. في Play Console: **Test and release → Setup → App integrity → App signing** (أو **Release → Setup → App integrity**)
   انسخ **SHA-256** من خانة **App signing key certificate**.
2. انسخ أيضًا بصمة SHA-256 من ملف `signing-key-info.txt`.
3. في Render ← **Environment** أضف:
   `ANDROID_SHA256_FINGERPRINTS` = البصمتان مفصولتان بفاصلة: `AA:BB:…,11:22:…` ← **Save** (يعيد التشغيل تلقائيًا).
4. تحقق: `https://موقعك/.well-known/assetlinks.json` يعرض اسم الحزمة والبصمتين.

### هـ. الاختبار المغلق: 12 شخصًا × 14 يومًا (إلزامي للحسابات الشخصية الجديدة)

1. **Testing → Closed testing → Create track**، ارفع ملف `.aab` وأنشئ إصدارًا.
2. أضف بريد Gmail لـ 14 شخصًا على الأقل (عائلة وأصدقاء)، وأرسل لهم **رابط الاشتراك**.
3. كل واحد: يقبل الدعوة ← يثبّت «خدمتي» من Play Store ← يستعمله ويتركه مثبتًا **14 يومًا متتالية**.
   إن نزل العدد تحت 12 قد يبدأ العدّ من جديد، لذلك خذ أكثر من 12.
4. بعد 14 يومًا: **Dashboard → Apply for production** وأجب عن الأسئلة (ماذا جرّب المختبرون).

### و. النشر للجميع

بعد الموافقة: **Production → Create new release** ← ارفع `.aab` ← اختر الجزائر (ودولًا أخرى إن أردت) ← **Start rollout**.
المراجعة تأخذ من يوم إلى بضعة أيام.

---

## بعد النشر

| الحالة | ماذا تفعل |
| --- | --- |
| تحديث أي شيء في التطبيق | يكفي تحديث الموقع (Render ينشر تلقائيًا كل تعديل في GitHub). لا شيء على Google Play |
| شرط Google السنوي (كل أوت يرفع مستوى Android المطلوب) | أعد التوليد في PWABuilder بنفس الـ Package ID ونفس `signing.keystore`، رقم version code أكبر، وارفعه |
| شريط المتصفح يظهر أعلى التطبيق | بصمة App signing غير موجودة في `ANDROID_SHA256_FINGERPRINTS` |
| أريد مشرفين يساعدونني | لوحة الإدارة ← المستخدمون ← «تعيين مشرفًا» |
| فقدت بيانات أو أريد الرجوع ليوم سابق | النسخ اليومية في `/data/backups` (انظر «نسخ احتياطي» في README) |

راجع البلاغات بانتظام من لوحة الإدارة: Google يشترط إشرافًا فعليًا على المحتوى الذي ينشره المستخدمون.

## مراجع رسمية

- [متطلبات الاختبار للحسابات الشخصية الجديدة](https://support.google.com/googleplay/android-developer/answer/14151465)
- [سياسة المحتوى الذي ينشره المستخدمون (UGC)](https://support.google.com/googleplay/android-developer/answer/9876937)
- [شروط حذف الحساب](https://support.google.com/googleplay/android-developer/answer/13327111)
- [شرط مستوى Android المستهدف](https://developer.android.com/google/play/requirements/target-sdk)
- [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity)
- [زر Deploy to Render](https://render.com/docs/deploy-to-render) و[إصدار Node على Render](https://render.com/docs/node-version)
