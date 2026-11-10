
🚨 ملخص الأخطاء الكارثية التي يجب تعديلها فوراً
🔴 1. ازدواجية الكود - مشكلة العصر (CRITICAL)
في صفحة المبيعات عندك 3 نسخ من نفس الكود تعمل بنفس الوقت:


Apply
ملف 1: app/renderer/js/pages/sales/events.js       ← النسخة الجديدة (import/export modules) ✅
ملف 2: app/renderer/js/pages/sales/ledger.js         ← النسخة القديمة (window.*) ❌  
ملف 3: app/renderer/js/pages/sales/form.js            ← نسخة أخرى قديمة (window.*) ❌
ledger.js يحتوي على كل وظائف المبيعات مكررة: loadCashierReports و editDailyReport و printDailyReportVoucher و deleteDailyReport كلها مكتوبة بطريقتين مختلفتين. هذا يسبب صراعات وتصرف غير متوقع عند حفظ المبيعات.

الحل: حذف ledger.js و form.js وترحيل كل شيء إلى events.js فقط.

🔴 2. ملف app/styles.css يحتوي على كود JavaScript (كارثة)
هذا الملف الذي اسمه .css يحتوي كود جافاسكريبت كامل:


Apply
// app/styles.css ← هذا المفروض CSS فقط!
let state = {};
let reportsHistory = {};
let currentSelectedDate = "2026-06-07";
async function loadState() { ... }
async function saveState() { ... }
المشكلة: هذا الكود متعارض مع الكود المودرن في pages/sales/events.js. المتغير currentSelectedDate موجود في ملفين، state موجود في مكانين. هذا يسبب:

تسريب للذاكرة
عدم تزامن البيانات عند الحفظ
صعوبة تتبع البق
🔴 3. عدم الاتساق بين الواجهة الجديدة (Module System) والقديمة (Global Scripts)
في app/renderer/index.html أنت تستخدم type="module" للـ app.js:


Apply
<script type="module" src="js/app.js"></script>
لكن في app.js يتم تحميل الصفحات الحديثة عبر navigateTo('sales')، وصفحة sales الجديدة تتعامل مع نفس id elements مثل الصفحة القديمة في styles.css. هذا يؤدي إلى:

تعارض الأحداث (Event listeners)
حفظ البيانات من مكانين مختلفين
عدم استقرار الشاشة
🔴 4. غياب نظام حماية من قفل السنة المالية في واجهة المستخدم
في database.js عندك isYearClosed() لكن بعض الـ APIs لا تتحقق منه. مثلاً:


Apply
// في reports.service.js - saveReportState()
if (await isYearClosed(yearId)) throw new Error('السنة المالية مغلقة');
لكن في بعض الخدمات الأخرى مثل vault.service.js:


Apply
// vault.service.js - لا يوجد check للسنة المالية!
async function closeVaultPeriod(startDate, endDate) {
  await dbRun('UPDATE daily_reports SET is_closed = 1 ...');
}
المشكلة: يمكن إقفال الصندوق حتى لو كانت السنة مغلقة.

🔴 5. تعارض بين window.t (i18n) وملفات الترجمة
في events.js أنشأت دالة t() مخصصة داخل الملف:


Apply
const t = (key) => {
  if (typeof window.t === 'function') return window.t(key);
  const fallbacks = { ... };
  return fallbacks[key] || key;
};
لكن في ledger.js تستخدم t() من window.t مباشرةً. هذا يعني أن الترجمة تعمل بشكل مختلف في كل ملف.

🔴 6. مشكلة أمنية خطيرة - جميع الاستعلامات قابلة لـ SQL Injection
في العديد من الأماكن، أسماء الحقول تُبنى ديناميكياً:


Apply
// banks.service.js - الخطر!
for (const channel of myChannels) {
  const sumRow = await dbGet(`SELECT SUM(${channel}) as total FROM daily_reports ...`);
}
متغير channel قد يأتي من BankSalesMapping الذي يُدخله المستخدم! هذا SQL Injection حقيقي.

🔴 7. خلط عملة البات التايلندي (฿) مع نظام عربي يمني
الكود يستخدم عملة ฿ (Thai Baht) بشكل ثابت، لكن النظام لمطعم يمني! يجب أن تكون العملة قابلة للتكوين من الإعدادات.

🔴 8. التخزين العشوائي للبيانات في الذاكرة (Memory Leaks)
في init.js (في app/styles.css):


Apply
let reportsHistory = {};
لا يوجد تفريغ لهذا الكاش، مما يسبب تراكم البيانات مع الوقت.

🔴 9. Duplicate Financial Years - يمكن إنشاء سنوات بنفس الاسم
في database.js:


Apply
YearName TEXT UNIQUE NOT NULL,
لكن في واجهة المستخدم لا يوجد validation لمنع إنشاء سنوات مكررة.

✅ الخطة العاجحة للتصحيح (طبقاً للأولوية)
#	المشكلة	مستوى الخطورة	وقت التعديل
1	حذف ملف ledger.js و form.js	🔴 كارثي	10 دقائق
2	فصل JavaScript من styles.css	🔴 كارثي	30 دقيقة
3	توحيد دالة t() للترجمة	🟠 عالي	15 دقيقة
4	إضافة SQL parameters بدلاً من concatenation	🔴 كارثي	20 دقيقة
5	جعل العملة قابلة للتكوين	🟠 عالي	30 دقيقة
6	إضافة isYearClosed لكل الـ APIs	🟠 عالي	20 دقيقة
