# Project translation rule

- Every new user-facing label, button, help text, placeholder, toast, dialog, and report heading must be added to both `app/js/locales/ar.js` and `app/js/locales/en.js`.
- Templates must reference translations with `data-i18n` (or the appropriate translated attribute). Dynamic JavaScript text must use `t(...)`.
- Do not leave new Arabic or English interface text hard-coded in templates.
- Excel button captions are translated with the interface. Spreadsheet contents are changed only when the task explicitly requests workbook translation.
- Before handing off interface changes, run `node scripts/audit-i18n-keys.js` from the `app` directory and `npm run check`.
