# دليل النشر على Google Play · زميل الدراسة

خطوة بخطوة، بنفس ترتيب Play Console. الأجوبة هنا مطابقة لما يفعله التطبيق ولسياسة الخصوصية، فلا تغيّرها إلا إذا تغيّر التطبيق.

## 0. قبل البدء

1. **مفتاح التوقيع**: أضف السر `STUDYBUDDY_SIGNING_KEY` في GitHub
   (Settings → Secrets and variables → Actions → New repository secret).
   احتفظ بقيمته في مكان آمن للأبد: بدونها لا يمكنك نشر أي تحديث.
2. أعد تشغيل workflow «StudyBuddy» (Actions → StudyBuddy → Run workflow)، ثم نزّل الأداة
   **`studybuddy-google-play`**. فيها `zamil-addirasa-1.0.0-1.aab`.
   إذا ظهر اسم `studybuddy-NOT-FOR-PLAY-debug-signed` فالسر غير مضبوط، و Google سترفض الملف.
3. **Firebase Console**: انشر آخر نسخة من `firestore.rules` و`database.rules.json`.
4. **صفحات الخصوصية** يجب أن تفتح قبل الإرسال للمراجعة:
   https://houssemallouane10-ai.github.io/El_hou/studybuddy/legal/privacy.html
5. **حساب تجريبي للمراجع**: أنشئ من التطبيق حساباً (مثلاً `play.review.dz@gmail.com`)
   وأكمل ملفه (المستوى والشعبة)، لأن المراجع لا يستطيع الدخول بدونه.

## 1. إنشاء التطبيق

Play Console → **Create app**:

| الحقل | القيمة |
| --- | --- |
| App name | زميل الدراسة - DZ StudyBuddy |
| Default language | Arabic – ar |
| App or game | App |
| Free or paid | Free |

## 2. App content (Policy → App content)

### Privacy policy
```
https://houssemallouane10-ai.github.io/El_hou/studybuddy/legal/privacy.html
```

### App access
- اختر **All or some functionality is restricted**.
- Add instructions: الاسم «Reviewer account»، والبريد وكلمة السر للحساب التجريبي.
- في الملاحظات:
  `Sign in with the account above. All features are free. The AI grader needs a photo of a handwritten answer; any photo of text works.`

### Ads
**No, my app does not contain ads.**

### Content rating (IARC)
- Category: **Reference, news, or educational**.
- العنف، الجنس، اللغة البذيئة، المخدرات، القمار: **No** لكلها.
- Users can interact or exchange content: **Yes** (الطلبة يقترحون روابط فيديوهات يراها غيرهم).
  الإشراف موجود: زر «إبلاغ» على كل فيديو وكل نتيجة ذكاء اصطناعي.
- Shares user's location with other users: **No**.
- Digital purchases: **No**.
- النتيجة المتوقعة: 3+ أو 12+، وكلاهما مقبول.

### Target audience and content
- Age groups: **13–15، 16–17، 18 وما فوق**. لا تختر أقل من 13، لأن ذلك يُدخلك في سياسة العائلات بشروط إضافية.
- Appeal to children: **No**.

### News app
**No**.

### Data safety

**Overview**
- Does your app collect or share user data? **Yes**
- Is all data encrypted in transit? **Yes**
- Account creation method: **Username/email and password**
- Delete account URL:
  ```
  https://houssemallouane10-ai.github.io/El_hou/studybuddy/legal/delete-account.html
  ```
- Can users request that some data is deleted without deleting the account? **No**

**Data types**: كلها **Collected** و**ليست Shared**. Google وFirebase مزوّدو خدمة، وهذا لا يُعدّ مشاركة.

| النوع في Play | ماذا عندنا | مطلوب؟ | الغرض |
| --- | --- | --- | --- |
| Personal info → Name | الاسم واللقب | Required | App functionality, Account management |
| Personal info → Email address | البريد | Required | App functionality, Account management |
| Personal info → Phone number | رقم الهاتف | Required | Account management |
| Personal info → Other info | الولاية، المستوى، الشعبة | Required | App functionality |
| Photos and videos → Photos | صورة ورقة الإجابة للتصحيح | Optional | App functionality، وعلّم **Processed ephemerally** |
| App activity → Other user-generated content | الفيديوهات المقترحة والبلاغات ونتائج التصحيح | Optional | App functionality |
| App activity → Other actions | تقدّم الدروس، التصويت، تاريخ الامتحان | Optional | App functionality |

لا شيء غير هذا: لا موقع دقيق، لا جهات اتصال، لا Crash logs، ولا Advertising ID.

### Government apps / Financial features / Health
**No** / **None** / **No**.

### Foreground service permissions
التطبيق يستعمل `FOREGROUND_SERVICE_MEDIA_PLAYBACK` لبنك الصوتيات.
- النوع: **Media playback**.
- الوصف:
  `Plays audio lessons from the audio bank in the background, with lock-screen and notification controls, after the user starts playback.`
- Video link: صوّر الهاتف 20 ثانية (شغّل حلقة من بنك الصوتيات، ثم اقفل الشاشة والصوت مستمر)، ارفع الفيديو على يوتيوب **Unlisted**، وضع الرابط.

### المحتوى المولّد بالذكاء الاصطناعي
لا يوجد نموذج خاص به، لكن السياسة تشترط وجود زر للإبلاغ داخل التطبيق، وهو موجود على الملخصات والتصحيحات (يحفظ البلاغات في `reports`). راجعها في Firestore من حين لآخر.

## 3. Store listing

انسخ النصوص من [`LISTING.md`](LISTING.md)، وارفع:
- App icon: `store/icon-512.png`
- Feature graphic: `store/feature-graphic.png`
- Phone screenshots: الصور السبع في `store/screenshots/` بالترتيب.

ثم أضف الترجمة الفرنسية (Manage translations → French).
Store settings → Category: **Education**، وضع بريدك للتواصل.

## 4. الاختبار المغلق (إجباري للحسابات الشخصية الجديدة)

Google تشترط على حسابات المطوّرين الشخصية الجديدة اختباراً مغلقاً فيه **12 مختبِراً على الأقل** مشتركين **14 يوماً متتالية** قبل طلب النشر للعموم.

1. Testing → **Closed testing** → Create track.
2. Countries: **Algeria** (وأضف غيرها إن أردت).
3. Testers: قائمة بريد Gmail لـ12 شخصاً أو أكثر (أصدقاء، زملاء).
4. Create release → ارفع ملف **.aab** → اسم الإصدار `1.0.0` → Release notes:
   ```
   <ar>النسخة الأولى من زميل الدراسة.</ar>
   ```
5. Send for review، ثم أرسل رابط الاشتراك (Join on web) للمختبِرين، وتأكد أن كل واحد ضغط «Become a tester» وثبّت التطبيق.
6. بعد 14 يوماً: Dashboard → **Apply for production**، وأجب عن الأسئلة بصدق (كم مختبِراً، ماذا تغيّر).

Play App Signing يُفعَّل تلقائياً عند أول رفع: Google تحفظ مفتاح التطبيق، وأنت تحتفظ بمفتاح الرفع (السر في GitHub).

## 5. كل تحديث لاحق

1. ارفع رقم الإصدار في `studybuddy/pubspec.yaml`: من `version: 1.0.0+1` إلى `1.0.1+2`. الرقم بعد `+` يجب أن يزيد في كل رفع.
2. ادفع التغيير، ثم نزّل الأداة `studybuddy-google-play` الجديدة وارفعها في نفس المسار.

## أسباب الرفض الشائعة (وكلها معالَجة)

| السبب | الحالة |
| --- | --- |
| لا يمكن حذف الحساب | من التطبيق (حسابي ← حذف الحساب) ومن رابط الويب |
| سياسة الخصوصية لا تفتح | تأكد أن الرابط يعمل قبل الإرسال |
| المراجع لم يستطع الدخول | الحساب التجريبي في App access |
| محتوى من المستخدمين بلا إبلاغ | زر «إبلاغ» على الفيديوهات ونتائج الذكاء الاصطناعي |
| خدمة في الواجهة بلا تبرير | نموذج Foreground service مع الفيديو |
| ملف موقّع بمفتاح debug | استعمل الأداة `studybuddy-google-play` فقط |
