# NEXORA School — المرحلة 3 (ربط Supabase)

Next.js 14 + TypeScript + Tailwind + Supabase (Auth + Database + Storage + RLS). واجهة عربية RTL.

## الإعداد (مرة واحدة)
1. **المخطط:** نفّذ في Supabase SQL Editor بالترتيب: `nexora_phase1_schema.sql` ثم `supabase/phase3_migration.sql` (آمن لإعادة التشغيل).
2. **Authentication → URL Configuration:** اجعل *Site URL* رابط Vercel (مثل `https://nexora-school.vercel.app`) وأضف الرابط نفسه + `http://localhost:3000` في *Redirect URLs*.
3. **Authentication → Providers → Email:** إن فعّلت *Confirm email* فسيؤكد المستخدم بريده قبل أول دخول (مدعوم).
4. **متغيرات البيئة** (Vercel: Settings ← Environment Variables، ومحليًا في `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (المفتاح العام فقط)
   - `SUPABASE_SERVICE_ROLE_KEY` — **اختياري وسري**: للخادم فقط، يفعّل زر «مستخدمة جديدة». لا تضعه في أي ملف يُرفع إلى GitHub.

## التشغيل المحلي (Mac)
```bash
node -v            # يُفضّل 20 أو أحدث
npm install
cp .env.example .env.local   # ثم عبّئ القيم
npm run dev                  # http://localhost:3000
```

## مسار الاستخدام
1. **إنشاء حساب** ← **إنشاء مدرسة جديدة** (تصبح المسجِّلة مديرة المدرسة بمساحة بيانات مستقلة).
2. من صفحة **المستخدمون** تحصل المديرة على **رمز انضمام** تعطيه للموظفات (ينضممن بدور عضوة)، أو تنشئ حساباتهن مباشرة (يتطلب `SUPABASE_SERVICE_ROLE_KEY`).
3. إنشاء المجالات والمعايير والمؤشرات يدويًا أو **استيراد Excel** من صفحة المؤشرات.

## رفع التحديثات إلى GitHub
```bash
git add .
git commit -m "Phase 3: Supabase Auth, Database, Storage"
git push
```

## الأمان
- العزل بين المدارس وصلاحيات الأدوار تفرضها **RLS وTriggers في قاعدة البيانات**، لا الواجهة. العضوة لا تستطيع تغيير غير حالة مؤشراتها/مهامها حتى لو تجاوزت الواجهة.
- ملفات الشواهد في Bucket خاص `evidence` (المسار `school_id/indicator_id/…`) وتُعرض برابط مؤقت (دقيقتان).
- مفتاح `service_role` يُقرأ في `app/api/users/route.ts` على الخادم فقط، بعد التحقق أن الطالبة مديرة مدرسة فعّالة.

## ملاحظات قبل الإنتاج التجاري
- حزمة `xlsx` (0.18.5) عليها تنبيهات أمنية عند قراءة ملفات غير موثوقة ولا يوجد إصدار مصحَّح على npm؛ يُنقل الاستيراد إلى الخادم أو تُستبدل الحزمة.
- `npm audit` يُظهر تنبيهات على Next.js 14؛ يُرقّى لإصدار مدعوم.
- استيراد Excel الكبير يُدرج على دفعات (500 صف) وليس في معاملة واحدة؛ عند فشل منتصف العملية تُعاد قراءة البيانات من الخادم.
- لم تُضف بعد: استعادة كلمة المرور، لوحة مدير النظام لإدارة المدارس، قالب جاهز للمجالات.
