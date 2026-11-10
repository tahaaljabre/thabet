# ثابت — نظام التقارير والحسابات (Thabit)

تطبيق سطح مكتب (Electron + SQLite) لإدارة التقارير اليومية والمبيعات والمصروفات والموظفين
والبنوك والخزينة والتقارير المالية.

## المتطلبات

- Node.js 18 أو أحدث (يُنصح بـ 20)
- npm
- Windows (البناء الحالي موجّه لـ `nsis` على ويندوز)

## التثبيت والتشغيل

```bash
cd app
npm install
npm start
```

## الفحص والاختبارات

من داخل مجلد `app`:

```bash
npm run check     # فحص صياغة الملفات + أسرار + مفاتيح الترجمة
npm run test:ci   # تشغيل اختبارات Jest
npm run verify    # الاثنان معًا
```

قاعدة الترجمة إلزامية: أي نص جديد يظهر للمستخدم يُضاف إلى
`app/js/locales/ar.js` و`app/js/locales/en.js`، ويُستخدم في القوالب عبر
`data-i18n` وفي JavaScript عبر `t(...)`.

## البناء للتوزيع

```bash
cd app
npm run build
```

الناتج في `app/dist/` (مثبّت `nsis`). لا تُحذف ملفات الاختبارات أو السكربتات من المستودع؛
بل يستثنيها `electron-builder` تلقائيًا من الحزمة عبر `build.files` في `app/package.json`.

## مكان البيانات

- قاعدة البيانات: `%APPDATA%\hadramout-desktop\database.sqlite`
- النسخ الاحتياطية: `%APPDATA%\hadramout-desktop\backups`
- الرموز والاعتمادات (`google_drive_token.json`, `cloud-backup-info.json`) تُخزَّن أيضًا في
  مجلد بيانات المستخدم، ولا تُحفظ داخل المشروع أو الحزمة.

> ملفات `*.sqlite` و`*.sqlite-wal` و`*.sqlite-shm` مستثناة من Git. لا تُضِف بيانات عملاء
> إلى المستودع.

## الهيكلة

تفاصيل التقسيم في [`app/ARCHITECTURE.md`](app/ARCHITECTURE.md):

```text
app/
├── main.js               نقطة تشغيل العملية الرئيسية
├── main/
│   ├── ipc/              قنوات IPC والتحقق من الصلاحيات
│   ├── services/         منطق العمل والاستعلامات
│   └── services/database/ الاتصال والمخطط
├── renderer/
│   ├── preload.js        الجسر الآمن بين الواجهة والخلفية
│   └── js/
│       ├── core/         التوجيه والحالة والاتصال العام
│       ├── pages/        أقسام التطبيق
│       ├── templates/    قوالب الصفحات
│       └── locales/      ملفات الترجمة
├── js/locales/           ملفات الترجمة (ar.js / en.js)
├── scripts/              أدوات الفحص والتدقيق
└── tests/                اختبارات Jest
```

## ملاحظات

- `app/wipe-db.js` و`app/test.js` سكربتات تطوير خطرة (تحذف/تقرأ قاعدة البيانات الحقيقية)
  ولا تُضمَّن في الحزمة.
- `app/mobile-notes.html` صفحة ملاحظات مستقلة تعمل على Firebase Realtime Database؛
  راجع إعدادات الصلاحيات فيها قبل النشر.
- عند إجراء تغييرات على المخطط، استخدم ترحيلات آمنة (`CREATE TABLE IF NOT EXISTS`,
  `addColumnIfNotExists`) حتى لا تتعطل قواعد بيانات العملاء القديمة.
- أعد بناء التطبيق (`npm run build`) بعد أي تغيير جوهري لتسليم نسخة محدّثة للعميل.
