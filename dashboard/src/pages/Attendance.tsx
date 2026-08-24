import { Users, UserCheck, UserX, Clock, Download } from 'lucide-react';
import { useAttendanceSummary, useAttendanceRecords, useAttendanceTrend } from '../hooks/useApi';
import { KPICard } from '../components/KPICard';
import { LineChart, CHART_COLORS } from '../components/Charts';
import { PageLoading } from '../components/Skeleton';
import { ATTENDANCE_STATUS_AR, ATTENDANCE_STATUS_COLOR, fmtTime } from '../lib/labels';
import { reportUrl } from '../lib/api';

export function Attendance() {
  const { data: summary } = useAttendanceSummary();
  const { data: records, isLoading } = useAttendanceRecords();
  const { data: trend } = useAttendanceTrend();

  if (!summary || isLoading || !records) return <PageLoading />;

  const s = summary.by_status || {};
  const present = (s.present || 0) + (s.late || 0) + (s.overtime || 0) + (s.early_leave || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard label="حاضرون" value={present} icon={UserCheck} color="green" />
        <KPICard label="غائبون" value={s.absent || 0} icon={UserX} color="red" />
        <KPICard label="متأخرون" value={s.late || 0} icon={Clock} color="amber" />
        <KPICard label="ساعات إضافية اليوم" value={summary.total_overtime_hours} icon={Users} color="indigo" />
      </div>

      <div className="card">
        <h3 className="card-title mb-4">اتجاه الحضور (١٤ يوم)</h3>
        {trend && (
          <LineChart
            labels={trend.trend.map((t: any) => t.day.slice(5))}
            datasets={[
              { label: 'حاضر', data: trend.trend.map((t: any) => Number(t.present)), color: CHART_COLORS.GREEN },
              { label: 'غائب', data: trend.trend.map((t: any) => Number(t.absent)), color: CHART_COLORS.RED },
              { label: 'متأخر', data: trend.trend.map((t: any) => Number(t.late)), color: CHART_COLORS.GOLD },
            ]}
          />
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="card-title">سجل حضور اليوم</h3>
          <a href={reportUrl(`/reports/attendance`)} className="btn-gold text-sm">
            <Download className="h-4 w-4" /> تصدير Excel
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="text-indigo-500">
              <tr className="border-b border-sand dark:border-indigo-700">
                <th className="p-2">الموظف</th><th className="p-2">القسم</th><th className="p-2">الحضور</th>
                <th className="p-2">الانصراف</th><th className="p-2">ساعات</th><th className="p-2">إضافي</th><th className="p-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {records.items.map((r) => (
                <tr key={r.id} className="border-b border-sand/50 hover:bg-sand/30 dark:border-indigo-700/50 dark:hover:bg-indigo-700/30">
                  <td className="p-2 font-medium">{r.full_name}</td>
                  <td className="p-2 text-indigo-500">{r.department}</td>
                  <td className="p-2">{fmtTime(r.check_in)}</td>
                  <td className="p-2">{fmtTime(r.check_out)}</td>
                  <td className="p-2">{Number(r.worked_hours).toFixed(1)}</td>
                  <td className="p-2 text-gold-dark">{Number(r.overtime_hours) > 0 ? Number(r.overtime_hours).toFixed(1) : '—'}</td>
                  <td className="p-2">
                    <span className={`badge ${ATTENDANCE_STATUS_COLOR[r.status] || ''}`}>{ATTENDANCE_STATUS_AR[r.status] || r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
