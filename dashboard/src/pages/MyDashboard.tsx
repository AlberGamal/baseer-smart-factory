import { CalendarCheck, CalendarX, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useMyDashboard } from '../hooks/useApi';
import { PageLoading } from '../components/Skeleton';
import { SalaryCard } from '../components/SalaryCard';
import { KPICard } from '../components/KPICard';

export function MyDashboard() {
  const { data, isLoading } = useMyDashboard();
  if (isLoading || !data) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="card bg-weave">
        <h2 className="font-display text-2xl font-extrabold text-indigo-800 dark:text-sand">
          أهلاً، {data.employee.full_name} 👋
        </h2>
        <p className="text-indigo-500">{data.employee.department} · {data.employee.employee_code}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KPICard label="أيام حضور" value={data.present_days} icon={CalendarCheck} color="green" />
        <KPICard label="أيام غياب" value={data.absent_days} icon={CalendarX} color="red" />
        <KPICard label="ساعات إضافية" value={data.overtime_hours} icon={Clock} color="indigo" />
        <KPICard label="إنذارات" value={data.warnings_count} icon={AlertTriangle} color="terracotta" />
        <KPICard label="التزام السلامة" value={data.safety_compliance_percent} suffix="%" icon={ShieldCheck} color="gold" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SalaryCard salary={data.salary} />
        <div className="card">
          <h3 className="card-title mb-4">تفاصيل التعديلات</h3>
          <div className="space-y-1.5">
            {data.adjustments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-sand/50 p-2 text-sm dark:bg-indigo-700/40">
                <span className={a.kind === 'deduction' ? 'text-red-600' : 'text-green-600'}>
                  {a.kind === 'deduction' ? '− خصم' : '+ مكافأة'} · {a.reason}
                </span>
                <span className="font-bold">{a.amount} ج.م</span>
              </div>
            ))}
            {data.adjustments.length === 0 && <p className="text-center text-sm text-indigo-400">لا توجد تعديلات هذا الشهر</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
