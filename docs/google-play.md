# خدمتي: من الصفر إلى Google Play — دليل بالنقرات

كل الكود جاهز. ما بقي يحتاج حساباتك أنت (الاستضافة وGoogle Play) ولا يستطيع أحد غيرك فتحها أو الدفع فيها.
اتبع المراحل بالترتيب، كل خطوة فيها اسم الزر كما يظهر على الشاشة (أغلب الأزرار بالإنجليزية).

| المرحلة | المدة | التكلفة |
| --- | --- | --- |
| [1. ضع الموقع على الإنترنت](#1-ضع-الموقع-على-الإنترنت) | 15 دقيقة | حوالي 7 دولار في الشهر |
| [2. كن أنت المالك](#2-كن-أنت-المالك) | دقيقتان | مجاني |
| [3. انشر التطبيق على Google Play](#3-انشر-التطبيق-على-google-play) | ساعة + 14 يومًا من الاختبار | 25 دولار مرة واحدة |

**تحتاج قبل البداية:**

- **بطاقة دفع دولية باسمك** تعمل في الشراء من الإنترنت (Visa أو Mastercard). Google لا يقبل البطاقات المسبقة الدفع.
- **حساب Gmail**، و**حساب GitHub** (عندك واحد: هو الذي فيه مستودع `Nadouch`).
- **هاتف أندرويد**، ويُفضّل **حاسوب** للمرحلة 3.

> التطبيق على Google Play يفتح موقعك بملء الشاشة (تقنية Trusted Web Activity)، لذلك **كل تحديث على الموقع يصل لكل
> المستخدمين فورًا** دون رفع نسخة جديدة على المتجر.

---

## 1. ضع الموقع على الإنترنت

الاستضافة على **Render**: خادم في فرانكفورت (الأقرب للجزائر)، قرص دائم لقاعدة البيانات، ونسخة احتياطية تلقائية كل يوم.
كل الإعدادات جاهزة في الملف `render.yaml`، فلن تكتب أي قيمة.

1. افتح [dashboard.render.com/register](https://dashboard.render.com/register) واضغط **GitHub** لتسجّل بحساب GitHub نفسه.
   وافق على الصلاحيات التي يطلبها Render (**Authorize**).
2. أضف بطاقتك: صورتك أعلى الشاشة ← **Billing** ← **Add payment method** (أو **Add card**).
3. افتح هذا الرابط (هو زر النشر):

   **[نشر خدمتي على Render](https://render.com/deploy?repo=https://github.com/houssemallouane10-ai/Nadouch/tree/claude/idea-suggestion-app-1dgg56)**

4. تظهر صفحة **Blueprint** فيها خدمة واحدة اسمها `khedmati` (Web Service، Starter، Frankfurt، Disk 1 GB).
   اكتب أي اسم في **Blueprint Name** (مثلًا `khedmati`) ثم اضغط **Deploy Blueprint** (أو **Apply**).
5. انتظر 3 إلى 5 دقائق. افتح الخدمة `khedmati`: عندما تظهر **Live** بالأخضر فالموقع يعمل.
6. **رابط موقعك** مكتوب أعلى صفحة الخدمة، مثل `https://khedmati.onrender.com`. انسخه واحتفظ به.
7. **انتقل فورًا إلى المرحلة 2**: أول من يُنشئ حسابًا في موقع جديد يصبح مالكه.

<details>
<summary>إذا لم يعمل رابط النشر في الخطوة 3</summary>

في Render اضغط **+ New** ← **Blueprint** ← **Connect GitHub** إن طُلب منك ← اختر المستودع `Nadouch` ←
في **Branch** اختر `claude/idea-suggestion-app-1dgg56` ← اترك **Blueprint Path** على `render.yaml` ← **Deploy Blueprint**.
</details>

<details>
<summary>دومين باسمك مثل khedmati.com (اختياري، يمكن تأجيله)</summary>

اشترِ الدومين (Namecheap أو Cloudflare، حوالي 10 دولارات في السنة). في Render: الخدمة ← **Settings** ← **Custom Domains**
← **Add Custom Domain** واتبع التعليمات، ثم **Environment** ← **Add Environment Variable**: `PUBLIC_URL` = `https://khedmati.com`.
افعل ذلك **قبل** المرحلة 3، لأن تطبيق أندرويد يرتبط برابط الموقع.
</details>

## 2. كن أنت المالك

1. افتح رابط موقعك. بما أن المنصة جديدة تظهر لك شاشة **«إعداد منصتك»** مكتوب فيها
   «هذا الحساب سيكون حساب المالك».
2. املأ: نوع الحساب، اسمك، رقم هاتفك، **كلمة سر قوية**، ولايتك، وضع علامة على الموافقة على الشروط.
3. اضغط **«إنشاء حساب المالك»**. تدخل مباشرة إلى **لوحة الإدارة** وتظهر لك شارة «مالك المنصة» في «حسابي».
4. في لوحة الإدارة افتح تبويب **«الإعدادات»** وأضف **رقم واتساب الدعم** و/أو **البريد الإلكتروني للدعم** ← **حفظ**.
   (Google Play يشترط وسيلة تواصل تظهر في صفحة الخصوصية.)

بعد أول حساب لا تظهر هذه الشاشة لأحد، وكل من يسجّل بعدك مستخدم عادي.

**ما يستطيعه المالك:** كل صلاحيات الإدارة (البلاغات، حجب العروض، حظر الحسابات وتوثيقها، كلمة سر مؤقتة لمن نسيها،
الأرقام حسب الولاية)، و**وحده** يعيّن المشرفين ويزيلهم (لوحة الإدارة ← المستخدمون ← «تعيين مشرفًا») ويغيّر الإعدادات.
لا أحد يستطيع حظره أو سحب صلاحياته، ولا يُحذف حسابه ما دام المالك الوحيد.

> نسيت كلمة سرك؟ في Render افتح الخدمة ← **Shell** واكتب: `npm run reset-password -- 06XXXXXXXX` (رقمك)،
> فتظهر لك كلمة سر مؤقتة. ادخل بها ثم غيّرها من الإعدادات.

## 3. انشر التطبيق على Google Play

### أ. صنع ملف التطبيق (10 دقائق، على الحاسوب أسهل)

1. افتح [pwabuilder.com](https://www.pwabuilder.com)، الصق رابط موقعك واضغط **Start**. انتظر التقرير.
2. اضغط **Package For Stores**، ثم في خانة **Android** اضغط **Generate Package**.
3. تأكد من هذه الخانات ثم اضغط **Download Package**:

   | الخانة | اكتب |
   | --- | --- |
   | Package ID | `dz.khedmati.app` (**لا يتغير أبدًا بعد النشر**) |
   | App name | خدمتي |
   | Launcher name | خدمتي |
   | App version / version code | `1.0.0` / `1` |
   | Signing key | **New** (اتركه كما هو) |

4. فك ضغط الملف الذي نزل. ستجد فيه:
   - ملفًا ينتهي بـ **`.aab`**: هذا ما ترفعه إلى Google Play.
   - ملفًا ينتهي بـ **`.apk`**: لتجرّب التطبيق على هاتفك قبل النشر.
   - **`signing.keystore`** و**`signing-key-info.txt`**: مفتاح توقيع تطبيقك.

> ⚠️ احفظ `signing.keystore` و`signing-key-info.txt` في مكانين (Google Drive + فلاشة). كل تحديث مستقبلي يحتاجهما.
> **لا ترفعهما إلى GitHub أبدًا**: المستودع عام ويراه الجميع.

### ب. حساب المطوّر في Google Play (25 دولار مرة واحدة)

1. افتح [play.google.com/console/signup](https://play.google.com/console/signup) بحساب Gmail الخاص بك.
2. اختر **Yourself** (حساب شخصي)، واملأ معلوماتك كما في بطاقة التعريف.
3. ادفع **25 دولارًا** ثم أكمل **التحقق من الهوية** (صورة بطاقة التعريف وإثبات الهاتف). قد يأخذ التحقق من يوم إلى أيام.

### ج. إنشاء التطبيق

في Play Console اضغط **Create app** واملأ: **App name** خدمتي ← **Default language** Arabic ← **App** ← **Free** ←
ضع علامة على الإقرارات ← **Create app**.

### د. ملء الأقسام المطلوبة

في **Dashboard** تجد قائمة **Set up your app**: اضغط على كل مهمة واملأها هكذا (كل النصوص جاهزة للنسخ):

| المهمة | ماذا تضع |
| --- | --- |
| Privacy policy | `https://رابط-موقعك/privacy` |
| App access | **All or some functionality is restricted** ← أنشئ حسابًا عاديًا ثانيًا في موقعك وضع رقمه وكلمة سره هنا |
| Ads | **No** |
| Content rating | املأ الاستبيان بصدق: لا عنف ولا محتوى جنسي، **المستخدمون يتواصلون فيما بينهم: Yes** |
| Target audience | **18 and over** |
| Data safety | انسخ الإجابات من [`store/data-safety.md`](../store/data-safety.md)، ورابط حذف الحساب: `https://رابط-موقعك/account-deletion` |
| Government apps / Financial features / Health | **No** / لا شيء / لا شيء |
| Store listing | النصوص من [`store/listing.md`](../store/listing.md)، والصور من مجلد [`store/`](../store/): الأيقونة `icon-512.png`، صورة العرض `feature-graphic.png`، ولقطات الهاتف في `store/screenshots/` |
| App category | **Business** |

### هـ. الاختبار المغلق: 12 شخصًا على الأقل لمدة 14 يومًا

الحسابات الشخصية الجديدة لا تستطيع النشر للجميع قبل هذا الاختبار.

1. **Test and release** ← **Testing** ← **Closed testing** ← افتح المسار الموجود (Alpha) ← **Create new release**.
2. في **App bundles** ارفع ملف **`.aab`** ← اكتب ملاحظة (مثلًا: «النسخة الأولى») ← **Next** ← **Save and publish**
   (أو **Start rollout to Closed testing**).
3. في تبويب **Testers**: **Create email list**، أضف بريد Gmail لـ **14 شخصًا على الأقل** (العائلة والأصدقاء) ← **Save**.
4. انسخ **رابط الانضمام** (Join on the web / Copy link) وأرسله لهم على واتساب. كل واحد يفتحه على هاتفه الأندرويد ←
   **Become a tester** ← يثبّت «خدمتي» من Play Store ← يستعمله ويتركه مثبتًا **14 يومًا متتالية**.

### و. اربط التطبيق بموقعك (حتى لا يظهر شريط المتصفح أعلى التطبيق)

1. في Play Console: **Test and release** ← **App integrity** (أو **Setup** ← **App integrity**) ← **App signing**.
2. انسخ **SHA-256 certificate fingerprint** من خانة **App signing key certificate**.
3. افتح موقعك ← لوحة الإدارة ← **الإعدادات** ← **بصمات SHA-256**: الصق البصمة.
   أضف في سطر ثانٍ البصمة الموجودة في ملف `signing-key-info.txt` ← **حفظ**.
4. تظهر عبارة **«التطبيق مربوط»**. أعد فتح التطبيق على هاتفك: يجب أن يختفي شريط المتصفح.

### ز. بعد 14 يومًا: النشر للجميع

1. في **Dashboard** اضغط **Apply for production** وأجب عن الأسئلة (من جرّب التطبيق وماذا لاحظتم).
2. بعد الموافقة: **Test and release** ← **Production** ← **Create new release** ← اختر نفس ملف `.aab`
   (أو **Promote release** من الاختبار المغلق) ← اختر الدول (الجزائر، ويمكن إضافة غيرها) ← **Start rollout to Production**.
3. المراجعة تأخذ عادة من يوم إلى بضعة أيام، ثم يظهر «خدمتي» في Google Play للجميع.

---

## بعد النشر

| الحالة | ماذا تفعل |
| --- | --- |
| أي تحديث في التطبيق | يكفي تحديث الموقع: Render يعيد النشر تلقائيًا عند كل تعديل في GitHub. لا شيء على Google Play |
| شرط Google السنوي (كل أوت يرفع نسخة أندرويد المطلوبة) | أعد صنع الملف في PWABuilder بنفس الـ Package ID ونفس `signing.keystore` ورقم version code أكبر، وارفعه |
| تريد مشرفين يساعدونك | لوحة الإدارة ← المستخدمون ← «تعيين مشرفًا» |
| مراقبة المحتوى | راجع البلاغات بانتظام: Google يشترط إشرافًا فعليًا |
| الرجوع إلى بيانات يوم سابق | النسخ اليومية محفوظة في `/data/backups` (انظر «نسخ احتياطي» في README) |

## إذا تعطلت

| المشكلة | الحل |
| --- | --- |
| Render يطلب بطاقة أو يرفض النشر | الخطة Starter مدفوعة لأن قاعدة البيانات تحتاج قرصًا دائمًا: أضف البطاقة في Billing |
| فتحت الموقع ولم تظهر «إعداد منصتك» | شخص آخر سجّل قبلك (نادر جدًا). سجّل حسابك، ثم في Render ← **Shell** اكتب `npm run make-owner -- رقمك` و`npm run make-owner -- رقمه --revoke`، ومن لوحة الإدارة أزل إشرافه واحظره |
| PWABuilder يعطي أخطاء | تأكد أن الموقع **Live** وأن الرابط يبدأ بـ `https://` |
| شريط المتصفح يظهر أعلى التطبيق | البصمة ناقصة أو خاطئة في لوحة الإدارة ← الإعدادات (الخطوة و) |
| «Your app must target Android 16 (API 36)» | أعد صنع الملف في PWABuilder (آخر نسخة) |
| المراجع لم يستطع الدخول | تحقق من الرقم وكلمة السر في App access |

## مراجع رسمية

- [متطلبات الاختبار للحسابات الشخصية الجديدة](https://support.google.com/googleplay/android-developer/answer/14151465)
- [سياسة المحتوى الذي ينشره المستخدمون](https://support.google.com/googleplay/android-developer/answer/9876937)
- [شروط حذف الحساب](https://support.google.com/googleplay/android-developer/answer/13327111)
- [نسخة أندرويد المطلوبة](https://developer.android.com/google/play/requirements/target-sdk)
- [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity)
- [زر Deploy to Render](https://render.com/docs/deploy-to-render) و[Blueprints على Render](https://render.com/docs/blueprint-spec)
