import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserCircle, CalendarCheck, CalendarX, Clock, AlertTriangle, ShieldCheck, Plus } from 'lucide-react';
import { useEmployeeCard } from '../hooks/useApi';
import { apiPost } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { PageLoading } from '../components/Skeleton';
import { egp, fmtDate } from '../lib/labels';
import { SalaryCard } from '../components/SalaryCard';

export function EmployeeProfile() {
  const { id } = useParams();
  const empId = Number(id);
  const { data, isLoading } = useEmployeeCard(empId);
  const qc = useQueryClient();
  const [form, setForm] = useState({ kind: 'deduction', amount: '', reason: '' });

  if (isLoading || !data) return <PageLoading />;
  const e = data.employee;

  async function addAdjustment() {
    if (!form.amount) return;
    await apiPost(`/employees/${empId}/adjustments`, {
      kind: form.kind, amount: Number(form.amount), reason: form.reason,
    });
    setForm({ kind: 'deduction', amount: '', reason: '' });
    qc.invalidateQueries({ queryKey: ['employee', empId] });
  }

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-600 dark:bg-indigo-700 dark:text-gold">
          <UserCircle className="h-14 w-14" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-extrabold text-indigo-800 dark:text-sand">{e.full_name}</h2>
          <p className="text-indigo-500">{e.department} · {e.employee_code}</p>
          <p className="text-xs text-indigo-400">تاريخ التعيين: {e.hire_date}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat icon={CalendarCheck} color="green" label="أيام حضور" value={data.present_days} />
        <Stat icon={CalendarX} color="red" label="أيام غياب" value={data.absent_days} />
        <Stat icon={Clock} color="amber" label="أيام تأخير" value={data.late_days} />
        <Stat icon={Clock} color="indigo" label="ساعات إضافية" value={data.overtime_hours} />
        <Stat icon={AlertTriangle} color="terra" label="إنذارات" value={data.warnings_count} />
        <Stat icon={ShieldCheck} color="gold" label="التزام سلامة" value={`${data.safety_compliance_percent}%`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SalaryCard salary={data.salary} />

        <div className="card">
          <h3 className="card-title mb-4">تعديلات الراتب (خصم / مكافأة)</h3>
          <div className="mb-4 space-y-2">
            <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="deduction">خصم</option>
              <option value="bonus">مكافأة</option>
            </select>
            <input className="input" type="number" placeholder="المبلغ (ج.م)" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input className="input" placeholder="السبب" value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <button onClick={addAdjustment} className="btn-gold w-full justify-center">
              <Plus className="h-4 w-4" /> إضافة
            </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {data.adjustments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-sand/50 p-2 text-sm dark:bg-indigo-700/40">
                <span className={a.kind === 'deduction' ? 'text-red-600' : 'text-green-600'}>
                  {a.kind === 'deduction' ? '− خصم' : '+ مكافأة'} · {a.reason}
                </span>
                <span className="font-bold">{egp(a.amount)}</span>
              </div>
            ))}
            {data.adjustments.length === 0 && <p className="text-center text-sm text-indigo-400">لا توجد تعديلات</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    green: 'text-green-600', red: 'text-red-600', amber: 'text-amber-600',
    indigo: 'text-indigo-600', terra: 'text-terracotta', gold: 'text-gold-dark',
  };
  return (
    <div className="card items-center text-center">
      <Icon className={`mx-auto h-6 w-6 ${colors[color]}`} />
      <p className="mt-1 text-xl font-bold text-indigo-800 dark:text-sand">{value}</p>
      <p className="text-xs text-indigo-500">{label}</p>
    </div>
  );
}
