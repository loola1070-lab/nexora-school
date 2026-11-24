# NEXORA School — المرحلة 2 (الواجهات)

نظام إدارة التقييم والشواهد المدرسية. Next.js 14 + TypeScript + Tailwind + واجهة عربية RTL.

> **حالة البيانات:** هذه النسخة تجريبية. البيانات تُحفظ في `localStorage` داخل متصفحك فقط، وليست في قاعدة بيانات.
> الدخول تجريبي أيضًا. الملفات المرفوعة تبقى في ذاكرة الصفحة وتختفي عند إعادة التحميل.
> ربط Supabase (Auth + Database + Storage + RLS) هو المرحلة 3.

## التشغيل على Mac
1. ثبّت Node.js (الإصدار 18.17 أو أحدث، يُفضّل LTS) من https://nodejs.org أو: `brew install node`
2. افتح Terminal وتأكد: `node -v` و `npm -v`
3. ادخل مجلد المشروع: `cd ~/Downloads/nexora-school` (حسب مكان فك الضغط)
4. `npm install`
5. `npm run dev`
6. افتح http://localhost:3000

## حسابات الدخول التجريبية (كلمة المرور: demo1234)
| الدور | البريد |
|---|---|
| مديرة المدرسة | admin@demo.nexora.test |
| مشرفة | supervisor@demo.nexora.test |
| عضوة | member@demo.nexora.test |
| مدير النظام | sysadmin@demo.nexora.test |

## أوامر مفيدة
- `npm run typecheck` فحص TypeScript
- `npm run build` بناء نسخة الإنتاج
- `npm run lint` فحص الكود

## رفع المشروع إلى GitHub (مستودع nexora-school)
```bash
cd nexora-school
git init
git add .
git commit -m "Phase 2: NEXORA School frontend"
git branch -M main
git remote add origin https://github.com/<اسم-حسابك>/nexora-school.git
git push -u origin main
```
- إن طلب GitHub كلمة مرور فاستخدم **Personal Access Token** (Settings ← Developer settings ← Tokens) أو ثبّت GitHub CLI ونفّذ `gh auth login`.
- تأكد أن `.env.local` غير مرفوع (مستثنى في `.gitignore`). لا ترفع أي مفاتيح سرية أبدًا.
- إن كان المستودع يحتوي ملف README أنشأه GitHub: نفّذ `git pull origin main --allow-unrelated-histories` قبل `git push`.

## هيكل المشروع
- `app/` الصفحات (login + مجموعة `(app)` للصفحات المحمية)
- `components/` مكونات الواجهة (`ui.tsx`, `AppShell.tsx`, نوافذ الشواهد والاستيراد)
- `lib/repository.ts` **طبقة الوصول للبيانات** — تُستبدل بـ Supabase في المرحلة 3
- `lib/store.tsx` حالة التطبيق والصلاحيات والتنبيهات
- `lib/excel.ts` استيراد/تصدير Excel
- `lib/seed.ts` البيانات التجريبية (DEMO)

## ملاحظات أمنية قبل الإنتاج
- حزمة `xlsx` (0.18.5) عليها تنبيهات أمنية معروفة عند قراءة ملفات غير موثوقة، ولا يوجد إصدار مصحَّح على npm. سيُنقل الاستيراد إلى الخادم أو تُستبدل الحزمة في المرحلة 3.
- `npm audit` يُظهر تنبيهات على Next.js 14؛ يُرقّى إلى إصدار مدعوم قبل النشر التجاري.
