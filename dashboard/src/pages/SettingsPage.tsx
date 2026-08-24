import { useState, useEffect } from 'react';
import { Save, Clock, Coins } from 'lucide-react';
import { useSettings } from '../hooks/useApi';
import { apiPut } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { PageLoading } from '../components/Skeleton';
import type { AppSettings } from '../types';

export function SettingsPage() {
  const { data, isLoading } = useSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);
  if (isLoading || !form) return <PageLoading />;

  async function save() {
    await apiPut('/settings', form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    qc.invalidateQueries({ queryKey: ['settings'] });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card">
        <h3 className="card-title mb-4 flex items-center gap-2"><Clock className="h-5 w-5" /> مواعيد الدوام</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="بداية الدوام">
            <input type="time" className="input" value={form.work_start.slice(0, 5)}
              onChange={(e) => setForm({ ...form, work_start: e.target.value })} />
          </Field>
          <Field label="نهاية الدوام">
            <input type="time" className="input" value={form.work_end.slice(0, 5)}
              onChange={(e) => setForm({ ...form, work_end: e.target.value })} />
          </Field>
          <Field label="فترة السماح (دقيقة)">
            <input type="number" className="input" value={form.grace_minutes}
              onChange={(e) => setForm({ ...form, grace_minutes: Number(e.target.value) })} />
          </Field>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title mb-4 flex items-center gap-2"><Coins className="h-5 w-5" /> أسعار الساعة (ج.م)</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الساعة العادية">
            <input type="number" className="input" value={form.normal_rate}
              onChange={(e) => setForm({ ...form, normal_rate: Number(e.target.value) })} />
          </Field>
          <Field label="الساعة الإضافية (Overtime)">
            <input type="number" className="input" value={form.overtime_rate}
              onChange={(e) => setForm({ ...form, overtime_rate: Number(e.target.value) })} />
          </Field>
        </div>
      </div>

      <button onClick={save} className="btn-gold">
        <Save className="h-4 w-4" /> {saved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-indigo-700 dark:text-sand">{label}</label>
      {children}
    </div>
  );
}
