import { ScanLine, Users, ShieldCheck, Flame, Database, Wifi, WifiOff } from 'lucide-react';
import { useSystemHealth } from '../hooks/useApi';
import { PageLoading } from '../components/Skeleton';
import { fmtDate } from '../lib/labels';

const MODULES: Record<string, { label: string; icon: any }> = {
  defect: { label: 'موديل كشف العيوب', icon: ScanLine },
  attendance: { label: 'موديل الحضور (الوجه)', icon: Users },
  safety: { label: 'موديل معدات السلامة', icon: ShieldCheck },
  fire: { label: 'موديل الحرائق والدخان', icon: Flame },
};

export function SystemHealth() {
  const { data, isLoading } = useSystemHealth();
  if (isLoading || !data) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-3">
        <Database className="h-7 w-7 text-indigo-600" />
        <div>
          <p className="font-bold text-indigo-800 dark:text-sand">قاعدة البيانات</p>
          <p className="text-sm text-green-600">متصلة · {data.database}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Object.entries(data.modules).map(([key, m]: any) => {
          const meta = MODULES[key];
          const online = m.online;
          return (
            <div key={key} className={`card border-r-4 ${online ? 'border-r-green-500' : 'border-r-red-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${online ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <meta.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-indigo-800 dark:text-sand">{meta.label}</p>
                    <p className="text-xs text-indigo-400">آخر معالجة: {fmtDate(m.last_seen)}</p>
                  </div>
                </div>
                <span className={`badge ${online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {online ? 'متصل' : 'غير متصل'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
