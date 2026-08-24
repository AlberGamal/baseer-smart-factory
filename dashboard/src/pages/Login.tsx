import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Copy, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../lib/api';
import { Logo } from '../components/Logo';

type Mode = 'login' | 'register';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // registration
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('النسيج');
  const [telegram, setTelegram] = useState('');
  const [created, setCreated] = useState<{ employee_code: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await login(username, password);
      nav(res.role === 'manager' ? '/' : '/me');
    } catch {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally { setLoading(false); }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await apiPost<{ employee_code: string; password: string }>('/auth/register', {
        full_name: fullName, department, telegram_chat_id: telegram || null,
      });
      setCreated(res);
    } catch {
      setError('تعذّر إنشاء الحساب، حاول مجدداً');
    } finally { setLoading(false); }
  }

  function copyCreds() {
    if (!created) return;
    navigator.clipboard.writeText(`ID: ${created.employee_code} | Password: ${created.password}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-indigo-700 bg-weave p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={64} withText={false} />
          <div className="text-center">
            <h1 className="font-display text-3xl font-extrabold text-indigo-700">بصير</h1>
            <p className="text-sm text-indigo-500">منصة إدارة مصنع الأقمشة الذكية</p>
          </div>
        </div>

        {/* Success card after registration */}
        {created ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5 text-center">
              <CheckCheck className="mx-auto mb-2 h-10 w-10 text-green-600" />
              <p className="font-bold text-green-800">تم إنشاء الحساب بنجاح</p>
              <p className="mt-1 text-sm text-green-700">احفظ بياناتك — لن تظهر كلمة المرور مرة أخرى</p>
              <div className="mt-4 space-y-2 text-right">
                <div className="rounded-lg bg-white p-3">
                  <span className="text-xs text-indigo-400">رقم الموظف (ID)</span>
                  <p className="font-mono text-lg font-bold text-indigo-800">{created.employee_code}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <span className="text-xs text-indigo-400">كلمة المرور</span>
                  <p className="font-mono text-lg font-bold text-indigo-800">{created.password}</p>
                </div>
              </div>
              <button onClick={copyCreds} className="btn-primary mt-4 w-full justify-center">
                {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'تم النسخ' : 'نسخ البيانات'}
              </button>
            </div>
            <button
              onClick={() => { setCreated(null); setMode('login'); setUsername(created.employee_code); setPassword(''); }}
              className="btn-gold w-full justify-center"
            >
              المتابعة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="mb-5 flex rounded-xl bg-sand p-1">
              {([['login', 'تسجيل الدخول'], ['register', 'حساب جديد']] as const).map(([m, l]) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'text-indigo-600'}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {mode === 'login' ? (
              <form onSubmit={submitLogin} className="space-y-4">
                <Field label="اسم المستخدم / رقم الموظف">
                  <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
                </Field>
                <Field label="كلمة المرور">
                  <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                {error && <p className="rounded-lg bg-red-50 p-2 text-center text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 text-base font-bold">
                  <LogIn className="h-5 w-5" />
                  {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
                </button>
              </form>
            ) : (
              <form onSubmit={submitRegister} className="space-y-4">
                <Field label="الاسم الكامل">
                  <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </Field>
                <Field label="القسم">
                  <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                    {['النسيج', 'الغزل', 'الصباغة', 'التعبئة', 'الجودة', 'الصيانة'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </Field>
                <Field label="معرّف تليجرام (اختياري)">
                  <input className="input" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="chat id" />
                </Field>
                <p className="rounded-lg bg-indigo-50 p-2 text-center text-xs text-indigo-500">
                  ينشئ هذا النموذج حساب الموظف فقط. التقاط بصمة الوجه غير مفعّل في هذه النسخة.
                </p>
                {error && <p className="rounded-lg bg-red-50 p-2 text-center text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 text-base font-bold">
                  <UserPlus className="h-5 w-5" />
                  {loading ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
                </button>
              </form>
            )}

            <div className="mt-6 rounded-xl bg-sand/60 p-3 text-center text-xs text-indigo-600">
              بيانات الدخول الأولية تُضبط بأمان عبر ملف البيئة قبل تشغيل النظام.
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-indigo-700">{label}</label>
      {children}
    </div>
  );
}
