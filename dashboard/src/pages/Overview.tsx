import { ScanLine, AlertTriangle, Users, ShieldCheck, Flame, Bell } from 'lucide-react';
import { useOverview } from '../hooks/useApi';
import { KPICard } from '../components/KPICard';
import { LineChart, DoughnutChart, CHART_COLORS } from '../components/Charts';
import { PageLoading } from '../components/Skeleton';

export function Overview() {
  const { data, isLoading } = useOverview();
  if (isLoading || !data) return <PageLoading />;

  const trendLabels = data.defect_trend.map((d) => d.day.slice(5));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard label="قطع مفحوصة" value={data.fabric.total_inspected} icon={ScanLine} color="indigo" />
        <KPICard label="قطع معيبة" value={data.fabric.total_defects} icon={AlertTriangle} color="red" />
        <KPICard label="نسبة العيوب" value={data.fabric.defect_rate} suffix="%" icon={AlertTriangle} color="amber" />
        <KPICard label="حاضرون اليوم" value={data.attendance.present} icon={Users} color="green" />
        <KPICard label="التزام السلامة" value={data.safety.compliance_percent} suffix="%" icon={ShieldCheck} color="gold" />
        <KPICard label="إنذارات حريق" value={data.fire.active_alerts} icon={Flame} color="terracotta" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="card-title mb-4">اتجاه الفحص (آخر ٧ أيام)</h3>
          <LineChart
            labels={trendLabels}
            datasets={[
              { label: 'سليمة', data: data.defect_trend.map((d) => d.normal), color: CHART_COLORS.GREEN },
              { label: 'معيبة', data: data.defect_trend.map((d) => d.defects), color: CHART_COLORS.RED },
            ]}
          />
        </div>
        <div className="card">
          <h3 className="card-title mb-4">توزيع الجودة</h3>
          <DoughnutChart
            labels={['سليمة', 'معيبة']}
            data={[data.fabric.total_normal, data.fabric.total_defects]}
            colors={[CHART_COLORS.GREEN, CHART_COLORS.RED]}
          />
          <div className="mt-4 flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-700 dark:text-sand">{data.attendance.employees}</p>
              <p className="text-xs text-indigo-500">إجمالي الموظفين</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-2xl font-bold text-terracotta">
                <Bell className="h-5 w-5" />{data.alerts.open}
              </p>
              <p className="text-xs text-indigo-500">تنبيهات مفتوحة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
