import { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon } from 'lucide-react';
import { useSafetySummary, useSafetyLogs } from '../hooks/useApi';
import { KPICard } from '../components/KPICard';
import { BarChart, CHART_COLORS } from '../components/Charts';
import { PageLoading } from '../components/Skeleton';
import { PPE_AR, fmtDate } from '../lib/labels';

export function Safety() {
  const [page, setPage] = useState(1);
  const { data: summary } = useSafetySummary();
  const { data: logs, isLoading } = useSafetyLogs(page);
  if (!summary || isLoading || !logs) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard label="نسبة الالتزام" value={summary.compliance_percent} suffix="%" icon={ShieldCheck} color="green" />
        <KPICard label="حالات مخالفة" value={summary.total_logs - summary.compliant} icon={ShieldAlert} color="red" />
        <KPICard label="إنذارات سلامة نشطة" value={summary.active_strikes.length} icon={AlertOctagon} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="card-title mb-4">أكثر المعدات المفقودة</h3>
          <BarChart
            labels={summary.by_missing_tool.map((t: any) => PPE_AR[t.tool] || t.tool)}
            data={summary.by_missing_tool.map((t: any) => Number(t.count))}
            color={CHART_COLORS.TERRA}
            label="مرات"
          />
        </div>
        <div className="card">
          <h3 className="card-title mb-1">إنذارات السلامة</h3>
          <p className="mb-3 text-xs text-indigo-500">
            عدد مرات رصد كل موظف بدون أداة معيّنة. عند الوصول إلى ٣ يُطبَّق خصم تلقائي.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {summary.active_strikes.map((st: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-amber-50 p-3 dark:bg-indigo-700/40">
                <div>
                  <p className="font-medium text-indigo-800 dark:text-sand">{st.full_name}</p>
                  <p className="text-xs text-indigo-500">بدون: {PPE_AR[st.tool] || st.tool}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-terracotta">إنذار {st.strikes}/3</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={`h-2.5 w-2.5 rounded-full ${n <= st.strikes ? 'bg-terracotta' : 'bg-sand'}`} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {summary.active_strikes.length === 0 && <p className="text-center text-indigo-400">لا توجد إنذارات نشطة</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title mb-4">سجل كشف المعدات</h3>
        <div className="space-y-2">
          {logs.items.map((log) => (
            <div key={log.id} className="rounded-xl border border-sand p-3 dark:border-indigo-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-indigo-800 dark:text-sand">{log.full_name}</span>
                <div className="flex items-center gap-2">
                  <span className={`badge ${log.compliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {log.compliant ? 'ملتزم' : 'مخالف'}
                  </span>
                  <span className="text-xs text-indigo-400">{fmtDate(log.captured_at)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(log.items).map(([tool, worn]) => (
                  <span key={tool} className={`badge ${worn ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600 line-through'}`}>
                    {PPE_AR[tool] || tool}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-indigo-500">الإجمالي: {logs.total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-primary disabled:opacity-40">السابق</button>
            <span className="px-2 py-2">صفحة {page}</span>
            <button disabled={page * 20 >= logs.total} onClick={() => setPage((p) => p + 1)} className="btn-primary disabled:opacity-40">التالي</button>
          </div>
        </div>
      </div>
    </div>
  );
}
