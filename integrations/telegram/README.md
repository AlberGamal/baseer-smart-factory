# تكامل بوت تليجرام (godfather) مع منصة بصير

هذا المجلد هو **مكان ربط بوت الإشعارات** بالمنصة. المزامنة تتم عبر جدول `alerts`
في نفس قاعدة البيانات — مصدر حقيقة واحد للطرفين.

## كيف يعمل التزامن؟
1. المنصة (الـ API) تكتب أي حدث مهم في جدول `alerts` بحالة `status='new'`.
2. `bridge.py` يقرأ التنبيهات الجديدة كل ٣ ثوانٍ، يرسلها على تليجرام، ثم يحدّث
   `status='sent'` و `sent_to_telegram=TRUE` و `telegram_message_id`.
3. أي تحديث للحالة (اطلاع/معالجة) من أي طرف ينعكس على الطرف الآخر تلقائياً.

## لتركيب بوتكم الحالي (`notifier.py`)
1. ضع `notifier.py` بجوار هذا الملف في `integrations/telegram/`.
2. `config.py` يوفّر `TELEGRAM_BOT_TOKEN` من متغيرات البيئة (موجود).
3. وفّر `db.py` بسيطاً يحتوي على `logger` (أو عدّل استيراد البوت).
4. في `bridge.py` استبدل دالة `_send_to_telegram(...)` بنداء
   `notifier.send_telegram_msg(...)` أو `notifier.report_ppe_violation(...)`.
5. عدّاد مخالفات السلامة (PPE strikes) خزّنه في جدول `ppe_strikes` (موجود في
   المخطط) بدل الذاكرة، ليصبح ثابتاً ومتزامناً مع المنصة.

## التشغيل
```bash
# محلياً
python -m integrations.telegram.bridge

# أو عبر Docker: فعّل خدمة telegram في docker-compose.yml
```

يحتاج متغيرات: `TELEGRAM_BOT_TOKEN`, `POSTGRES_*`, واختيارياً `TELEGRAM_DEFAULT_CHAT_ID`.
