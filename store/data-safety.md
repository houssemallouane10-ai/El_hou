# إجابات استمارة «أمان البيانات» (Data safety) ومحتوى التطبيق

Play Console ← **Policy → App content**. الإجابات أدناه تصف ما يفعله الكود الحالي فعلًا.
إن أضفت لاحقًا خدمة خارجية (إحصائيات، إعلانات، رسائل SMS، إشعارات Push…) فعدّل الإجابات قبل النشر.

## 1. Data collection and security

| السؤال | الإجابة |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (الموقع يعمل بـ HTTPS فقط، وTWA يشترطه) |
| Which of the following methods of account creation does your app support? | **Username and password** (رقم الهاتف + كلمة السر) |
| Delete account URL | `https://YOUR-DOMAIN/account-deletion` |
| Do you provide a way for users to request that some or all of their data is deleted, without requiring them to delete their account? | **Yes** — من داخل التطبيق: حذف عروض العمل، سحب الطلبات، ومسح حقول الملف المهني |

## 2. Data types

لكل نوع: **Collected = Yes**، **Shared = No** (لا نرسل البيانات لأي طرف ثالث؛ ما يراه المستخدمون الآخرون يتم بطلب من المستخدم نفسه)، **Processed ephemerally = No**.

| الفئة ← النوع | إلزامي أم اختياري | الغرض (Purposes) |
| --- | --- | --- |
| Personal info → **Name** | Required | App functionality, Account management |
| Personal info → **Phone number** | Required | App functionality, Account management, Fraud prevention, security, and compliance |
| Location → **Approximate location** (الولاية والبلدية التي يكتبها المستخدم، لا نستعمل GPS) | Required | App functionality |
| Messages → **Other in-app messages** | Optional | App functionality |
| App activity → **Other user-generated content** (عروض العمل، الملف المهني، الطلبات، البلاغات) | Optional | App functionality, Fraud prevention, security, and compliance |
| App activity → **App interactions** (تاريخ آخر نشاط) | Required | App functionality |

لا نجمع: البريد الإلكتروني، الموقع الدقيق، الصور، الملفات، جهات الاتصال، المعرّفات الإعلانية، المعلومات المالية أو الصحية.

## 3. Other App content declarations

| البند | الإجابة |
| --- | --- |
| Privacy policy | `https://YOUR-DOMAIN/privacy` |
| Ads | **No, my app does not contain ads** |
| App access | **All or some functionality is restricted** → أعطِ المراجع حسابًا تجريبيًا: رقم الهاتف وكلمة السر (أنشئه بنفسك على الموقع) |
| Content rating (IARC) | أجب بصدق: لا عنف ولا محتوى جنسي ولا مقامرة؛ **Users can interact or exchange content: Yes**؛ **Shares user location: No** |
| Target audience | **18 and over** (شروط الاستخدام تشترط 18 سنة) |
| News app | **No** |
| Government app | **No** |
| Financial features | **My app doesn't provide any financial features** |
| Health | **My app does not have any health features** |
| Advertising ID | **No** |

## 4. سياسة المحتوى الذي ينشره المستخدمون (UGC)

ما يطلبه Google Play وأين تجده في التطبيق:

| المطلوب | في خدمتي |
| --- | --- |
| قبول الشروط قبل إنشاء أي محتوى | خانة إلزامية عند التسجيل (لا يُنشأ الحساب بدونها) |
| الإبلاغ عن المحتوى والمستخدمين | زر «إبلاغ» في صفحة العرض وصفحة الحساب وقائمة المحادثة |
| حظر المستخدمين في المحادثات الفردية | «حظر هذا الشخص» في المحادثة وفي الملف، وقائمة المحظورين في الإعدادات |
| إشراف فعلي على المحتوى | لوحة الإدارة: البلاغات، حجب العروض، حظر الحسابات، تعيين مشرفين |
