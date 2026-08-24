import { useNavigate } from 'react-router-dom';
import { Download, Wallet } from 'lucide-react';
import { useEmployees } from '../hooks/useApi';
import { useQueries } from '@tanstack/react-query';
import { apiGet, reportUrl } from '../lib/api';
import type { SalaryBreakdown } from '../types';
import { PageLoading } from '../components/Skeleton';
import { egp } from '../lib/labels';

export function Payroll() {
  const { data, isLoading } = useEmployees();
  const nav = useNavigate();

  const salaries = useQueries({
    queries: (data?.items || []).map((e) => ({
      queryKey: ['salary', e.id],
      queryFn: () => apiGet<SalaryBreakdown>(`/employees/${e.id}/salary`),
      enabled: !!data,
    })),
  });

  if (isLoading || !data) return <PageLoading />;
  const total = salaries.reduce((sum, s) => sum + (s.data?.net_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="card flex items-center gap-3">
          <Wallet className="h-7 w-7 text-gold-dark" />
          <div>
            <p className="text-sm text-indigo-500">إجمالي الرواتب المستحقة هذا الشهر</p>
            <p className="font-display text-2xl font-extrabold text-indigo-800 dark:text-sand">{egp(total)}</p>
          </div>
        </div>
        <a href={reportUrl('/reports/payroll')} className="btn-gold">
          <Download className="h-4 w-4" /> تصدير كشف الرواتب (Excel)
        </a>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="text-indigo-500">
              <tr className="border-b border-sand dark:border-indigo-700">
                <th className="p-2">الموظف</th><th className="p-2">القسم</th><th className="p-2">عادية</th>
                <th className="p-2">إضافية</th><th className="p-2">خصومات</th><th className="p-2">مكافآت</th><th className="p-2">الصافي</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((e, i) => {
                const s = salaries[i]?.data;
                return (
                  <tr
                    key={e.id}
                    onClick={() => nav(`/employees/${e.id}`)}
                    className="cursor-pointer border-b border-sand/50 hover:bg-sand/30 dark:border-indigo-700/50 dark:hover:bg-indigo-700/30"
                  >
                    <td className="p-2 font-medium">{e.full_name}</td>
                    <td className="p-2 text-indigo-500">{e.department}</td>
                    <td className="p-2">{s ? s.base_pay : '…'}</td>
                    <td className="p-2 text-gold-dark">{s ? s.overtime_pay : '…'}</td>
                    <td className="p-2 text-red-600">{s ? s.deductions : '…'}</td>
                    <td className="p-2 text-green-600">{s ? s.bonuses : '…'}</td>
                    <td className="p-2 font-bold text-indigo-800 dark:text-sand">{s ? egp(s.net_salary) : '…'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
